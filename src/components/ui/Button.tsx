import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-40';

    const variants = {
      default: 'bg-[#ff6b35] text-white hover:bg-[#f44f1b] shadow-sm hover:shadow-md',
      destructive:
        'bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300',
      outline:
        'bg-transparent text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-gray-100',
      secondary:
        'bg-transparent text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-gray-100',
      ghost: 'bg-transparent text-gray-300 hover:bg-gray-800/50 hover:text-gray-100',
      link: 'text-[#ff6b35] underline-offset-4 hover:underline hover:text-[#f44f1b]',
    };

    const sizes = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-9 px-3 py-1.5 text-sm',
      lg: 'h-11 px-6 py-2.5 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
