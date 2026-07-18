"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

const steps = [
  "Organization created",
  "Data sources connected",
  "Role context prepared",
  "Loading organizational intelligence",
  "Preparing OBA workspace",
];

export default function ScopeContextLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length) {
          clearInterval(timer);
          return prev;
        }

        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  const progress =
    (Math.min(currentStep, steps.length) / steps.length) * 100;

  return (
    <section className="card p-8">

      {/* Header */}

      <div className="flex items-center gap-4">

        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/10">

          <Sparkles className="h-7 w-7 text-cyan-400" />

        </div>

        <div>

          <h2 className="text-2xl font-semibold">
            Preparing Your Workspace
          </h2>

          <p className="mt-1 text-gray-400">
            OBA is creating your personalized organizational context.
          </p>

        </div>

      </div>

      {/* Progress Bar */}

      <div className="mt-8">

        <div className="h-2 overflow-hidden rounded-full bg-white/10">

          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />

        </div>

        <div className="mt-2 text-right text-sm text-gray-400">
          {Math.round(progress)}%
        </div>

      </div>

      {/* Steps */}

      <div className="mt-8 space-y-5">

        {steps.map((step, index) => {

          const completed = index < currentStep;

          const active = index === currentStep;

          return (
            <div
              key={step}
              className="flex items-center gap-4"
            >

              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : active ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-cyan-400" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-white/20" />
              )}

              <span
                className={`${
                  completed
                    ? "text-white"
                    : active
                    ? "text-cyan-300"
                    : "text-gray-500"
                }`}
              >
                {step}
              </span>

            </div>
          );
        })}

      </div>

      {/* Finish Message */}

      {currentStep >= steps.length && (
        <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">

          <div className="flex items-center gap-3">

            <CheckCircle2 className="h-6 w-6 text-emerald-400" />

            <div>

              <h3 className="font-semibold text-emerald-400">
                Workspace Ready
              </h3>

              <p className="mt-1 text-sm text-gray-300">
                Your personalized OBA Command Center is ready.
              </p>

            </div>

          </div>

        </div>
      )}

    </section>
  );
}