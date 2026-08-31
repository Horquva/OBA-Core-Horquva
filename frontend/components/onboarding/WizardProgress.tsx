interface WizardProgressProps {
  currentStep: number;
}

const steps = [
  "Organization",
  "Data Sources",
  "Role",
  "Context",
];

export default function WizardProgress({
  currentStep,
}: WizardProgressProps) {
  return (
    <div className="space-y-8">
      {/* Heading */}

      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
          Step {currentStep} of {steps.length}
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          {steps[currentStep - 1]}
        </h2>
      </div>

      {/* Stepper */}

      <div className="flex justify-between relative">

        {/* Background Line */}

        <div className="absolute left-0 right-0 top-6 h-0.5 bg-white/10 -z-10" />

        {/* Active Line */}

        <div
          className="absolute left-0 top-6 h-0.5 bg-cyan-400 transition-all duration-500 -z-10"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, index) => {
          const active = index + 1 <= currentStep;

          return (
            <div
              key={step}
              className="flex flex-col items-center w-28"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-all
                ${
                  active
                    ? "border-cyan-400 bg-[#12222d] text-cyan-300"
                    : "border-white/10 bg-[#16161c] text-gray-500"
                }`}
              >
                {index + 1}
              </div>

              <span
                className={`mt-5 text-center text-sm transition
                ${
                  active
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}