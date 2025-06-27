import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface ProgressIndicatorProps {
  steps: OnboardingStep[];
  currentStep: number;
  totalSteps: number;
  progressPercentage: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  totalSteps,
  progressPercentage,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Onboarding progress: ${Math.round(progressPercentage)}% complete`}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="hidden md:block">
        <nav aria-label="Onboarding progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.step} className="flex items-center">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${step.completed
                        ? 'bg-indigo-600 text-white'
                        : step.current
                        ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                    aria-current={step.current ? 'step' : undefined}
                  >
                    {step.completed ? (
                      <CheckIcon className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      step.step
                    )}
                  </div>

                  {/* Step Title (Desktop) */}
                  <div className="ml-3 hidden lg:block">
                    <p className={`text-sm font-medium ${
                      step.completed || step.current ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div className={`h-0.5 ${
                      step.completed ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Mobile Step Indicator */}
      <div className="md:hidden">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm border">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {currentStep}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {steps[currentStep - 1]?.title}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StepContentProps {
  step: OnboardingStep;
  children: React.ReactNode;
  className?: string;
}

export const StepContent: React.FC<StepContentProps> = ({
  step,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl font-bold text-indigo-600">
            {step.step}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {step.title}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {step.description}
        </p>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

interface NavigationButtonsProps {
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  showSkip?: boolean;
  backText?: string;
  nextText?: string;
  skipText?: string;
  className?: string;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  onBack,
  onNext,
  onSkip,
  backDisabled = false,
  nextDisabled = false,
  nextLoading = false,
  showSkip = false,
  backText = 'Back',
  nextText = 'Continue',
  skipText = 'Skip for now',
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div className="flex space-x-3">
        <button
          onClick={onBack}
          disabled={backDisabled}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backText}
        </button>
        
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="px-6 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            {skipText}
          </button>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={nextDisabled || nextLoading}
        className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {nextLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Loading...</span>
          </>
        ) : (
          <>
            <span>{nextText}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}; 