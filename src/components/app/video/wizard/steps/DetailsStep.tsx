'use client';

import React, { useState } from 'react';

// Constants
const MAX_TAGS = 10;
const TITLE_WARNING_THRESHOLD = 90;
const DESCRIPTION_WARNING_THRESHOLD = 4500;
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';

interface DetailsStepProps {
  videoUpload: ReturnType<typeof useVideoUpload>;
}

export function DetailsStep({ videoUpload }: DetailsStepProps) {
  const [newTag, setNewTag] = useState('');
  const { formData, updateFormData, validationErrors } = videoUpload;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ title: e.target.value });
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    updateFormData({ description: e.target.value });
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (
      tag &&
      !formData.tags.includes(tag) &&
      formData.tags.length < MAX_TAGS
    ) {
      updateFormData({ tags: [...formData.tags, tag] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData({
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const titleLength = formData.title.length;
  const descriptionLength = formData.description.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Video Details</h2>
        <p className="text-muted-foreground">
          Add a title, description, and tags to help people discover your video
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Title Field */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-semibold">
            Video Title *
          </Label>
          <Input
            id="title"
            placeholder="Enter a compelling title for your video"
            value={formData.title}
            onChange={handleTitleChange}
            maxLength={100}
            className={cn(
              validationErrors.title &&
                'border-destructive focus-visible:ring-destructive',
            )}
          />
          <div className="flex justify-between items-center">
            <p
              className={cn(
                'text-xs',
                validationErrors.title
                  ? 'text-destructive'
                  : titleLength > TITLE_WARNING_THRESHOLD
                    ? 'text-orange-500'
                    : 'text-muted-foreground',
              )}
            >
              {validationErrors.title || `${titleLength}/100 characters`}
            </p>
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-semibold">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your video content, what viewers can expect, and any relevant context..."
            value={formData.description}
            onChange={handleDescriptionChange}
            rows={4}
            maxLength={5000}
            className={cn(
              validationErrors.description &&
                'border-destructive focus-visible:ring-destructive',
            )}
          />
          <div className="flex justify-between items-center">
            <p
              className={cn(
                'text-xs',
                validationErrors.description
                  ? 'text-destructive'
                  : descriptionLength > DESCRIPTION_WARNING_THRESHOLD
                    ? 'text-orange-500'
                    : 'text-muted-foreground',
              )}
            >
              {validationErrors.description ||
                `${descriptionLength}/5000 characters`}
            </p>
          </div>
        </div>

        {/* Tags Field */}
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-base font-semibold">
            Tags
          </Label>
          <p className="text-sm text-muted-foreground">
            Add tags to help people discover your video (up to {MAX_TAGS} tags)
          </p>

          {/* Tag Input */}
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Enter a tag and press Enter"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              disabled={formData.tags.length >= MAX_TAGS}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={!newTag.trim() || formData.tags.length >= MAX_TAGS}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Display Tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {validationErrors.tags && (
            <p className="text-xs text-destructive">{validationErrors.tags}</p>
          )}

          <p className="text-xs text-muted-foreground">
            {formData.tags.length}/{MAX_TAGS} tags
          </p>
        </div>

        {/* Tips */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium mb-2">💡 Tips for better discovery</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • Use a clear, descriptive title that explains what your video is
              about
            </li>
            <li>
              • Write a detailed description to help viewers understand the
              content
            </li>
            <li>• Add relevant tags that people might search for</li>
            <li>
              • Include keywords that describe your video's topic or theme
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
