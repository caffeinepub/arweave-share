import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import UploadsList from '../components/uploads/UploadsList';
import { useGetMyUploads, useDeleteFile } from '../hooks/useQueries';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MyUploadsPage() {
  const { data: uploads, isLoading, error } = useGetMyUploads();
  const deleteFile = useDeleteFile();

  const handleDelete = async (id: string) => {
    try {
      await deleteFile.mutateAsync(id);
      toast.success('File deleted successfully');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Failed to delete file');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">My Uploads</h1>
        <p className="text-lg text-muted-foreground">
          Manage your uploaded files and share links
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>
            View, share, and delete your uploaded files. Files are stored securely on the Internet Computer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load uploads. Please try again later.
              </AlertDescription>
            </Alert>
          ) : (
            <UploadsList
              uploads={uploads || []}
              onDelete={handleDelete}
              isDeleting={deleteFile.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
