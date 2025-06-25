#!/bin/bash

# Simple start script for Railway
echo "🚀 Starting GIOAT Social Trading Platform..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
cd packages/api
npx prisma generate

# Start the application
echo "🌟 Starting application..."
npm start 