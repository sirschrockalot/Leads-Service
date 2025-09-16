#!/bin/bash

echo "🧪 Testing Leads Service..."

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Test health endpoint
echo "🔍 Testing health endpoint..."
curl -f http://localhost:3002/api/v1/health || {
    echo "❌ Health check failed"
    exit 1
}

echo "✅ Health check passed"

# Test API documentation
echo "📚 Testing API documentation..."
curl -f http://localhost:3002/api/docs || {
    echo "❌ API documentation not accessible"
    exit 1
}

echo "✅ API documentation accessible"

echo "🎉 Leads Service is running successfully!"
echo "📚 API Documentation: http://localhost:3002/api/docs"
echo "🔍 Health Check: http://localhost:3002/api/v1/health"
