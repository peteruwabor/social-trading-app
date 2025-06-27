'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface TraderProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  totalReturn?: number;
  winRate?: number;
  isVerified: boolean;
}

interface CopyStrategy {
  id: string;
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'KELLY_CRITERION' | 'MOMENTUM_BASED';
  parameters: Record<string, any>;
}

export default function CopyTradingSetupPage() {
  const { user, token, apiClient } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Select Trader
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<TraderProfile | null>(null);

  // Step 2: Select Strategy
  const [strategies, setStrategies] = useState<CopyStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<CopyStrategy | null>(null);

  // Step 3: Risk Settings
  const [copyAmount, setCopyAmount] = useState<number | null>(null);
  const [copyPercentage, setCopyPercentage] = useState<number | null>(null);
  const [maxRisk, setMaxRisk] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);

  // Step 4: Confirmation
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    if (step === 1) fetchTraders();
    if (step === 2 && selectedTrader) fetchStrategies();
  }, [user, token, step, selectedTrader]);

  const fetchTraders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/social/discover?limit=10&sortBy=return');
      setTraders(res.data.traders || []);
    } catch (e) {
      setTraders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/copy-trading/strategies?leaderId=${selectedTrader?.id}`);
      setStrategies(res.data.strategies || []);
    } catch (e) {
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/copy-trading/setup', {
        leaderId: selectedTrader?.id,
        strategyId: selectedStrategy?.id,
        copyAmount,
        copyPercentage,
        maxRisk,
        stopLoss,
      });
      setSuccess(true);
      setStep(5);
    } catch (e) {
      alert('Failed to setup copy trading. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step content rendering
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8">
        <h1 className="text-3xl font-bold text-indigo-800 mb-6 text-center">Copy Trading Setup Wizard</h1>
        <div className="flex justify-center mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`w-8 h-8 flex items-center justify-center rounded-full mx-1 text-lg font-bold ${step === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
          ))}
        </div>
        {loading && <LoadingSpinner size="md" />}
        {!loading && step === 1 && (
          <>
            <h2 className="text-xl font-semibold mb-4">1. Select a Trader to Copy</h2>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {traders.map((trader) => (
                <button
                  key={trader.id}
                  onClick={() => { setSelectedTrader(trader); setStep(2); }}
                  className={`flex items-center p-4 border rounded-lg shadow-sm hover:border-indigo-500 transition ${selectedTrader?.id === trader.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-semibold text-lg">{trader.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{trader.name}</div>
                    <div className="text-sm text-gray-500">Return: {trader.totalReturn?.toFixed(2) ?? 'N/A'}% | Win Rate: {trader.winRate?.toFixed(1) ?? 'N/A'}%</div>
                  </div>
                  {trader.isVerified && <span className="ml-2 text-blue-500 text-xs">✓ Verified</span>}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Link href="/discover" className="text-indigo-600 hover:underline">Browse All Traders</Link>
            </div>
          </>
        )}
        {!loading && step === 2 && selectedTrader && (
          <>
            <h2 className="text-xl font-semibold mb-4">2. Choose a Copy Trading Strategy</h2>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {strategies.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => { setSelectedStrategy(strategy); setStep(3); }}
                  className={`p-4 border rounded-lg shadow-sm hover:border-indigo-500 transition text-left ${selectedStrategy?.id === strategy.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className="font-semibold text-gray-900">{strategy.name}</div>
                  <div className="text-sm text-gray-500 mb-1">{strategy.description}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(strategy.parameters).map(([k, v]) => (
                      <span key={k} className="bg-gray-100 px-2 py-1 rounded">{k}: {v}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="text-gray-500 hover:underline">Back</button>
          </>
        )}
        {!loading && step === 3 && selectedStrategy && (
          <>
            <h2 className="text-xl font-semibold mb-4">3. Set Your Risk Parameters</h2>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {selectedStrategy.type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Copy Percentage (%)</label>
                  <input type="number" min={1} max={100} value={copyPercentage ?? ''} onChange={e => setCopyPercentage(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
                </div>
              )}
              {selectedStrategy.type === 'FIXED_AMOUNT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Copy Amount (USD)</label>
                  <input type="number" min={1} value={copyAmount ?? ''} onChange={e => setCopyAmount(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Max Risk per Trade (%)</label>
                <input type="number" min={1} max={100} value={maxRisk ?? ''} onChange={e => setMaxRisk(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stop Loss (%)</label>
                <input type="number" min={1} max={100} value={stopLoss ?? ''} onChange={e => setStopLoss(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-gray-500 hover:underline">Back</button>
              <button onClick={() => setStep(4)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">Review</button>
            </div>
          </>
        )}
        {!loading && step === 4 && (
          <>
            <h2 className="text-xl font-semibold mb-4">4. Review & Confirm</h2>
            <div className="mb-6">
              <div className="mb-2"><span className="font-medium">Trader:</span> {selectedTrader?.name}</div>
              <div className="mb-2"><span className="font-medium">Strategy:</span> {selectedStrategy?.name}</div>
              {selectedStrategy?.type === 'PERCENTAGE' && <div className="mb-2"><span className="font-medium">Copy Percentage:</span> {copyPercentage}%</div>}
              {selectedStrategy?.type === 'FIXED_AMOUNT' && <div className="mb-2"><span className="font-medium">Copy Amount:</span> ${copyAmount}</div>}
              <div className="mb-2"><span className="font-medium">Max Risk:</span> {maxRisk}%</div>
              <div className="mb-2"><span className="font-medium">Stop Loss:</span> {stopLoss}%</div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="text-gray-500 hover:underline">Back</button>
              <button onClick={handleSetup} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">Confirm & Start Copying</button>
            </div>
          </>
        )}
        {!loading && step === 5 && success && (
          <div className="text-center py-12">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Copy Trading Setup Complete!</h3>
            <p className="text-gray-600 mb-4">You are now copying {selectedTrader?.name} with the {selectedStrategy?.name} strategy.</p>
            <div className="flex flex-col gap-2 items-center">
              <Link href="/copy-trading" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Manage Copy Trading</Link>
              <Link href="/portfolio" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">View Portfolio</Link>
              <Link href="/discover" className="text-indigo-600 hover:underline">Discover More Traders</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 