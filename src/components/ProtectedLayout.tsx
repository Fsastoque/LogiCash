import React, { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { motion } from 'motion/react';

const AuthForm = lazy(() => import('./AuthForm').then(m => ({ default: m.AuthForm })));

export const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="flex flex-col items-center gap-8">
          <Logo iconOnly className="scale-150" />
          <div className="space-y-3 text-center">
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">
              Iniciando Protocolos
            </div>
            <div className="flex gap-1 justify-center">
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0s]" />
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">
            Sincronizando...
          </div>
        </div>
      }>
        <AuthForm />
      </Suspense>
    );
  }

  return <>{children}</>;
};
