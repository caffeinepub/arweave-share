import { useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetFileMetadata, useGetFileChunks, useIncrementDownloadCount } from '../hooks/useQueries';
import { formatBytes } from '../lib/utils';
import { Download, FileText, Calendar, HardDrive, AlertCircle, Image as ImageIcon, Video } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SharePage() {
  const { id } = useParams({ from: '/share/$id' });
  const { data: metadata, isLoading, error, isFetched } = useGetFileMetadata(id);
  const { data: chunks, isLoading: chunksLoading, error: chunksError } = useGetFileChunks(id);
  const incrementDownload = useIncrementDownloadCount();
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('SharePage - File ID:', id);
    console.log('SharePage - Metadata:', { metadata, isLoading, error, isFetched });
    console.log('SharePage - Chunks:', { chunks: chunks?.length, chunksLoading, chunksError });
  }, [id, metadata, isLoading, error, isFetched, chunks, chunksLoading, chunksError]);

  // Reassemble file from chunks for preview
  useEffect(() => {
    if (chunks && chunks.length > 0 && metadata) {
      try {
        console.log('Reassembling file from', chunks.length, 'chunks');
        // Sort chunks by index
        const sortedChunks = [...chunks].sort((a, b) => Number(a.chunkIndex) - Number(b.chunkIndex));
        
        // Combine all chunk data
        const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
        const combinedData = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const chunk of sortedChunks) {
          combinedData.set(new Uint8Array(chunk.data), offset);
          offset += chunk.data.length;
        }

        console.log('File reassembled, total size:', totalSize);

        // Create blob URL
        const blob = new Blob([combinedData], { type: metadata.contentType });
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        console.log('Blob URL created:', url);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to reassemble file:', err);
      }
    }
  }, [chunks, metadata]);

  const handleDownload = async () => {
    if (!metadata || !chunks) return;
    
    try {
      await incrementDownload.mutateAsync(id);
      
      // Sort chunks by index
      const sortedChunks = [...chunks].sort((a, b) => Number(a.chunkIndex) - Number(b.chunkIndex));
      
      // Combine all chunk data
      const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
      const combinedData = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const chunk of sortedChunks) {
        combinedData.set(new Uint8Array(chunk.data), offset);
        offset += chunk.data.length;
      }

      // Create download
      const blob = new Blob([combinedData], { type: metadata.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isImage = metadata?.contentType.startsWith('image/');
  const isVideo = metadata?.contentType.startsWith('video/');

  // Show loading state
  if (isLoading || chunksLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Shared File</h1>
          <p className="text-lg text-muted-foreground">
            Securely stored on the Internet Computer
          </p>
        </div>

        <Card>
          <CardContent className="py-12 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if ((error || chunksError) && isFetched) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Shared File</h1>
          <p className="text-lg text-muted-foreground">
            Securely stored on the Internet Computer
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                File not found. The share link may be invalid or the file may have been deleted.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show file not found if no metadata after loading
  if (!metadata && isFetched) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Shared File</h1>
          <p className="text-lg text-muted-foreground">
            Securely stored on the Internet Computer
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                File not found. The share link may be invalid or the file may have been deleted.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Shared File</h1>
        <p className="text-lg text-muted-foreground">
          Securely stored on the Internet Computer
        </p>
      </div>

      <Card>
        {metadata && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {isImage ? (
                  <ImageIcon className="h-8 w-8 text-primary" />
                ) : isVideo ? (
                  <Video className="h-8 w-8 text-primary" />
                ) : (
                  <FileText className="h-8 w-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl break-all">{metadata.filename}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mt-2">
                  {metadata.contentType}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview */}
              {fileUrl && (isImage || isVideo) && (
                <div className="rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                  {isImage ? (
                    <img 
                      src={fileUrl} 
                      alt={metadata.filename}
                      className="max-w-full max-h-96 object-contain"
                    />
                  ) : isVideo ? (
                    <video 
                      src={fileUrl} 
                      controls
                      className="max-w-full max-h-96"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">File Size</p>
                    <p className="font-medium">{formatBytes(Number(metadata.size))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                    <p className="font-medium">{formatDate(metadata.uploaded)}</p>
                  </div>
                </div>
                {Number(metadata.downloadCount) > 0 && (
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Download className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Downloads</p>
                      <p className="font-medium">{metadata.downloadCount.toString()}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleDownload}
                  className="w-full gap-2"
                  size="lg"
                  disabled={incrementDownload.isPending || chunksLoading || !chunks}
                >
                  <Download className="h-5 w-5" />
                  {chunksLoading ? 'Loading...' : 'Download File'}
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  This file is securely stored on the Internet Computer blockchain and will remain accessible
                  as long as the canister is maintained.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
