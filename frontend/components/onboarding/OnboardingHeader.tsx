import { Sparkles } from "lucide-react";

export default function OnboardingHeader() {
  return (
    <div className="card flex items-center justify-between p-8">

      {/* Left */}

      <div className="flex items-center gap-5">

        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">

          <Sparkles className="h-7 w-7 text-cyan-400" />

        </div>

        <div>

          <h1 className="text-3xl font-semibold">
            Welcome to Organizational Brain
          </h1>

          <p className="mt-1 text-gray-400">
            Set up your organization, connect your data and personalize your workspace before entering the Command Center.
          </p>

        </div>

      </div>

      {/* Right */}

      <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 whitespace-nowrap">

        First-Time Setup

      </div>

    </div>
  );
}