import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useUploadFile } from '../hooks/useQueries';
import { getShareLink } from '../lib/shareLinks';
import { useNavigate } from '@tanstack/react-router';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareLink, setShareLink] = useState<string>('');

  const uploadMutation = useUploadFile();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');
    setShareLink('');
    setUploadProgress(0);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 2MB');
      setSelectedFile(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM) are supported');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError('');
    setShareLink('');
    setUploadProgress(0);

    try {
      const fileId = await uploadMutation.mutateAsync({
        file: selectedFile,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      const link = getShareLink(fileId);
      setShareLink(link);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Reduced by 25% */}
      <div className="bg-gradient-to-b from-primary/10 to-background py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">Upload Media</h1>
          <p className="text-lg text-muted-foreground mb-2">
            Share your images and videos securely on the Internet Computer
          </p>
          <p className="text-sm text-muted-foreground">
            Share a file with anyone through a link. Those you share with won't need a login. To Upload, you must sign in with Internet Identity (IID2)
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Select an image or video (max 2MB) to upload. Files are stored securely and you can share them with a link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Image or Video</label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Choose File
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : 'No file selected'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Success Message with Share Link */}
            {shareLink && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Upload successful!</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                        }}
                      >
                        Copy Link
                      </Button>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate({ to: '/my-uploads' })}
                      className="p-0 h-auto"
                    >
                      View in My Uploads
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
