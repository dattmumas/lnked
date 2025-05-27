'use client';

import React from 'react';
import {
  FileText,
  Calendar,
  Eye,
  Save,
  Clock,
  Globe,
  Lock,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PublishSettingsCardProps {
  status: 'draft' | 'published' | 'scheduled';
  onStatusChange: (value: 'draft' | 'published' | 'scheduled') => void;
  publishedAt?: string;
  onPublishedAtChange?: (value: string) => void;
  onPublish: () => void;
  isPublishing: boolean;
  autosaveStatus?: string;
  errors?: {
    published_at?: { message?: string };
  };
  collectiveName?: string;
  postId?: string | null;
}

const statusOptions = [
  {
    value: 'draft' as const,
    label: 'Draft',
    description: 'Save privately',
    icon: Lock,
    color: 'text-muted-foreground',
  },
  {
    value: 'published' as const,
    label: 'Publish',
    description: 'Make it live',
    icon: Globe,
    color: 'text-green-600 dark:text-green-400',
  },
  {
    value: 'scheduled' as const,
    label: 'Schedule',
    description: 'Set future date',
    icon: CalendarClock,
    color: 'text-blue-600 dark:text-blue-400',
  },
];

export function PublishSettingsCard({
  status,
  onStatusChange,
  publishedAt,
  onPublishedAtChange,
  onPublish,
  isPublishing,
  autosaveStatus,
  errors,
  collectiveName,
  postId,
}: PublishSettingsCardProps) {
  const getButtonConfig = () => {
    switch (status) {
      case 'published':
        return {
          icon: <Eye className="w-4 h-4" />,
          text: 'Publish Now',
          variant: 'default' as const,
        };
      case 'scheduled':
        return {
          icon: <Calendar className="w-4 h-4" />,
          text: 'Schedule Post',
          variant: 'default' as const,
        };
      default:
        return {
          icon: <Save className="w-4 h-4" />,
          text: postId ? 'Update Draft' : 'Save Draft',
          variant: 'secondary' as const,
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="space-y-4">
      {/* Minimal Header */}
      <div>
        <h3 className="font-medium text-sm text-foreground">
          Publish Settings
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose when to publish
        </p>
      </div>

      {/* Status Selection - Minimal style */}
      <RadioGroup
        value={status}
        onValueChange={onStatusChange}
        className="space-y-2"
      >
        {statusOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
            <label
              key={option.value}
              htmlFor={option.value}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-md cursor-pointer',
                'transition-all duration-200',
                'hover:bg-muted/50',
                status === option.value ? 'bg-muted' : '',
              )}
            >
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="h-4 w-4"
              />
              <OptionIcon className={cn('w-4 h-4', option.color)} />
              <div className="flex-1">
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {option.description}
                </span>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      {/* Schedule Date Input - Compact */}
      {status === 'scheduled' && (
        <div className="space-y-1.5">
          <Label
            htmlFor="published_at"
            className="text-xs font-medium flex items-center gap-1.5"
          >
            <Clock className="w-3 h-3" />
            Publish Date & Time
          </Label>
          <Input
            id="published_at"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => onPublishedAtChange?.(e.target.value)}
            className="text-sm h-9"
          />
          {errors?.published_at && (
            <p className="text-xs text-destructive">
              {errors.published_at.message}
            </p>
          )}
        </div>
      )}

      {/* Publish Button */}
      <Button
        onClick={onPublish}
        disabled={isPublishing}
        className="w-full"
        variant={buttonConfig.variant}
        size="default"
      >
        {isPublishing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {buttonConfig.icon}
            {buttonConfig.text}
          </div>
        )}
      </Button>

      {/* Autosave Status - Minimal */}
      {autosaveStatus && (
        <div
          className={cn(
            'text-xs flex items-center gap-1.5',
            'text-muted-foreground',
            autosaveStatus.includes('failed') ||
              autosaveStatus.includes('error')
              ? 'text-destructive'
              : '',
          )}
        >
          {autosaveStatus.includes('Saving') ? (
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
          ) : autosaveStatus.includes('saved') ? (
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          ) : null}
          {autosaveStatus}
        </div>
      )}

      {/* Publishing to Collection Badge - Minimal */}
      {collectiveName && (
        <div className="text-xs text-muted-foreground text-center">
          Publishing to <span className="font-medium">{collectiveName}</span>
        </div>
      )}
    </div>
  );
}
