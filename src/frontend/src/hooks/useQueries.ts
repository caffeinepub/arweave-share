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
      return actor.uploadFileMetadata(filename, contentType, size, chunkCount);
    },
    uploadChunk: async ({ id, chunk }: { id: string; chunk: FileChunk }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadChunk(id, chunk);
    },
    finalizeUpload: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.finalizeUpload(id);
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
      if (!actor) return null;
      const uploads = await actor.getMyUploads();
      const file = uploads.find((u) => u.id === id);
      if (file) return file;
      
      // Check if file is shared (public access)
      const isShared = await actor.isFileShared(id);
      if (!isShared) return null;
      
      // For shared files, we need to get chunks to verify it exists
      try {
        const chunks = await actor.getFileChunks(id);
        if (chunks.length === 0) return null;
        
        // Reconstruct basic metadata from chunks
        const totalSize = chunks.reduce((sum, chunk) => sum + BigInt(chunk.data.length), BigInt(0));
        return {
          id,
          filename: chunks[0].id,
          contentType: 'application/octet-stream',
          size: totalSize,
          owner: chunks[0].id as any, // Placeholder
          uploaded: BigInt(0),
          downloadCount: BigInt(0),
          isShared: true,
        } as FileMetadata;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useGetFileChunks(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<FileChunk[]>({
    queryKey: ['fileChunks', id],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFileChunks(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useShareFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.shareFile(id);
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
