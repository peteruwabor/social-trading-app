'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { 
  validateProfileStep, 
  validatePreferencesStep, 
  isProfileStepValid, 
  isPreferencesStepValid,
  TRADING_EXPERIENCE_OPTIONS,
  RISK_TOLERANCE_OPTIONS,
  INVESTMENT_GOALS,
  PREFERRED_MARKETS,
  INVESTMENT_RANGE_OPTIONS,
  type OnboardingValidationErrors,
  type ProfileData
} from '@/lib/onboarding-validation';
import { 
  FormField, 
  TextInput, 
  TextArea, 
  Select, 
  MultiSelect 
} from '@/components/onboarding/FormField';
import { 
  ProgressIndicator, 
  StepContent, 
  NavigationButtons 
} from '@/components/onboarding/ProgressIndicator';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  data?: any;
}

interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  steps: OnboardingStep[];
  user: any;
}

export default function OnboardingPage() {
  const { user, token, apiClient } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<OnboardingValidationErrors>({});

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    bio: '',
    tradingExperience: '',
    riskTolerance: '',
    investmentGoals: [],
    preferredMarkets: [],
    investmentRange: ''
  });

  const [recommendedTraders, setRecommendedTraders] = useState([]);
  const [tradersLoading, setTradersLoading] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    fetchOnboardingProgress();
  }, [user, token]);

  const fetchOnboardingProgress = async () => {
    try {
      const response = await apiClient.get('/api/onboarding/progress');
      setProgress(response.data);
      setCurrentStep(response.data.currentStep);
      
      // Pre-fill profile data if exists
      if (response.data.user) {
        setProfileData({
          firstName: response.data.user.firstName || '',
          lastName: response.data.user.lastName || '',
          bio: response.data.user.bio || '',
          tradingExperience: response.data.user.tradingExperience || '',
          riskTolerance: response.data.user.riskTolerance || '',
          investmentGoals: response.data.user.investmentGoals || [],
          preferredMarkets: response.data.user.preferredMarkets || [],
          investmentRange: response.data.user.investmentRange || ''
        });
      }
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStep = async (step: number) => {
    try {
      await apiClient.put(`/api/onboarding/step/${step}`);
      setCurrentStep(step);
      fetchOnboardingProgress();
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);
      await apiClient.put('/api/onboarding/profile', profileData);
      await fetchOnboardingProgress();
      setValidationErrors({});
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const fetchRecommendedTraders = async () => {
    try {
      setTradersLoading(true);
      const response = await apiClient.get('/api/onboarding/recommended-traders');
      setRecommendedTraders(response.data);
    } catch (error) {
      console.error('Error fetching recommended traders:', error);
    } finally {
      setTradersLoading(false);
    }
  };

  const skipOnboarding = async () => {
    try {
      await apiClient.post('/api/onboarding/skip');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setSaving(true);
      await updateStep(6);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStep === 2) {
      const errors = validateProfileStep(profileData);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      await updateProfile();
      updateStep(3);
    } else if (currentStep === 3) {
      const errors = validatePreferencesStep(profileData);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      await updateProfile();
      updateStep(4);
    } else if (currentStep === 4) {
      updateStep(5);
    } else if (currentStep === 5) {
      updateStep(6);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      updateStep(currentStep - 1);
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 2) {
      return !isProfileStepValid(profileData);
    } else if (currentStep === 3) {
      return !isPreferencesStepValid(profileData);
    }
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!progress) return null;

  const steps = progress.steps.map((step, index) => ({
    ...step,
    current: index + 1 === currentStep
  }));

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GIOAT Setup</span>
            </div>
            <button
              onClick={skipOnboarding}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressIndicator
          steps={steps}
          currentStep={currentStep}
          totalSteps={progress.totalSteps}
          progressPercentage={progress.progressPercentage}
          className="mb-8"
        />

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <StepContent step={currentStepData}>
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Welcome to GIOAT!
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Let's get you set up for success in social trading. We'll guide you through 
                    creating your profile, setting your preferences, and connecting with top traders.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl">👤</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Complete Profile</h3>
                    <p className="text-sm text-gray-600">Tell us about yourself and your trading experience</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl">⚙️</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Set Preferences</h3>
                    <p className="text-sm text-gray-600">Configure your risk tolerance and investment goals</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl">🔗</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Connect & Discover</h3>
                    <p className="text-sm text-gray-600">Link your broker and find top traders to follow</p>
                  </div>
                </div>

                <NavigationButtons
                  onBack={() => {}}
                  onNext={handleNext}
                  backDisabled={true}
                  nextText="Get Started"
                  className="mt-8"
                />
              </div>
            )}

            {/* Step 2: Complete Profile */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="First Name"
                    name="firstName"
                    error={validationErrors.firstName}
                    required
                  >
                    <TextInput
                      id="firstName"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={(value) => setProfileData({ ...profileData, firstName: value })}
                      placeholder="Enter your first name"
                      maxLength={50}
                      aria-describedby={validationErrors.firstName ? 'firstName-error' : 'firstName-help'}
                    />
                  </FormField>

                  <FormField
                    label="Last Name"
                    name="lastName"
                    error={validationErrors.lastName}
                    required
                  >
                    <TextInput
                      id="lastName"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={(value) => setProfileData({ ...profileData, lastName: value })}
                      placeholder="Enter your last name"
                      maxLength={50}
                      aria-describedby={validationErrors.lastName ? 'lastName-error' : 'lastName-help'}
                    />
                  </FormField>
                </div>

                <FormField
                  label="Trading Experience"
                  name="tradingExperience"
                  error={validationErrors.tradingExperience}
                  required
                  helpText="This helps us recommend suitable traders and strategies"
                >
                  <Select
                    id="tradingExperience"
                    name="tradingExperience"
                    value={profileData.tradingExperience}
                    onChange={(value) => setProfileData({ ...profileData, tradingExperience: value })}
                    options={TRADING_EXPERIENCE_OPTIONS}
                    placeholder="Select your experience level"
                    aria-describedby={validationErrors.tradingExperience ? 'tradingExperience-error' : 'tradingExperience-help'}
                  />
                </FormField>

                <FormField
                  label="Bio"
                  name="bio"
                  error={validationErrors.bio}
                  helpText="Tell us about yourself and your trading interests (optional)"
                >
                  <TextArea
                    id="bio"
                    name="bio"
                    value={profileData.bio}
                    onChange={(value) => setProfileData({ ...profileData, bio: value })}
                    placeholder="Tell us about yourself and your trading interests..."
                    maxLength={500}
                    rows={3}
                    aria-describedby={validationErrors.bio ? 'bio-error' : 'bio-help'}
                  />
                </FormField>

                <NavigationButtons
                  onBack={handleBack}
                  onNext={handleNext}
                  nextDisabled={isNextDisabled()}
                  nextLoading={saving}
                  className="mt-8"
                />
              </div>
            )}

            {/* Step 3: Trading Preferences */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <FormField
                  label="Risk Tolerance"
                  name="riskTolerance"
                  error={validationErrors.riskTolerance}
                  required
                  helpText="Choose the risk level that matches your investment style"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {RISK_TOLERANCE_OPTIONS.map((risk) => (
                      <button
                        key={risk.value}
                        type="button"
                        onClick={() => setProfileData({ ...profileData, riskTolerance: risk.value })}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          profileData.riskTolerance === risk.value
                            ? `${risk.borderColor} ${risk.bgColor} ${risk.color}`
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                        aria-describedby={validationErrors.riskTolerance ? 'riskTolerance-error' : 'riskTolerance-help'}
                      >
                        <div className="font-semibold">{risk.label}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {risk.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField
                  label="Investment Goals"
                  name="investmentGoals"
                  error={validationErrors.investmentGoals}
                  required
                  helpText="Select up to 5 goals that align with your investment strategy"
                >
                  <MultiSelect
                    id="investmentGoals"
                    name="investmentGoals"
                    value={profileData.investmentGoals}
                    onChange={(value) => setProfileData({ ...profileData, investmentGoals: value })}
                    options={INVESTMENT_GOALS}
                    maxSelections={5}
                    aria-describedby={validationErrors.investmentGoals ? 'investmentGoals-error' : 'investmentGoals-help'}
                  />
                </FormField>

                <FormField
                  label="Preferred Markets"
                  name="preferredMarkets"
                  error={validationErrors.preferredMarkets}
                  required
                  helpText="Select the markets you're most interested in trading"
                >
                  <MultiSelect
                    id="preferredMarkets"
                    name="preferredMarkets"
                    value={profileData.preferredMarkets}
                    onChange={(value) => setProfileData({ ...profileData, preferredMarkets: value })}
                    options={PREFERRED_MARKETS}
                    maxSelections={10}
                    aria-describedby={validationErrors.preferredMarkets ? 'preferredMarkets-error' : 'preferredMarkets-help'}
                  />
                </FormField>

                <FormField
                  label="Investment Range"
                  name="investmentRange"
                  error={validationErrors.investmentRange}
                  required
                  helpText="This helps us recommend appropriate copy trading strategies"
                >
                  <Select
                    id="investmentRange"
                    name="investmentRange"
                    value={profileData.investmentRange}
                    onChange={(value) => setProfileData({ ...profileData, investmentRange: value })}
                    options={INVESTMENT_RANGE_OPTIONS}
                    placeholder="Select your investment range"
                    aria-describedby={validationErrors.investmentRange ? 'investmentRange-error' : 'investmentRange-help'}
                  />
                </FormField>

                <NavigationButtons
                  onBack={handleBack}
                  onNext={handleNext}
                  nextDisabled={isNextDisabled()}
                  nextLoading={saving}
                  className="mt-8"
                />
              </div>
            )}

            {/* Step 4: Connect Broker */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🔗</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Connect Your Broker
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Link your trading account to enable copy trading and portfolio tracking. 
                    We support major brokers through secure API connections.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Supported Brokers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">IB</span>
                      </div>
                      <span className="font-medium">Interactive Brokers</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">TD</span>
                      </div>
                      <span className="font-medium">TD Ameritrade</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">ET</span>
                      </div>
                      <span className="font-medium">E*TRADE</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">RH</span>
                      </div>
                      <span className="font-medium">Robinhood</span>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <button
                    onClick={() => router.push('/settings/broker-connect')}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Connect Broker Account
                  </button>
                  <p className="text-sm text-gray-500">
                    You can also connect your broker later from the settings page
                  </p>
                </div>

                <NavigationButtons
                  onBack={handleBack}
                  onNext={handleNext}
                  showSkip={true}
                  onSkip={handleNext}
                  skipText="Skip for now"
                  className="mt-8"
                />
              </div>
            )}

            {/* Step 5: Discover Traders */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">👥</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Discover Top Traders
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Follow successful traders that match your investment style and risk tolerance. 
                    We'll recommend traders based on your preferences.
                  </p>
                </div>

                {recommendedTraders.length === 0 && (
                  <div className="text-center">
                    <button
                      onClick={fetchRecommendedTraders}
                      disabled={tradersLoading}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tradersLoading ? 'Loading...' : 'Get Recommendations'}
                    </button>
                  </div>
                )}

                {recommendedTraders.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedTraders.slice(0, 4).map((trader: any) => (
                      <div key={trader.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {trader.name?.charAt(0) || 'T'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{trader.name}</h3>
                            <p className="text-sm text-gray-600">{trader.tradingExperience}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Return:</span>
                            <span className="ml-1 font-semibold text-green-600">
                              {trader.totalReturn ? `${trader.totalReturn}%` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Followers:</span>
                            <span className="ml-1 font-semibold">{trader.followerCount}</span>
                          </div>
                        </div>
                        <button className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                          Follow
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <NavigationButtons
                  onBack={handleBack}
                  onNext={handleNext}
                  showSkip={true}
                  onSkip={handleNext}
                  skipText="Skip for now"
                  className="mt-8"
                />
              </div>
            )}

            {/* Step 6: Setup Complete */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Setup Complete!
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Congratulations! You're all set up and ready to start your social trading journey. 
                    Explore the platform, discover traders, and begin copy trading.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl">📊</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Explore Dashboard</h3>
                    <p className="text-sm text-gray-600">View your portfolio and track performance</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl">🔍</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Discover Traders</h3>
                    <p className="text-sm text-gray-600">Find and follow top-performing traders</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl">📱</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Stay Updated</h3>
                    <p className="text-sm text-gray-600">Get notifications about trades and performance</p>
                  </div>
                </div>

                <NavigationButtons
                  onBack={handleBack}
                  onNext={completeOnboarding}
                  nextText="Go to Dashboard"
                  nextLoading={saving}
                  className="mt-8"
                />
              </div>
            )}
          </StepContent>
        </div>
      </div>
    </div>
  );
} 