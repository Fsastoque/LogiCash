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
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
