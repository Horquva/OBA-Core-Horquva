interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function WizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between">

      <button
        onClick={onPrevious}
        disabled={currentStep === 1}
        className="rounded-lg border border-white/10 px-5 py-2 disabled:opacity-40"
      >
        Previous
      </button>

      <button
        onClick={onNext}
        className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-5 py-2 text-cyan-400"
      >
        {currentStep === totalSteps
          ? "Finish"
          : "Continue"}
      </button>

    </div>
  );
}