'use client';

import { Plus, FileText, Video, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NewPostButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showDropdown?: boolean;
}

export function NewPostButton({
  variant = 'default',
  size = 'default',
  className = '',
  showDropdown = true,
}: NewPostButtonProps): React.ReactElement {
  if (!showDropdown) {
    // Simple button that goes to text post creation
    return (
      <Button variant={variant} size={size} className={className} asChild>
        <Link href="/posts/new">
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/posts/new" className="flex items-center cursor-pointer">
            <FileText className="h-4 w-4 mr-2" />
            Text Post
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/posts/new/video"
            className="flex items-center cursor-pointer"
          >
            <Video className="h-4 w-4 mr-2" />
            Video Post
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
