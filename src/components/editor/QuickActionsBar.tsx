'use client';

import {
  Search,
  Settings,
  Eye,
  Share2,
  MoreVertical,
  FileText,
} from 'lucide-react';

import { Button } from '@/components/primitives/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  onSeoClick?: () => void;
  onPreviewClick?: () => void;
  onShareClick?: () => void;
  className?: string;
}

export function QuickActionsBar({
  onSeoClick,
  onPreviewClick,
  onShareClick,
  className,
}: QuickActionsBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-component p-card-sm rounded-lg',
        'bg-surface-elevated-2 backdrop-blur-sm',
        'border border-border-subtle shadow-sm',
        'micro-interaction transition-fast',
        className,
      )}
    >
      {/* SEO Settings with enhanced interaction */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSeoClick}
        leftIcon={<Search className="h-4 w-4" />}
        className="micro-interaction nav-hover"
      >
        <span className="hidden sm:inline">SEO</span>
      </Button>

      {/* Visual separator */}
      <div className="w-px h-6 bg-border-subtle" />

      {/* Preview with enhanced interaction */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviewClick}
        leftIcon={<Eye className="h-4 w-4" />}
        className="micro-interaction nav-hover"
      >
        <span className="hidden sm:inline">Preview</span>
      </Button>

      {/* Share with enhanced interaction */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShareClick}
        leftIcon={<Share2 className="h-4 w-4" />}
        className="micro-interaction nav-hover"
      >
        <span className="hidden sm:inline">Share</span>
      </Button>

      {/* Flexible spacer */}
      <div className="flex-1" />

      {/* More Options with enhanced styling */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 micro-interaction nav-hover"
            leftIcon={<MoreVertical className="h-4 w-4" />}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 bg-surface-elevated-2 border-border-subtle shadow-lg"
        >
          <DropdownMenuItem className="gap-component cursor-pointer micro-interaction nav-hover">
            <FileText className="h-4 w-4" />
            Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-component cursor-pointer micro-interaction nav-hover">
            <Settings className="h-4 w-4" />
            Editor Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border-subtle" />
          <DropdownMenuItem className="text-content-secondary cursor-pointer">
            Keyboard Shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
