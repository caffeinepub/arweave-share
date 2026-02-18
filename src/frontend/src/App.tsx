import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from './components/layout/AppLayout';
import UploadPage from './pages/UploadPage';
import MyUploadsPage from './pages/MyUploadsPage';
import SharePage from './pages/SharePage';
import AuthGate from './components/auth/AuthGate';

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <AuthGate>
      <UploadPage />
    </AuthGate>
  ),
});

const myUploadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-uploads',
  component: () => (
    <AuthGate>
      <MyUploadsPage />
    </AuthGate>
  ),
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$id',
  component: SharePage,
});

const routeTree = rootRoute.addChildren([indexRoute, myUploadsRoute, shareRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
