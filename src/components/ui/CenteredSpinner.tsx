import { memo } from 'react';

interface CenteredSpinnerProps {
  label?: string;
  className?: string;
}

export const CenteredSpinner = memo(function CenteredSpinner({
  label = 'Loading...',
  className = 'flex flex-1 items-center justify-center text-muted-foreground',
}: CenteredSpinnerProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {label}
      </div>
    </div>
  );
});
