export interface OnboardingValidationErrors {
  firstName?: string;
  lastName?: string;
  tradingExperience?: string;
  riskTolerance?: string;
  investmentGoals?: string;
  preferredMarkets?: string;
  investmentRange?: string;
  bio?: string;
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  tradingExperience: string;
  riskTolerance: string;
  investmentGoals: string[];
  preferredMarkets: string[];
  investmentRange: string;
}

export const validateProfileStep = (data: Partial<ProfileData>): OnboardingValidationErrors => {
  const errors: OnboardingValidationErrors = {};

  // First Name validation
  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  } else if (data.firstName.trim().length > 50) {
    errors.firstName = 'First name must be less than 50 characters';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.firstName.trim())) {
    errors.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Last Name validation
  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  } else if (data.lastName.trim().length > 50) {
    errors.lastName = 'Last name must be less than 50 characters';
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.lastName.trim())) {
    errors.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Trading Experience validation
  if (!data.tradingExperience) {
    errors.tradingExperience = 'Please select your trading experience level';
  }

  // Bio validation (optional but with length limits)
  if (data.bio && data.bio.length > 500) {
    errors.bio = 'Bio must be less than 500 characters';
  }

  return errors;
};

export const validatePreferencesStep = (data: Partial<ProfileData>): OnboardingValidationErrors => {
  const errors: OnboardingValidationErrors = {};

  // Risk Tolerance validation
  if (!data.riskTolerance) {
    errors.riskTolerance = 'Please select your risk tolerance level';
  }

  // Investment Goals validation
  if (!data.investmentGoals || data.investmentGoals.length === 0) {
    errors.investmentGoals = 'Please select at least one investment goal';
  } else if (data.investmentGoals.length > 5) {
    errors.investmentGoals = 'You can select up to 5 investment goals';
  }

  // Preferred Markets validation
  if (!data.preferredMarkets || data.preferredMarkets.length === 0) {
    errors.preferredMarkets = 'Please select at least one preferred market';
  } else if (data.preferredMarkets.length > 10) {
    errors.preferredMarkets = 'You can select up to 10 preferred markets';
  }

  // Investment Range validation
  if (!data.investmentRange) {
    errors.investmentRange = 'Please select your investment range';
  }

  return errors;
};

export const isProfileStepValid = (data: Partial<ProfileData>): boolean => {
  const errors = validateProfileStep(data);
  return Object.keys(errors).length === 0;
};

export const isPreferencesStepValid = (data: Partial<ProfileData>): boolean => {
  const errors = validatePreferencesStep(data);
  return Object.keys(errors).length === 0;
};

export const getStepValidationStatus = (step: number, data: Partial<ProfileData>): boolean => {
  switch (step) {
    case 2: // Profile step
      return isProfileStepValid(data);
    case 3: // Preferences step
      return isPreferencesStepValid(data);
    case 4: // Broker connection (handled separately)
      return true; // This is handled by the broker connection flow
    case 5: // Discover traders (optional)
      return true;
    default:
      return true;
  }
};

export const TRADING_EXPERIENCE_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner (0-1 years)', description: 'New to trading, learning the basics' },
  { value: 'INTERMEDIATE', label: 'Intermediate (1-3 years)', description: 'Some experience, comfortable with basic strategies' },
  { value: 'ADVANCED', label: 'Advanced (3-5 years)', description: 'Experienced trader, using complex strategies' },
  { value: 'EXPERT', label: 'Expert (5+ years)', description: 'Professional trader with extensive experience' }
];

export const RISK_TOLERANCE_OPTIONS = [
  { 
    value: 'CONSERVATIVE', 
    label: 'Conservative', 
    description: 'Low risk, steady returns',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  { 
    value: 'MODERATE', 
    label: 'Moderate', 
    description: 'Balanced risk/reward',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  { 
    value: 'AGGRESSIVE', 
    label: 'Aggressive', 
    description: 'High risk, high potential',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
];

export const INVESTMENT_GOALS = [
  'Capital Preservation',
  'Income Generation',
  'Capital Growth',
  'Retirement Planning',
  'Tax Optimization',
  'Diversification',
  'Short-term Trading',
  'Long-term Investing'
];

export const PREFERRED_MARKETS = [
  'US Stocks',
  'International Stocks',
  'Bonds',
  'Commodities',
  'Cryptocurrency',
  'Forex',
  'Options',
  'Futures',
  'ETFs',
  'Real Estate'
];

export const INVESTMENT_RANGE_OPTIONS = [
  { value: 'UNDER_1K', label: 'Under $1,000' },
  { value: 'ONE_TO_10K', label: '$1,000 - $10,000' },
  { value: 'TEN_TO_50K', label: '$10,000 - $50,000' },
  { value: 'FIFTY_TO_100K', label: '$50,000 - $100,000' },
  { value: 'OVER_100K', label: 'Over $100,000' }
]; 