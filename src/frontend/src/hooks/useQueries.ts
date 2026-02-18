import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserProfile, FileMetadata, FileChunk } from '../backend';

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
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return {
    uploadMetadata: async ({
      filename,
      contentType,
      size,
      chunkCount,
    }: {
      filename: string;
      contentType: string;
      size: bigint;
      chunkCount: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const fileId = await actor.uploadFileMetadata(filename, contentType, size, chunkCount);
      console.log('Upload metadata created with ID:', fileId);
      return fileId;
    },
    uploadChunk: async ({ id, chunk }: { id: string; chunk: FileChunk }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadChunk(id, chunk);
    },
    finalizeUpload: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.finalizeUpload(id);
      console.log('Upload finalized for ID:', id);
      queryClient.invalidateQueries({ queryKey: ['myUploads'] });
    },
  };
}

export function useGetMyUploads() {
  const { actor, isFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['myUploads'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyUploads();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFileMetadata(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<FileMetadata | null>({
    queryKey: ['fileMetadata', id],
    queryFn: async () => {
      if (!actor) {
        console.error('Actor not available for file ID:', id);
        return null;
      }

      console.log('Fetching metadata for file ID:', id);

      // First, try to get from user's uploads (if authenticated and owner)
      try {
        const uploads = await actor.getMyUploads();
        const file = uploads.find((u) => u.id === id);
        if (file) {
          console.log('Found file in user uploads:', file);
          return file;
        }
      } catch (err) {
        console.log('Not authenticated or not owner, checking if file is shared');
      }

      // Check if file is shared (public access)
      try {
        const isShared = await actor.isFileShared(id);
        console.log('File shared status:', isShared);
        
        if (!isShared) {
          console.error('File is not shared, access denied');
          return null;
        }

        // For shared files, get chunks to reconstruct metadata
        const chunks = await actor.getFileChunks(id);
        console.log('Retrieved chunks for shared file:', chunks.length);
        
        if (chunks.length === 0) {
          console.error('No chunks found for file ID:', id);
          return null;
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

        console.log('Reconstructed metadata:', { id, filename, contentType, size: totalSize });

        return {
          id,
          filename,
          contentType,
          size: totalSize,
          owner: firstChunk.id as any, // Placeholder - not exposed for shared files
          uploaded: BigInt(Date.now()) * BigInt(1_000_000), // Approximate
          downloadCount: BigInt(0), // Will be updated separately
          isShared: true,
        } as FileMetadata;
      } catch (err) {
        console.error('Error fetching shared file metadata:', err);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
    retry: false,
  });
}

export function useGetFileChunks(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<FileChunk[]>({
    queryKey: ['fileChunks', id],
    queryFn: async () => {
      if (!actor) {
        console.error('Actor not available for fetching chunks');
        return [];
      }
      console.log('Fetching chunks for file ID:', id);
      try {
        const chunks = await actor.getFileChunks(id);
        console.log('Successfully fetched chunks:', chunks.length);
        return chunks;
      } catch (err) {
        console.error('Error fetching chunks:', err);
        throw err;
      }
    },
    enabled: !!actor && !isFetching && !!id,
    retry: false,
  });
}

export function useShareFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      console.log('Sharing file with ID:', id);
      await actor.shareFile(id);
      console.log('File shared successfully:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUploads'] });
    },
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteFile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUploads'] });
    },
  });
}

export function useIncrementDownloadCount() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.incrementDownloadCount(id);
    },
  });
}
