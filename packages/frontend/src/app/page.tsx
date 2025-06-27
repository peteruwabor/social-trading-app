"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-4 py-24">
        <h1 className="text-5xl md:text-6xl font-extrabold text-indigo-800 mb-4 drop-shadow-lg">
          GIOAT Social Trading Platform
        </h1>
        <p className="text-lg md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
          Copy the best. Grow together. <br />
          <span className="text-indigo-600 font-semibold">Trade smarter</span> with real-time copy trading, social discovery, and advanced portfolio analytics.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Link href="/auth/signup" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow hover:bg-indigo-700 transition">
            Get Started
          </Link>
          <Link href="/auth/login" className="bg-white border border-indigo-600 text-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg shadow hover:bg-indigo-50 transition">
            Log In
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <span>|</span>
          <Link href="/discover" className="hover:underline">Discover Traders</Link>
          <span>|</span>
          <Link href="/portfolio" className="hover:underline">Portfolio</Link>
          <span>|</span>
          <Link href="/copy-trading" className="hover:underline">Copy Trading</Link>
          <span>|</span>
          <Link href="/onboarding" className="hover:underline">Onboarding</Link>
          <span>|</span>
          <Link href="/settings" className="hover:underline">Settings</Link>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-5xl mx-auto py-12 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">🔒</div>
          <h3 className="font-bold text-lg mb-1">Secure Authentication</h3>
          <p className="text-gray-600 text-center">Multi-factor authentication, JWT security, and privacy-first onboarding.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="font-bold text-lg mb-1">Portfolio Analytics</h3>
          <p className="text-gray-600 text-center">Real-time performance, risk metrics, and deep portfolio insights.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">🤝</div>
          <h3 className="font-bold text-lg mb-1">Copy Trading</h3>
          <p className="text-gray-600 text-center">Automate your trades by following top performers with advanced strategies.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">🌐</div>
          <h3 className="font-bold text-lg mb-1">Social Discovery</h3>
          <p className="text-gray-600 text-center">Find, follow, and learn from the best traders in the community.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">🔔</div>
          <h3 className="font-bold text-lg mb-1">Real-Time Notifications</h3>
          <p className="text-gray-600 text-center">Stay updated with instant alerts for trades, achievements, and more.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-4xl mb-2">🚀</div>
          <h3 className="font-bold text-lg mb-1">Seamless Onboarding</h3>
          <p className="text-gray-600 text-center">Get started in minutes with a guided, multi-step onboarding flow.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 text-sm mt-auto">
        &copy; {new Date().getFullYear()} GIOAT Social Trading Platform. All rights reserved.
      </footer>
    </main>
  );
} 