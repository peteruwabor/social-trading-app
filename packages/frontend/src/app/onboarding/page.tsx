'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, ChevronRightIcon, UserIcon, CogIcon, LinkIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
  const [currentStep, setCurrentStep] = useState(1);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    tradingExperience: '',
    riskTolerance: '',
    investmentGoals: [] as string[],
    preferredMarkets: [] as string[],
    investmentRange: ''
  });

  const [recommendedTraders, setRecommendedTraders] = useState([]);

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
      await apiClient.put('/api/onboarding/profile', profileData);
      fetchOnboardingProgress();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const fetchRecommendedTraders = async () => {
    try {
      const response = await apiClient.get('/api/onboarding/recommended-traders');
      setRecommendedTraders(response.data);
    } catch (error) {
      console.error('Error fetching recommended traders:', error);
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
      await updateStep(6);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!progress) return null;

  const stepIcons = {
    1: SparklesIcon,
    2: UserIcon,
    3: CogIcon,
    4: LinkIcon,
    5: UsersIcon,
    6: CheckCircleIcon
  };

  const StepIcon = stepIcons[currentStep as keyof typeof stepIcons] || SparklesIcon;

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
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {progress.totalSteps}</span>
            <span>{progress.progressPercentage}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <StepIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {progress.steps[currentStep - 1]?.title}
            </h1>
            <p className="text-lg text-gray-600">
              {progress.steps[currentStep - 1]?.description}
            </p>
          </div>

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 border border-gray-200 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <UsersIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Follow Top Traders</h3>
                    <p className="text-sm text-gray-600">Discover and follow successful traders to learn from their strategies</p>
                  </div>
                  <div className="p-6 border border-gray-200 rounded-xl">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <CogIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Auto Copy Trading</h3>
                    <p className="text-sm text-gray-600">Automatically copy trades from your favorite traders with customizable settings</p>
                  </div>
                  <div className="p-6 border border-gray-200 rounded-xl">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <SparklesIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Real-time Insights</h3>
                    <p className="text-sm text-gray-600">Get live market insights and performance analytics</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => updateStep(2)}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                >
                  <span>Get Started</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Profile */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trading Experience *
                </label>
                <select
                  value={profileData.tradingExperience}
                  onChange={(e) => setProfileData({ ...profileData, tradingExperience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select your experience level</option>
                  <option value="BEGINNER">Beginner (0-1 years)</option>
                  <option value="INTERMEDIATE">Intermediate (1-3 years)</option>
                  <option value="ADVANCED">Advanced (3-5 years)</option>
                  <option value="EXPERT">Expert (5+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio (Optional)
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tell us about yourself and your trading interests..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => updateStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    await updateProfile();
                    updateStep(3);
                  }}
                  disabled={!profileData.firstName || !profileData.lastName || !profileData.tradingExperience}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Trading Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Tolerance *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'].map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setProfileData({ ...profileData, riskTolerance: risk })}
                      className={`p-4 border rounded-lg text-center transition-colors ${
                        profileData.riskTolerance === risk
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold">{risk}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {risk === 'CONSERVATIVE' && 'Low risk, steady returns'}
                        {risk === 'MODERATE' && 'Balanced risk/reward'}
                        {risk === 'AGGRESSIVE' && 'High risk, high potential'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investment Goals *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Long-term Growth', 'Income Generation', 'Capital Preservation', 'Speculation', 'Learning', 'Diversification'].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => {
                        const goals = profileData.investmentGoals.includes(goal)
                          ? profileData.investmentGoals.filter(g => g !== goal)
                          : [...profileData.investmentGoals, goal];
                        setProfileData({ ...profileData, investmentGoals: goals });
                      }}
                      className={`p-3 border rounded-lg text-sm transition-colors ${
                        profileData.investmentGoals.includes(goal)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Markets
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Stocks', 'ETFs', 'Options', 'Crypto', 'Forex', 'Futures', 'Bonds', 'REITs'].map((market) => (
                    <button
                      key={market}
                      onClick={() => {
                        const markets = profileData.preferredMarkets.includes(market)
                          ? profileData.preferredMarkets.filter(m => m !== market)
                          : [...profileData.preferredMarkets, market];
                        setProfileData({ ...profileData, preferredMarkets: markets });
                      }}
                      className={`p-3 border rounded-lg text-sm transition-colors ${
                        profileData.preferredMarkets.includes(market)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {market}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => updateStep(2)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    await updateProfile();
                    updateStep(4);
                  }}
                  disabled={!profileData.riskTolerance || profileData.investmentGoals.length === 0}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Connect Broker */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Connect your brokerage account to enable copy trading and portfolio sync.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Alpaca', 'Interactive Brokers', 'TD Ameritrade', 'E*TRADE'].map((broker) => (
                  <div key={broker} className="p-6 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{broker}</h3>
                        <p className="text-sm text-gray-600">Connect via API</p>
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Don't see your broker? We're constantly adding new integrations.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => updateStep(3)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <div className="space-x-3">
                  <button
                    onClick={() => updateStep(5)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => updateStep(5)}
                    className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                  >
                    <span>Continue</span>
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Discover Traders */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Follow successful traders that match your investment style and risk tolerance.
                </p>
                <button
                  onClick={fetchRecommendedTraders}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Get Recommendations
                </button>
              </div>

              {recommendedTraders.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedTraders.slice(0, 4).map((trader: any) => (
                    <div key={trader.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
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
                      <button className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg hover:bg-indigo-200 transition-colors">
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => updateStep(4)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => updateStep(6)}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Complete */}
          {currentStep === 6 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  🎉 You're All Set!
                </h2>
                <p className="text-gray-600 mb-6">
                  Welcome to GIOAT! You're ready to start your social trading journey.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Explore Dashboard</h3>
                  <p className="text-sm text-blue-700">Check your portfolio and market insights</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Follow Traders</h3>
                  <p className="text-sm text-green-700">Discover and follow top performers</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">Start Trading</h3>
                  <p className="text-sm text-purple-700">Begin your copy trading journey</p>
                </div>
              </div>

              <button
                onClick={completeOnboarding}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-lg"
              >
                Enter Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 