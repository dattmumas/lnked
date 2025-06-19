'use client';

import { Check } from 'lucide-react';
import React, { useCallback } from 'react';

import { WIZARD_STEPS } from '@/hooks/video/useStepNavigation';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  steps: typeof WIZARD_STEPS;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  currentStep,
  completedSteps,
  steps,
  onStepClick,
  totalSteps: _totalSteps,
}: StepIndicatorProps): React.ReactElement {
  const handleStepClick = useCallback(
    (index: number) => (): void => {
      onStepClick?.(index);
    },
    [onStepClick],
  );

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((_step, index) => (
        <div key={_step.id} className="flex items-center">
          {/* Step Circle */}
          <button
            onClick={handleStepClick(index)}
            disabled={!completedSteps.has(index) && index > currentStep}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              index < currentStep || completedSteps.has(index)
                ? 'bg-blue-600 text-white border-blue-600'
                : index === currentStep
                  ? 'bg-background text-foreground border-blue-600 ring-2 ring-blue-600'
                  : 'bg-background text-muted-foreground border-border hover:border-blue-300',
              // Disable styles for inaccessible steps
              !completedSteps.has(index) && index > currentStep
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:scale-105',
            )}
          >
            {index < currentStep || completedSteps.has(index) ? (
              <Check className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </button>

          {/* Step Label */}
          <div className="ml-3 hidden sm:block">
            <p
              className={cn(
                'text-sm font-medium',
                index === currentStep
                  ? 'text-foreground'
                  : index < currentStep || completedSteps.has(index)
                    ? 'text-blue-600'
                    : 'text-muted-foreground',
              )}
            >
              {_step.name}
            </p>
            <p className="text-xs text-muted-foreground hidden lg:block">
              {_step.description}
            </p>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-16 h-0.5 mx-4 transition-colors duration-200',
                index < currentStep ? 'bg-blue-600' : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
