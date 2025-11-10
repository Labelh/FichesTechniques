import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'btn';

    const variants = {
      default: 'btn-primary',
      destructive: 'btn-danger',
      outline: 'btn-secondary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      link: 'btn-ghost underline',
    };

    const sizes = {
      default: '',
      sm: 'px-3 py-2 text-xs',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2 w-10 h-10',
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
