#!/bin/bash

# Simple build script for Railway deployment
echo "🚀 Building GIOAT Social Trading Platform..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the API
echo "🔨 Building API..."
cd packages/api
npm install
npm run build

echo "✅ Build completed successfully!" 