'use client';

import React from 'react';
import {
  Search,
  Settings,
  Eye,
  Share2,
  MoreVertical,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        'flex items-center gap-2 p-2 rounded-lg bg-muted/30 backdrop-blur-sm',
        'border border-border/50',
        className,
      )}
    >
      {/* SEO Settings */}
      <Button variant="ghost" size="sm" onClick={onSeoClick} className="gap-2">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">SEO</span>
      </Button>

      {/* Preview */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviewClick}
        className="gap-2"
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">Preview</span>
      </Button>

      {/* Share */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShareClick}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <FileText className="mr-2 h-4 w-4" />
            Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Editor Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-muted-foreground">
            Keyboard Shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
