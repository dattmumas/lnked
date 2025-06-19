'use client';

import { Globe, Link, Lock, Zap, Settings, HardDrive } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';

interface SettingsStepProps {
  videoUpload: ReturnType<typeof useVideoUpload>;
}

export function SettingsStep({
  videoUpload,
}: SettingsStepProps): React.ReactElement {
  const { formData, updateFormData } = videoUpload;

  const handlePrivacyChange = useCallback(
    (value: string): void => {
      updateFormData({
        privacySetting: value as 'public' | 'unlisted' | 'private',
      });
    },
    [updateFormData],
  );

  const handleQualityChange = useCallback(
    (value: string): void => {
      updateFormData({
        encodingTier: value as 'smart' | 'baseline' | 'high',
      });
    },
    [updateFormData],
  );

  const renderPrivacyOption = useCallback(
    function renderPrivacyOptionImpl(option: {
      value: string;
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      details: string;
    }) {
      const IconComponent = option.icon;
      return (
        <div key={option.value} className="space-y-2">
          <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/30">
            <RadioGroupItem
              value={option.value}
              id={option.value}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor={option.value}
                className="flex items-center gap-2 font-medium cursor-pointer"
              >
                <IconComponent className="h-4 w-4" />
                {option.label}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {option.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {option.details}
              </p>
            </div>
          </div>
        </div>
      );
    },
    [],
  );

  const renderQualityOption = useCallback(
    function renderQualityOptionImpl(option: {
      value: string;
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
    }) {
      const IconComponent = option.icon;
      return (
        <SelectItem key={option.value} value={option.value}>
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </div>
          </div>
        </SelectItem>
      );
    },
    [],
  );

  const privacyOptions = useMemo(
    () => [
      {
        value: 'public',
        label: 'Public',
        description: 'Anyone can watch this video',
        icon: Globe,
        details:
          'Your video will be visible to everyone and can be found in search results.',
      },
      {
        value: 'unlisted',
        label: 'Unlisted',
        description: 'Only people with the link can watch',
        icon: Link,
        details:
          "Your video won't appear in search results, but anyone with the link can watch it.",
      },
      {
        value: 'private',
        label: 'Private',
        description: 'Only you can watch this video',
        icon: Lock,
        details:
          'Your video will only be visible to you. Perfect for drafts or personal content.',
      },
    ],
    [],
  );

  const qualityOptions = useMemo(
    () => [
      {
        value: 'smart',
        label: 'Smart Encoding (Recommended)',
        description: 'Automatic quality optimization',
        icon: Zap,
        details:
          'Automatically optimizes quality and file size for the best viewing experience.',
      },
      {
        value: 'baseline',
        label: 'Standard Quality',
        description: 'Good quality with smaller file size',
        icon: Settings,
        details:
          'Balanced encoding that works well for most content with reasonable file sizes.',
      },
      {
        value: 'high',
        label: 'High Quality',
        description: 'Maximum quality with larger file size',
        icon: HardDrive,
        details:
          'Highest quality encoding for professional content. Larger file sizes.',
      },
    ],
    [],
  );

  const isMatchingQualityOption = useCallback(
    (option: (typeof qualityOptions)[0], tier: string) => {
      return option.value === tier;
    },
    [],
  );

  const findQualityOption = useCallback(
    (tier: string) => {
      for (const option of qualityOptions) {
        if (isMatchingQualityOption(option, tier)) {
          return option;
        }
      }
      return undefined;
    },
    [qualityOptions, isMatchingQualityOption],
  );

  const renderQualityDetails = useCallback(() => {
    const selectedOption = findQualityOption(formData.encodingTier);
    const IconComponent = selectedOption?.icon || Zap;

    return (
      <div className="flex items-start gap-3">
        <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div>
          <h4 className="font-medium">{selectedOption?.label}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedOption?.details}
          </p>
        </div>
      </div>
    );
  }, [formData.encodingTier, findQualityOption]);

  const getSelectedQualityLabel = useCallback(() => {
    return findQualityOption(formData.encodingTier)?.label;
  }, [formData.encodingTier, findQualityOption]);

  const privacyOptionsList = useMemo(() => {
    return privacyOptions.map(renderPrivacyOption);
  }, [privacyOptions, renderPrivacyOption]);

  const qualityOptionsList = useMemo(() => {
    return qualityOptions.map(renderQualityOption);
  }, [qualityOptions, renderQualityOption]);

  const qualityDetailsComponent = useMemo(() => {
    return renderQualityDetails();
  }, [renderQualityDetails]);

  const selectedQualityLabel = useMemo(() => {
    return getSelectedQualityLabel();
  }, [getSelectedQualityLabel]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Upload Settings</h2>
        <p className="text-muted-foreground">
          Configure privacy and quality settings for your video
        </p>
      </div>

      <div className="space-y-8 max-w-3xl mx-auto">
        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>Choose who can watch your video</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.privacySetting}
              onValueChange={handlePrivacyChange}
              className="space-y-4"
            >
              {privacyOptionsList}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Quality Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quality Settings
            </CardTitle>
            <CardDescription>
              Choose the encoding quality for your video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quality-select" className="text-base font-medium">
                Encoding Quality
              </Label>
              <Select
                value={formData.encodingTier}
                onValueChange={handleQualityChange}
              >
                <SelectTrigger id="quality-select" className="mt-2">
                  <SelectValue placeholder="Select encoding quality" />
                </SelectTrigger>
                <SelectContent>{qualityOptionsList}</SelectContent>
              </Select>
            </div>

            {/* Quality Details */}
            <div className="bg-muted/30 rounded-lg p-4">
              {qualityDetailsComponent}
            </div>
          </CardContent>
        </Card>

        {/* Information Panel */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings Summary
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Privacy:</span>
              <span className="font-medium capitalize">
                {formData.privacySetting}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quality:</span>
              <span className="font-medium">{selectedQualityLabel}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium mb-2">💡 Tips for upload settings</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • <strong>Public videos</strong> get more views but are visible to
              everyone
            </li>
            <li>
              • <strong>Unlisted videos</strong> are great for sharing with
              specific people
            </li>
            <li>
              • <strong>Smart encoding</strong> is recommended for most use
              cases
            </li>
            <li>
              • <strong>High quality</strong> is best for professional or
              detailed content
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
