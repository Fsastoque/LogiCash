import { toast } from 'sonner';
import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Coins } from 'lucide-react';

export const useNotify = () => {
  const success = (title: string, description?: string) => {
    // Custom logic for "Gasto Registrado"
    const isGasto = title.toLowerCase().includes('gasto') || title.toLowerCase().includes('transacción');
    
    toast.success(title, {
      description,
      icon: isGasto ? <Coins className="w-5 h-5 text-emerald-400 animate-bounce" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      className: 'border-l-4 border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    });
  };

  const error = (title: string, errorObj?: any) => {
    let message = title;
    let desc = errorObj?.message || '';

    // Supabase or application error cleaning
    if (errorObj?.code) {
      if (errorObj.code === '23505') {
        desc = 'Este registro ya existe en el sistema.';
      } else if (errorObj.code === '42P01') {
        desc = 'Error de conexión con la tabla de datos.';
      } else if (
        errorObj.code === 'invalid_credentials' ||
        errorObj.message?.toLowerCase().includes('credentials') ||
        errorObj.message?.toLowerCase().includes('credenciales') ||
        errorObj.message?.toLowerCase().includes('invalid grant')
      ) {
        desc = 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.';
      } else if (errorObj.message?.includes('JWT')) {
        desc = 'Tu sesión ha expirado. Por favor, ingresa de nuevo.';
      } else {
        // If it looks like a standard postgresql database code (e.g., numeric code)
        const isPgCode = /^[a-zA-Z0-9]{5}$/.test(String(errorObj.code)) && !isNaN(Number(errorObj.code[0]));
        if (isPgCode) {
          desc = 'Ocurrió un problema técnico con la base de datos.';
        } else {
          desc = errorObj.message || 'Ocurrió un problema.';
        }
      }
    } else if (
      errorObj?.message?.toLowerCase().includes('credentials') ||
      errorObj?.message?.toLowerCase().includes('credenciales') ||
      errorObj?.message?.toLowerCase().includes('invalid grant')
    ) {
      desc = 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.';
    }

    toast.error(message, {
      description: desc,
      icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
      className: 'animate-shake border-l-4 border-l-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    });
  };

  const warning = (title: string, description?: string) => {
    toast.warning(title, {
      description,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      className: 'border-l-4 border-l-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    });
  };

  return { success, error, warning };
};
