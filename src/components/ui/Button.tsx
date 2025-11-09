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
    // Utiliser les classes Bootstrap natives
    let bootstrapClass = 'btn';

    if (variant === 'default') bootstrapClass += ' btn-primary';
    else if (variant === 'destructive') bootstrapClass += ' btn-outline-danger';
    else if (variant === 'outline') bootstrapClass += ' btn-outline-secondary';
    else if (variant === 'secondary') bootstrapClass += ' btn-outline-secondary';
    else if (variant === 'ghost') bootstrapClass += ' btn-ghost';
    else if (variant === 'link') bootstrapClass += ' btn-link';

    if (size === 'sm') bootstrapClass += ' btn-sm';
    else if (size === 'lg') bootstrapClass += ' btn-lg';
    else if (size === 'icon') bootstrapClass += ' btn-sm p-2';

    return (
      <button
        className={cn(bootstrapClass, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
