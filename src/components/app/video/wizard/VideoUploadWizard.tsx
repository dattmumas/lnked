'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useVideoUpload } from '@/hooks/video/useVideoUpload';
import { StepIndicator } from './components/StepIndicator';
import { WizardNavigation } from './components/WizardNavigation';
import { UploadStep } from './steps/UploadStep';
import { DetailsStep } from './steps/DetailsStep';
import { SettingsStep } from './steps/SettingsStep';

import { PublishStep } from './steps/PublishStep';

interface VideoUploadWizardProps {
  collectiveId?: string;
  onComplete?: (videoId: string) => void;
  onCancel?: () => void;
}

export default function VideoUploadWizard({
  collectiveId,
  onComplete,
  onCancel,
}: VideoUploadWizardProps) {
  const videoUpload = useVideoUpload(collectiveId);

  const handleComplete = async () => {
    const success = await videoUpload.publishVideo();
    if (success && videoUpload.videoAsset?.id) {
      onComplete?.(videoUpload.videoAsset.id);
    }
  };

  const renderCurrentStep = () => {
    switch (videoUpload.currentStep) {
      case 0:
        return <UploadStep key="upload" videoUpload={videoUpload} />;
      case 1:
        return <DetailsStep key="details" videoUpload={videoUpload} />;
      case 2:
        return <SettingsStep key="settings" videoUpload={videoUpload} />;
      case 3:
        return (
          <PublishStep
            key="publish"
            videoUpload={videoUpload}
            onComplete={handleComplete}
          />
        );
      default:
        return <UploadStep key="upload" videoUpload={videoUpload} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Progress Indicator */}
      <StepIndicator
        currentStep={videoUpload.currentStep}
        totalSteps={videoUpload.totalSteps}
        completedSteps={videoUpload.completedSteps}
        steps={videoUpload.steps}
        onStepClick={videoUpload.goToStep}
      />

      {/* Main Content Card */}
      <Card className="p-6 mt-8">
        <div className="min-h-[400px]">{renderCurrentStep()}</div>
      </Card>

      {/* Navigation Controls */}
      <WizardNavigation
        currentStep={videoUpload.currentStep}
        canGoBack={videoUpload.canGoBack}
        canProceed={videoUpload.canProceed}
        isFirstStep={videoUpload.isFirstStep}
        isLastStep={videoUpload.isLastStep}
        isUploading={videoUpload.isUploading}
        isPublishing={videoUpload.isPublishing}
        onPrevious={videoUpload.previousStep}
        onNext={videoUpload.nextStep}
        onCancel={onCancel}
        currentStepInfo={videoUpload.currentStepInfo}
      />
    </div>
  );
}
