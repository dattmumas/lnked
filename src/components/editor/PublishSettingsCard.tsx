// @ts-nocheck
'use client';

import {
  Calendar,
  Eye,
  Save,
  Clock,
  Globe,
  Lock,
  CalendarClock,
} from 'lucide-react';

import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
    color: 'text-content-secondary',
    bgColor: 'bg-surface-elevated-2',
  },
  {
    value: 'published' as const,
    label: 'Publish',
    description: 'Make it live',
    icon: Globe,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    value: 'scheduled' as const,
    label: 'Schedule',
    description: 'Set future date',
    icon: CalendarClock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
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
    <div className="pattern-stack">
      {/* Enhanced Header with better typography */}
      <div className="pattern-stack">
        <h3 className="text-content-primary font-semibold text-base tracking-tight">
          Publish Settings
        </h3>
        <p className="text-content-secondary text-sm leading-relaxed">
          Choose when to publish your content
        </p>
      </div>

      {/* Enhanced Status Selection with improved radio buttons */}
      <RadioGroup
        value={status}
        onValueChange={onStatusChange}
        className="pattern-stack"
      >
        {statusOptions.map((option) => {
          const OptionIcon = option.icon;
          const isSelected = status === option.value;

          return (
            <label
              key={option.value}
              htmlFor={option.value}
              className={cn(
                // Base styling with design tokens
                'flex items-center gap-component p-card-sm rounded-lg cursor-pointer',
                'border border-border-subtle transition-all transition-normal',
                'micro-interaction',
                // Selected state
                isSelected
                  ? ['border-accent bg-interaction-focus', option.bgColor]
                  : ['hover:bg-interaction-hover', 'hover:border-accent/50'],
              )}
            >
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className={cn(
                  'h-5 w-5 transition-colors transition-fast',
                  isSelected && 'border-accent text-accent',
                )}
              />

              {/* Icon with enhanced styling */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-md',
                  'transition-colors transition-fast',
                  isSelected ? option.bgColor : 'bg-surface-elevated-2',
                )}
              >
                <OptionIcon className={cn('w-4 h-4', option.color)} />
              </div>

              {/* Content with improved spacing */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-content-primary font-medium text-sm">
                    {option.label}
                  </span>
                  <span className="text-content-secondary text-xs">
                    {option.description}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      {/* Enhanced Schedule Date Input */}
      {status === 'scheduled' && (
        <div className="pattern-stack">
          <Label
            htmlFor="published_at"
            className="text-content-primary text-sm font-medium flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-content-accent" />
            Publish Date & Time
          </Label>
          <Input
            id="published_at"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => onPublishedAtChange?.(e.target.value)}
            className="text-sm h-10 border-border-subtle focus:border-accent transition-colors transition-fast"
          />
          {errors?.published_at && (
            <p className="text-destructive text-sm flex items-center gap-1.5">
              <span className="w-1 h-1 bg-destructive rounded-full" />
              {errors.published_at.message}
            </p>
          )}
        </div>
      )}

      {/* Enhanced Publish Button */}
      <Button
        onClick={onPublish}
        disabled={isPublishing}
        className="w-full micro-interaction btn-scale"
        variant={buttonConfig.variant}
        size="default"
        loading={isPublishing}
        leftIcon={!isPublishing ? buttonConfig.icon : undefined}
      >
        {isPublishing ? 'Processing...' : buttonConfig.text}
      </Button>

      {/* Enhanced Autosave Status */}
      {autosaveStatus && (
        <div
          className={cn(
            'text-sm flex items-center gap-component',
            'text-content-secondary',
            autosaveStatus.includes('failed') ||
              autosaveStatus.includes('error')
              ? 'text-destructive'
              : autosaveStatus.includes('saved')
                ? 'text-green-600 dark:text-green-400'
                : '',
          )}
        >
          {autosaveStatus.includes('Saving') ? (
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          ) : autosaveStatus.includes('saved') ? (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          ) : autosaveStatus.includes('failed') ||
            autosaveStatus.includes('error') ? (
            <div className="w-2 h-2 bg-destructive rounded-full" />
          ) : undefined}
          {autosaveStatus}
        </div>
      )}

      {/* Enhanced Collection Badge */}
      {collectiveName && (
        <div className="text-content-secondary text-sm text-center p-card-sm bg-surface-elevated-2 rounded-md border border-border-subtle">
          Publishing to{' '}
          <span className="text-content-accent font-medium">
            {collectiveName}
          </span>
        </div>
      )}
    </div>
  );
}
