import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full px-4 py-3 bg-[#1f1f1f] border border-white/10 rounded-lg',
          'text-white text-sm transition-all',
          'focus:outline-none focus:border-[rgb(249,55,5)] focus:ring-2 focus:ring-[rgb(249,55,5)]/20',
          'disabled:bg-[#303030] disabled:text-gray-400 disabled:cursor-not-allowed',
          'placeholder:text-gray-400',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
