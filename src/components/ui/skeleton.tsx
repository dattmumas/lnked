import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('bg-muted/50 rounded-md animate-pulse', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
