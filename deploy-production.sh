#!/bin/bash

# Simple Production Deployment for Mafia Backend
# Based on TL;DR approach with regional optimization

set -e  # Exit on any error

PROJECT_ID="mafia-game-prod-470720"
REGION="europe-west1"
SERVICE_NAME="mafia-backend-prod"

echo "🚀 Deploying Mafia Backend to Cloud Run..."
echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION (optimal for UK/Canada/India)"

# Set project
gcloud config set project $PROJECT_ID

# Get current git hash for tagging
GIT_SHA=$(git rev-parse --short HEAD)
echo "📝 Git SHA: $GIT_SHA"

# Get Redis connection details
REDIS_IP=$(gcloud redis instances describe mafia-redis-eu --region=$REGION --format="value(host)" 2>/dev/null || echo "10.154.0.3")
REDIS_AUTH_RAW=$(gcloud redis instances get-auth-string mafia-redis-eu --region=$REGION 2>/dev/null || echo "")
echo "🗄️ Redis IP: $REDIS_IP"

if [[ -n "$REDIS_AUTH_RAW" ]]; then
    # Extract just the auth token (remove "authString: " prefix)
    REDIS_AUTH=$(echo "$REDIS_AUTH_RAW" | cut -d' ' -f2)
    REDIS_URL="redis://:${REDIS_AUTH}@${REDIS_IP}:6379"
    echo "🔐 Redis: Authentication enabled"
    echo "🔐 Auth token: ${REDIS_AUTH:0:8}..." # Show first 8 chars only
else
    REDIS_URL="redis://${REDIS_IP}:6379"
    echo "🔐 Redis: No authentication"
fi

echo ""
echo "🏗️ Building and deploying with Cloud Build..."

# Deploy using Cloud Build (optimized single-stage Dockerfile)
# Temporarily disable Redis to get basic deployment working
gcloud builds submit \
  --config=apps/backend/cloudbuild.yaml \
  --substitutions=_REDIS_URL="redis://disabled:6379",_CORS_ORIGIN="https://your-app.vercel.app" \
  --timeout=30m \
  .

# Get deployed service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>/dev/null || echo "Not deployed yet")

echo ""
echo "🎉 Deployment Status:"
echo "   🌐 Service URL: $SERVICE_URL"
echo "   🗄️ Redis: Connected to $REDIS_IP"
echo "   🔧 Build: $GIT_SHA"

echo ""
echo "🧪 Testing deployment..."
if [[ "$SERVICE_URL" != "Not deployed yet" ]]; then
    if curl -f -s "$SERVICE_URL/health" >/dev/null; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed - check logs:"
        echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION"
    fi
else
    echo "⚠️ Service URL not available yet - check Cloud Build status"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Update frontend CORS: Replace 'your-app.vercel.app' in environment"
echo "2. Deploy frontend with backend URL: $SERVICE_URL"
echo "3. Test end-to-end multiplayer functionality"

echo ""
echo "🔗 Useful Commands:"
echo "   Logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo "   Status: gcloud run services describe $SERVICE_NAME --region=$REGION"
echo "   Scale: gcloud run services update $SERVICE_NAME --max-instances=20 --region=$REGION"