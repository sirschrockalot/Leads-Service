#!/bin/bash

echo "🚀 Starting Leads Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "env.development" ]; then
    echo "⚠️  env.development file not found. Creating from example..."
    cp .env.example env.development
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Start the service
echo "🌟 Starting Leads Service on port 3002..."
echo "📚 API Documentation: http://localhost:3002/api/docs"
echo "🔍 Health Check: http://localhost:3002/api/v1/health"

npm start
