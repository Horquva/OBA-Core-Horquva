'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

export interface FullPageWizardProps {
  title: string;
  steps: WizardStep[];
  currentStepIndex: number;
  onStepChange?: (index: number) => void;
  onCancel: () => void;
  onComplete: () => void;
  isSubmitting?: boolean;
  canProceed?: boolean;
  children: React.ReactNode;
  className?: string;
  nextLabel?: string;
}

export function FullPageWizard({
  title,
  steps,
  currentStepIndex,
  onStepChange,
  onCancel,
  onComplete,
  isSubmitting = false,
  canProceed = true,
  children,
  className,
  nextLabel,
}: FullPageWizardProps) {
  const currentStep = steps[currentStepIndex] || steps[0];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onStepChange?.(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange?.(currentStepIndex - 1);
    }
  };

  return (
    <div
      className={cn('fixed inset-0 z-50 flex flex-col bg-surface overflow-hidden', className)}
    >
      {/* Top Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-rule px-6 bg-surface">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            ← Exit
          </Button>
          <div className="h-4 w-[1px] bg-rule" aria-hidden="true" />
          <h1 className="font-serif text-lg font-medium text-ink">{title}</h1>
        </div>

        {/* Step Progress Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-3">
            <span>Step {currentStepIndex + 1} of {steps.length}:</span>
            <span className="font-medium text-ink">{currentStep.title}</span>
          </div>
          <div
            className="flex items-center gap-1"
            role="progressbar"
            aria-label="Wizard progress"
            aria-valuenow={currentStepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          >
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors',
                  idx <= currentStepIndex ? 'bg-amber' : 'bg-surface-sunken'
                )}
                title={`Step ${idx + 1}: ${step.title}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 space-y-1">
            <h2 className="font-serif text-2xl font-normal text-ink">{currentStep.title}</h2>
            {currentStep.description && (
              <p className="text-sm text-ink-2 leading-relaxed">{currentStep.description}</p>
            )}
          </div>
          <div className="space-y-6">{children}</div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-rule px-6 bg-surface-sunken/50">
        <Button
          variant="secondary"
          size="md"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            isLoading={isSubmitting}
          >
            {nextLabel || (isLastStep ? 'Confirm & Finish' : 'Next Step →')}
          </Button>
        </div>
      </footer>
    </div>
  );
}
