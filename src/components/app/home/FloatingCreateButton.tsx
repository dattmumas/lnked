'use client';

import { Plus, FileText, Video } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function FloatingCreateButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none lg:hidden">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Create new post"
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground p-0 shadow-lg hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-offset-2 pointer-events-auto"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 mb-2 pointer-events-auto"
        >
          <DropdownMenuItem asChild>
            <Link
              href="/posts/new"
              className="flex items-center cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Text Post
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/posts/new/video"
              className="flex items-center cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Video className="h-4 w-4 mr-2" />
              Video Post
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
