"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  CreditCard, 
  Key, 
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  handle?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  mfaEnabled: boolean;
  status: string;
  kycStatus: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PrivacySettings {
  profileVisibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
  showPortfolio: boolean;
  showTrades: boolean;
  allowCopyTrading: boolean;
  allowTips: boolean;
}

interface NotificationSettings {
  tradeAlerts: boolean;
  copyExecuted: boolean;
  liveSessions: boolean;
  system: boolean;
  promotional: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface PersonalizationSettings {
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
}

type SettingsTab = 'profile' | 'privacy' | 'notifications' | 'personalization' | 'account';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'personalization', label: 'Personalization', icon: Palette },
  { id: 'account', label: 'Account', icon: CreditCard },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    handle: '',
    firstName: '',
    lastName: '',
    bio: '',
    avatarUrl: '',
  });

  // Privacy state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'PUBLIC',
    showPortfolio: true,
    showTrades: true,
    allowCopyTrading: true,
    allowTips: true,
  });

  // Notification state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    tradeAlerts: true,
    copyExecuted: true,
    liveSessions: true,
    system: true,
    promotional: false,
    email: true,
    push: true,
    sms: false,
  });

  // Personalization state
  const [personalizationSettings, setPersonalizationSettings] = useState<PersonalizationSettings>({
    theme: 'AUTO',
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: '1,234.56',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [profileData, privacyData, notificationData, personalizationData] = await Promise.all([
        apiClient.get('/user/profile'),
        apiClient.get('/user/privacy'),
        apiClient.get('/user/notifications'),
        apiClient.get('/user/personalization'),
      ]);

      setProfile(profileData.data);
      setProfileForm({
        handle: profileData.data.handle || '',
        firstName: profileData.data.firstName || '',
        lastName: profileData.data.lastName || '',
        bio: profileData.data.bio || '',
        avatarUrl: profileData.data.avatarUrl || '',
      });

      setPrivacySettings(privacyData.data);
      setNotificationSettings(notificationData.data);
      setPersonalizationSettings(personalizationData.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      await apiClient.put('/user/profile', profileForm);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const savePrivacy = async () => {
    try {
      setSaving(true);
      await apiClient.put('/user/privacy', privacySettings);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setSaving(true);
      await apiClient.put('/user/notifications', notificationSettings);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const savePersonalization = async () => {
    try {
      setSaving(true);
      await apiClient.put('/user/personalization', personalizationSettings);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save personalization settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings, privacy, and preferences
          </p>
        </div>

        {/* Save Success Toast */}
        <AnimatePresence>
          {showSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center"
            >
              <Check className="w-5 h-5 mr-2" />
              Settings saved successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'profile' && (
                  <ProfileTab
                    profile={profile}
                    form={profileForm}
                    setForm={setProfileForm}
                    onSave={saveProfile}
                    saving={saving}
                  />
                )}
                {activeTab === 'privacy' && (
                  <PrivacyTab
                    settings={privacySettings}
                    setSettings={setPrivacySettings}
                    onSave={savePrivacy}
                    saving={saving}
                  />
                )}
                {activeTab === 'notifications' && (
                  <NotificationsTab
                    settings={notificationSettings}
                    setSettings={setNotificationSettings}
                    onSave={saveNotifications}
                    saving={saving}
                  />
                )}
                {activeTab === 'personalization' && (
                  <PersonalizationTab
                    settings={personalizationSettings}
                    setSettings={setPersonalizationSettings}
                    onSave={savePersonalization}
                    saving={saving}
                  />
                )}
                {activeTab === 'account' && (
                  <AccountTab profile={profile} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ 
  profile, 
  form, 
  setForm, 
  onSave, 
  saving 
}: {
  profile: UserProfile | null;
  form: any;
  setForm: (form: any) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-500">
          Update your personal information and profile details
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Handle</label>
          <input
            type="text"
            value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="@username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Avatar URL</label>
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Privacy Tab Component
function PrivacyTab({ 
  settings, 
  setSettings, 
  onSave, 
  saving 
}: {
  settings: PrivacySettings;
  setSettings: (settings: PrivacySettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Control who can see your profile and trading information
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Profile Visibility</label>
          <select
            value={settings.profileVisibility}
            onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value as any })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="PUBLIC">Public - Anyone can see your profile</option>
            <option value="FOLLOWERS_ONLY">Followers Only - Only your followers can see your profile</option>
            <option value="PRIVATE">Private - Only you can see your profile</option>
          </select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Show Portfolio</h4>
              <p className="text-sm text-gray-500">Allow others to see your portfolio holdings</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, showPortfolio: !settings.showPortfolio })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showPortfolio ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showPortfolio ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Show Trades</h4>
              <p className="text-sm text-gray-500">Allow others to see your trading activity</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, showTrades: !settings.showTrades })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showTrades ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showTrades ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Allow Copy Trading</h4>
              <p className="text-sm text-gray-500">Allow others to copy your trades</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, allowCopyTrading: !settings.allowCopyTrading })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowCopyTrading ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowCopyTrading ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Allow Tips</h4>
              <p className="text-sm text-gray-500">Allow others to send you tips</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, allowTips: !settings.allowTips })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowTips ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowTips ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab({ 
  settings, 
  setSettings, 
  onSave, 
  saving 
}: {
  settings: NotificationSettings;
  setSettings: (settings: NotificationSettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose what notifications you want to receive and how
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Notification Types</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Trade Alerts</h5>
                <p className="text-sm text-gray-500">When your trades are executed</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, tradeAlerts: !settings.tradeAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.tradeAlerts ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.tradeAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Copy Trade Executed</h5>
                <p className="text-sm text-gray-500">When your copy trades are executed</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, copyExecuted: !settings.copyExecuted })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.copyExecuted ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.copyExecuted ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Live Sessions</h5>
                <p className="text-sm text-gray-500">When traders you follow start live sessions</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, liveSessions: !settings.liveSessions })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.liveSessions ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.liveSessions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">System Notifications</h5>
                <p className="text-sm text-gray-500">Important system updates and maintenance</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, system: !settings.system })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.system ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.system ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Promotional</h5>
                <p className="text-sm text-gray-500">Marketing and promotional content</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, promotional: !settings.promotional })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.promotional ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.promotional ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Delivery Methods</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Email</h5>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, email: !settings.email })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.email ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.email ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Push Notifications</h5>
                <p className="text-sm text-gray-500">Receive notifications in your browser</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, push: !settings.push })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.push ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.push ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">SMS</h5>
                <p className="text-sm text-gray-500">Receive notifications via text message</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, sms: !settings.sms })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.sms ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sms ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Personalization Tab Component
