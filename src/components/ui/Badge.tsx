import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  let badgeClass = 'badge';

  if (variant === 'default') badgeClass += ' bg-primary';
  else if (variant === 'secondary') badgeClass += ' bg-secondary';
  else if (variant === 'destructive') badgeClass += ' bg-danger';
  else if (variant === 'success') badgeClass += ' bg-success';
  else if (variant === 'outline') badgeClass += ' bg-secondary';

  return (
    <span
      className={cn(badgeClass, className)}
      {...props}
    />
  );
}

export { Badge };
