import { Outlet, useNavigate } from '@tanstack/react-router';
import { Upload, List } from 'lucide-react';
import LoginButton from '../auth/LoginButton';
import ProfileSetupModal from '../auth/ProfileSetupModal';
import { Button } from '@/components/ui/button';

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileSetupModal />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button
                onClick={() => navigate({ to: '/' })}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
                  <img 
                    src="/assets/lookyloo-logo.png" 
                    alt="LookyLoo Logo" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-2xl font-bold tracking-tight">
                  LookyLoo
                </span>
              </button>
              
              <nav className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: '/' })}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: '/my-uploads' })}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  My Uploads
                </Button>
              </nav>
            </div>

            <LoginButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
            <a 
              href="https://geekdice_infinitely.ar.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center">
                <img 
                  src="/assets/GeekGoat-1.png" 
                  alt="GeekGoat" 
                  className="h-full w-full object-cover"
                />
              </div>
            </a>
            <span>Follow me on</span>
            <a 
              href="https://x.com/WillGeek4Food" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src="/assets/logo-white.png" 
                alt="X (Twitter)" 
                className="h-6 w-auto"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
