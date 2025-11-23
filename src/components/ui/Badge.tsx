import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-primary/10 text-primary border-primary/20',
      success: 'bg-status-success/10 text-status-success border-status-success/20',
      warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
      danger: 'bg-red-500/10 text-red-500 border-red-500/20',
      info: 'bg-status-info/10 text-status-info border-status-info/20',
      secondary: 'bg-text-secondary/10 text-text-secondary border-[#323232]',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold uppercase transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
