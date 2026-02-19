import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { FileMetadata, FileChunk, UserProfile } from '../backend';

const CHUNK_SIZE = 500_000; // 500KB chunks

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile({ name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      if (!actor) {
        throw new Error('Actor not available. Please ensure you are logged in.');
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);

      // Step 1: Upload metadata
      const fileId = await actor.uploadFileMetadata(
        file.name,
        file.type,
        BigInt(file.size),
        BigInt(totalChunks)
      );

      // Step 2: Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, bytes.length);
        const chunkData = bytes.slice(start, end);

        const chunk: FileChunk = {
          id: fileId,
          chunkIndex: BigInt(i),
          data: chunkData,
          size: BigInt(chunkData.length),
          totalChunks: BigInt(totalChunks),
        };

        await actor.uploadChunk(fileId, chunk);

        if (onProgress) {
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          onProgress(progress);
        }
      }

      // Step 3: Finalize upload
      await actor.finalizeUpload(fileId);

      // Step 4: Share the file to make it accessible via link
      await actor.shareFile(fileId);

      return fileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUploads'] });
    },
  });
}

export function useGetMyUploads() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['myUploads'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMyUploads();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetFileMetadata(fileId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata | null>({
    queryKey: ['fileMetadata', fileId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      try {
        // Try to get from user's uploads first (if authenticated and owner)
        const uploads = await actor.getMyUploads();
        const file = uploads.find((u) => u.id === fileId);
        if (file) {
          return file;
        }
      } catch (err) {
        console.log('Not authenticated or not owner, checking if file is shared');
      }

      // Check if file is shared (public access)
      const isShared = await actor.isFileShared(fileId);
      
      if (!isShared) {
        throw new Error('File is not shared or does not exist');
      }

      // For shared files, get chunks to reconstruct metadata
      const chunks = await actor.getFileChunks(fileId);
      
      if (chunks.length === 0) {
        throw new Error('No chunks found for file');
      }

      // Sort chunks to get first chunk
      const sortedChunks = [...chunks].sort((a, b) => Number(a.chunkIndex) - Number(b.chunkIndex));
      const firstChunk = sortedChunks[0];
      
      // Calculate total size from all chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + BigInt(chunk.data.length), BigInt(0));

      // Extract filename from chunk ID (format: "filename_timestamp")
      const filename = firstChunk.id.split('_').slice(0, -1).join('_') || firstChunk.id;

      // Detect content type from chunk data
      let contentType = 'application/octet-stream';
      const firstBytes = new Uint8Array(firstChunk.data.slice(0, 12));
      
      // Check magic bytes for common formats
      if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF) {
        contentType = 'image/jpeg';
      } else if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        contentType = 'image/png';
      } else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) {
        contentType = 'image/gif';
      } else if (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46) {
        contentType = 'image/webp';
      } else if (
        (firstBytes[4] === 0x66 && firstBytes[5] === 0x74 && firstBytes[6] === 0x79 && firstBytes[7] === 0x70) ||
        (firstBytes[0] === 0x00 && firstBytes[1] === 0x00 && firstBytes[2] === 0x00)
      ) {
        contentType = 'video/mp4';
      }

      return {
        id: fileId,
        filename,
        contentType,
        size: totalSize,
        owner: firstChunk.id as any, // Placeholder - not exposed for shared files
        uploaded: BigInt(Date.now()) * BigInt(1_000_000), // Approximate
        downloadCount: BigInt(0), // Will be updated separately
        isShared: true,
      } as FileMetadata;
    },
    enabled: !!actor && !actorFetching && !!fileId,
    retry: 1,
  });
}

export function useGetFileChunks(fileId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileChunk[]>({
    queryKey: ['fileChunks', fileId],
    queryFn: async () => {
      if (!actor) {
        console.error('Actor not available for fetching chunks');
        return [];
      }
      console.log('Fetching chunks for file ID:', fileId);
      try {
        const chunks = await actor.getFileChunks(fileId);
        console.log('Successfully fetched chunks:', chunks.length);
        return chunks;
      } catch (err) {
        console.error('Error fetching chunks:', err);
        throw err;
      }
    },
    enabled: !!actor && !actorFetching && !!fileId,
    retry: false,
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteFile(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUploads'] });
    },
  });
}

export function useIncrementDownloadCount() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.incrementDownloadCount(fileId);
    },
  });
}
