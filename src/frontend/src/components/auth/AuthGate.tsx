import { ReactNode } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { identity, login, isInitializing, isLoggingIn } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-8 pb-8">
            <div className="mx-auto mb-2 h-36 w-36 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <video 
                src="/assets/LookyLoo-gif.mp4" 
                autoPlay
                loop
                muted
                playsInline
                className="h-24 w-24 object-contain scale-150"
              />
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight">LookyLoo</h1>
            
            <h2 className="text-2xl font-extrabold tracking-tight">
              Frictionless File Share - by GeekDice
            </h2>
            
            <div className="space-y-2 pt-8">
              <p className="text-base">Share a file with anyone through a link. Those you share with won't need a login.</p>
              <p className="text-base">To Upload, you must sign in with Internet Identity (IID2)</p>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center pt-8">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full max-w-sm gap-2"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Sign in or create IID2'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
