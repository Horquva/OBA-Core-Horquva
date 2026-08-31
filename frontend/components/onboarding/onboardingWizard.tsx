"use client";

import { useState } from "react";

import WizardProgress from "./WizardProgress";
import OrgSetupStep from "./OrgSetupStep";
import DataSourceConnector from "./DataSourceConnector";
import RoleSelector from "./RoleSelector";
import ScopeContextLoader from "./ScopeContextLoader";
import WizardNavigation from "./WizardNavigation";

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 4;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <OrgSetupStep />;

      case 2:
        return <DataSourceConnector />;

      case 3:
        return <RoleSelector />;

      case 4:
        return <ScopeContextLoader />;

      default:
        return null;
    }
  };

  return (
    <section className="card p-8 space-y-8">

      <WizardProgress
        currentStep={currentStep}
      />

      {renderStep()}

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={previousStep}
        onNext={nextStep}
      />

    </section>
  );
}