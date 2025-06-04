'use client';

import { useState, useCallback, useMemo } from 'react';

export const WIZARD_STEPS = [
  { id: 0, name: 'Upload', description: 'Select and upload your video file' },
  { id: 1, name: 'Details', description: 'Add title, description, and tags' },
  { id: 2, name: 'Settings', description: 'Configure privacy and quality' },
  { id: 3, name: 'Preview', description: 'Preview how it will appear in feed' },
  { id: 4, name: 'Publish', description: 'Confirm and publish your video' },
] as const;

export const useStepNavigation = (canProceed: boolean = true) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const totalSteps = WIZARD_STEPS.length;

  const next = useCallback(() => {
    if (canProceed && currentStep < totalSteps - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  }, [canProceed, currentStep, totalSteps]);

  const previous = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      // Allow navigation to completed steps or current step
      if (
        step >= 0 && 
        step < totalSteps && 
        (completedSteps.has(step) || step <= currentStep)
      ) {
        setCurrentStep(step);
      }
    },
    [completedSteps, currentStep, totalSteps]
  );

  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, []);

  // Computed properties
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoBack = currentStep > 0;
  const canGoNext = canProceed && currentStep < totalSteps - 1;
  
  const currentStepInfo = WIZARD_STEPS[currentStep];
  const completionPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  // Check if a specific step is complete
  const isStepComplete = useCallback(
    (step: number) => completedSteps.has(step),
    [completedSteps]
  );

  // Check if a step is accessible (current, previous, or completed)
  const isStepAccessible = useCallback(
    (step: number) => step <= currentStep || completedSteps.has(step),
    [currentStep, completedSteps]
  );

  return {
    // Current state
    currentStep,
    currentStepInfo,
    totalSteps,
    completedSteps,
    completionPercentage,

    // Navigation methods
    next,
    previous,
    goToStep,
    markStepComplete,
    reset,

    // Status checks
    isFirstStep,
    isLastStep,
    canGoBack,
    canGoNext,
    isStepComplete,
    isStepAccessible,

    // Steps data
    steps: WIZARD_STEPS,
  };
}; 