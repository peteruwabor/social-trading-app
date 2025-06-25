#!/bin/bash

# Vercel build script for GIOAT API
echo "🚀 Building GIOAT API for Vercel..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Vercel build completed successfully!" 