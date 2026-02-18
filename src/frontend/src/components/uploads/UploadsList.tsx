import { FileMetadata } from '../../backend';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Trash2, FileText, Download, Image as ImageIcon, Video } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes } from '../../lib/utils';
import { getShareLink } from '../../lib/shareLinks';
import { useNavigate } from '@tanstack/react-router';

interface UploadsListProps {
  uploads: FileMetadata[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export default function UploadsList({ uploads, onDelete, isDeleting }: UploadsListProps) {
  const navigate = useNavigate();

  const copyShareLink = (id: string) => {
    const link = getShareLink(id);
    navigator.clipboard.writeText(link);
    toast.success('Share link copied to clipboard');
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (uploads.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No uploads yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload your first file to get started
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Upload File</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {uploads.map((upload) => {
        const isImage = upload.contentType.startsWith('image/');
        const isVideo = upload.contentType.startsWith('video/');
        
        return (
          <Card key={upload.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {isImage ? (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      ) : isVideo ? (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{upload.filename}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {upload.contentType}
                        </Badge>
                        <span>{formatBytes(Number(upload.size))}</span>
                        <span>•</span>
                        <span>{formatDate(upload.uploaded)}</span>
                        {Number(upload.downloadCount) > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {upload.downloadCount.toString()} downloads
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyShareLink(upload.id)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/share/$id', params: { id: upload.id } })}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the file and its metadata. The share link will no longer work.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(upload.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