function PersonalizationTab({ 
  settings, 
  setSettings, 
  onSave, 
  saving 
}: {
  settings: PersonalizationSettings;
  setSettings: (settings: PersonalizationSettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Personalization</h3>
        <p className="mt-1 text-sm text-gray-500">
          Customize your experience with themes, language, and display preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="LIGHT">Light</option>
            <option value="DARK">Dark</option>
            <option value="AUTO">Auto (System)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Language</label>
          <select
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="zh">Chinese</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD (C$)</option>
            <option value="AUD">AUD (A$)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date Format</label>
          <select
            value={settings.dateFormat}
            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM-DD-YYYY">MM-DD-YYYY</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Number Format</label>
          <select
            value={settings.numberFormat}
            onChange={(e) => setSettings({ ...settings, numberFormat: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="1,234.56">1,234.56 (US)</option>
            <option value="1.234,56">1.234,56 (EU)</option>
            <option value="1 234.56">1 234.56 (Space)</option>
            <option value="1234.56">1234.56 (No separator)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Account Tab Component
function AccountTab({ profile }: { profile: UserProfile | null }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Account Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and security
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Account Information</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-sm text-gray-500">Account Status</span>
              <p className="text-sm font-medium text-gray-900">{profile.status}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">KYC Status</span>
              <p className="text-sm font-medium text-gray-900">{profile.kycStatus}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Subscription Tier</span>
              <p className="text-sm font-medium text-gray-900">{profile.subscriptionTier}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Member Since</span>
              <p className="text-sm font-medium text-gray-900">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Security</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h5>
                <p className="text-sm text-gray-500">
                  {profile.mfaEnabled ? 'Enabled' : 'Not enabled'} - Add an extra layer of security
                </p>
              </div>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                {profile.mfaEnabled ? 'Manage' : 'Enable'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Change Password</h5>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                Change
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900">API Keys</h5>
                <p className="text-sm text-gray-500">Manage your API keys for trading</p>
              </div>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <h4 className="text-sm font-medium text-red-900 mb-3">Danger Zone</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-red-900">Delete Account</h5>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 