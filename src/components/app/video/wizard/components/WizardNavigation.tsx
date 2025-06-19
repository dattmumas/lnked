'use client';

import { ChevronLeft, ChevronRight, Upload, Loader2, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { WIZARD_STEPS } from '@/hooks/video/useStepNavigation';

// Step constants
const STEP_UPLOAD = 0;
const STEP_DETAILS = 1;
const STEP_SETTINGS = 2;

interface WizardNavigationProps {
  currentStep: number;
  canGoBack: boolean;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  isUploading: boolean;
  isPublishing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel?: () => void;
  currentStepInfo: (typeof WIZARD_STEPS)[number];
}

export function WizardNavigation({
  currentStep,
  canGoBack,
  canProceed,
  isFirstStep: _isFirstStep,
  isLastStep,
  isUploading,
  isPublishing,
  onPrevious,
  onNext,
  onCancel,
  currentStepInfo,
}: WizardNavigationProps): React.ReactElement {
  const getNextButtonText = (): string => {
    if (isLastStep) {
      return isPublishing ? 'Publishing...' : 'Publish Video';
    }

    switch (currentStep) {
      case STEP_UPLOAD:
        return 'Continue to Details';
      case STEP_DETAILS:
        return 'Continue to Settings';
      case STEP_SETTINGS:
        return 'Ready to Publish';
      default:
        return 'Continue';
    }
  };

  const getNextButtonIcon = (): React.ReactElement => {
    if (isLastStep) {
      return isPublishing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      );
    }
    return <ChevronRight className="h-4 w-4" />;
  };

  const isNextDisabled = (): boolean => {
    if (isUploading || isPublishing) return true;
    if (isLastStep) return !canProceed;
    return !canProceed;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex justify-between items-center mt-6">
        <div className="flex items-center space-x-4">
          {/* Cancel Button */}
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isUploading || isPublishing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoBack || isUploading || isPublishing}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Step Info */}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {currentStepInfo.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentStepInfo.description}
          </p>
        </div>

        {/* Next Button */}
        <Button
          onClick={onNext}
          disabled={isNextDisabled()}
          className="min-w-[140px]"
        >
          {getNextButtonIcon()}
          <span className="ml-2">{getNextButtonText()}</span>
        </Button>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Step Info */}
        <div className="text-center mb-4">
          <p className="text-sm font-medium text-foreground">
            {currentStepInfo.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentStepInfo.description}
          </p>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="flex justify-between max-w-sm mx-auto">
            {/* Mobile Back Button */}
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={!canGoBack || isUploading || isPublishing}
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Mobile Cancel Button */}
            {onCancel && (
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={isUploading || isPublishing}
                size="sm"
              >
                Cancel
              </Button>
            )}

            {/* Mobile Next Button */}
            <Button
              onClick={onNext}
              disabled={isNextDisabled()}
              size="sm"
              className="min-w-[100px]"
            >
              {getNextButtonIcon()}
              <span className="ml-2">
                {isLastStep
                  ? isPublishing
                    ? 'Publishing...'
                    : 'Publish'
                  : 'Continue'}
              </span>
            </Button>
          </div>
        </div>

        {/* Mobile Bottom Padding */}
        <div className="h-20" />
      </div>
    </>
  );
}
