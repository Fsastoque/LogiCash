import { AuthProvider } from './contexts/AuthContext';
import { ProtectedLayout } from './components/ProtectedLayout';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <ProtectedLayout>
        <Dashboard />
      </ProtectedLayout>
      <Toaster 
        theme="dark" 
        position="top-right" 
        richColors 
        toastOptions={{
          className: 'bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-100 font-sans shadow-2xl',
        }}
      />
    </AuthProvider>
  );
}
