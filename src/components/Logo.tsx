import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, iconOnly = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative w-10 h-10 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/2933/2933116.png" 
            alt="LogiCash Logo" 
            className="w-7 h-7 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
      {!iconOnly && (
        <span className="text-xl font-bold tracking-tighter text-white font-mono">
          LogiCash
        </span>
      )}
    </div>
  );
};
