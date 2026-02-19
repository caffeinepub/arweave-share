import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useUploadFile, useShareFile } from '../hooks/useQueries';
import { getShareLink } from '../lib/shareLinks';
import { Upload, FileUp, Loader2, CheckCircle2, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 2000 * 1024; // 2000KB = 2MB
const CHUNK_SIZE = 500 * 1024; // 500KB chunks

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFileMutation = useUploadFile();
  const shareFileMutation = useShareFile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const isImage = selectedFile.type.startsWith('image/');
      const isVideo = selectedFile.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError('Only images and videos are allowed');
        setFile(null);
        return;
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`File size must be less than 2MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setShareId(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setShareId(null);

    try {
      // Read file as bytes
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      
      // Calculate chunks
      const totalChunks = Math.ceil(fileBytes.length / CHUNK_SIZE);
      
      // Upload file metadata and get file ID
      setUploadProgress(5);
      const fileId = await uploadFileMutation.uploadMetadata({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: BigInt(file.size),
        chunkCount: BigInt(totalChunks),
      });

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileBytes.length);
        const chunkData = fileBytes.slice(start, end);

        await uploadFileMutation.uploadChunk({
          id: fileId,
          chunk: {
            id: fileId,
            chunkIndex: BigInt(i),
            data: chunkData,
            size: BigInt(chunkData.length),
            totalChunks: BigInt(totalChunks),
          },
        });

        // Update progress (5% for metadata, 85% for chunks, 10% for finalization)
        const chunkProgress = 5 + ((i + 1) / totalChunks) * 85;
        setUploadProgress(chunkProgress);
      }

      // Finalize upload
      await uploadFileMutation.finalizeUpload(fileId);
      setUploadProgress(95);

      // Share the file to make it accessible
      await shareFileMutation.mutateAsync(fileId);
      setUploadProgress(100);

      setShareId(fileId);
      toast.success('File uploaded successfully!');
      
      // Reset form
      setFile(null);
      setUploadProgress(0);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file. Please try again.');
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyShareLink = () => {
    if (!shareId) return;
    const link = getShareLink(shareId);
    navigator.clipboard.writeText(link);
    toast.success('Share link copied to clipboard');
  };

  const canUpload = file && !uploading;

  return (
    <div className="container mx-auto px-4 py-9 max-w-xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Media</h1>
        <p className="text-base text-muted-foreground mb-3">
          Share your images and videos securely on the Internet Computer
        </p>
        <p className="text-xs text-muted-foreground">
          Share a file with anyone through a link. Those you share with won't need a login.
          To Upload, you must sign in with Internet Identity (IID2)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select an image or video (max 2MB) to upload. Files are stored securely and you can share them with a link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="file-input" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Select Image or Video
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="file-input"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {shareId && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="space-y-3">
                <p className="text-green-600 dark:text-green-400 font-medium">
                  File uploaded successfully!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareLink(shareId)}
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyShareLink}
                    className="gap-2 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can access the file without logging in.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleUpload}
            disabled={!canUpload}
            className="w-full gap-2"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload File
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
