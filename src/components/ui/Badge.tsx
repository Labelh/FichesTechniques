import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#ff6b35]/10 text-[#ff6b35] border border-[#ff6b35]/20',
    secondary: 'bg-gray-800/50 text-gray-300 border border-gray-700/50',
    destructive: 'bg-red-500/10 text-red-400 border border-red-500/20',
    outline: 'bg-transparent text-gray-400 border border-gray-700',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
