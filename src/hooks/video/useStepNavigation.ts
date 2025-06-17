'use client';

import { useState, useCallback } from 'react';

const STEP_UPLOAD = 0;
const STEP_DETAILS = 1;
const STEP_SETTINGS = 2;
const STEP_PUBLISH = 3;

export const WIZARD_STEPS = [
  { id: STEP_UPLOAD, name: 'Upload', description: 'Select and upload your video file' },
  { id: STEP_DETAILS, name: 'Details', description: 'Add title, description, and tags' },
  { id: STEP_SETTINGS, name: 'Settings', description: 'Configure privacy and quality' },
  { id: STEP_PUBLISH, name: 'Publish', description: 'Confirm and publish your video' },
] as const;

interface UseStepNavigationResult {
  currentStep: number;
  next: () => void;
  previous: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  completionPercentage: number;
  steps: typeof WIZARD_STEPS;
  markStepComplete: (step: number) => void;
  totalSteps: number;
  completedSteps: Set<number>;
  currentStepInfo: (typeof WIZARD_STEPS)[number];
  [key: string]: unknown; // allow additional properties without TypeScript error
}

export const useStepNavigation = (
  totalSteps: number,
  initialStep = 0,
): UseStepNavigationResult => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const next = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const previous = useCallback(() => {
    if (currentStep > STEP_UPLOAD) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (
        step >= STEP_UPLOAD && 
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
    setCurrentStep(STEP_UPLOAD);
    setCompletedSteps(new Set());
  }, []);

  // Computed properties
  const isFirstStep = currentStep === STEP_UPLOAD;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoBack = currentStep > STEP_UPLOAD;
  const canGoNext = currentStep < totalSteps - 1;
  
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