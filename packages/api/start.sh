#!/bin/bash

# GIOAT Platform Startup Script for Managed Platforms

echo "🚀 Starting GIOAT Social Trading Platform..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "🌟 Starting application..."
npm start 