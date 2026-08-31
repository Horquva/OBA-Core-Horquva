import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import OnboardingWizard from "@/components/onboarding/onboardingWizard";

export default function OnboardingPage() {
  return (
    <main className="space-y-6">
      <OnboardingHeader />

      <OnboardingWizard />
    </main>
  );
}