#!/bin/bash

# Render build script for GIOAT API
echo "🚀 Building GIOAT API for Render..."

# Clean any existing node_modules
echo "🧹 Cleaning existing node_modules..."
rm -rf node_modules
rm -rf package-lock.json

# Install dependencies with production flag
echo "📦 Installing production dependencies..."
npm ci --only=production

# Rebuild native dependencies for Linux platform
echo "🔨 Rebuilding native dependencies..."
npm rebuild

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma db push --accept-data-loss

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Render build completed successfully!" 