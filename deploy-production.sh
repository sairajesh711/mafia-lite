#!/bin/bash

# Production Deployment Script for Mafia Game
# Project: mafia-game-prod-470720

set -e  # Exit on any error

PROJECT_ID="mafia-game-prod-470720"
REGION="europe-west1"
SERVICE_NAME="mafia-backend-prod"

echo "🚀 Starting production deployment for Mafia Game..."
echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"

# Set project
gcloud config set project $PROJECT_ID

# Pre-flight checks
echo "🔍 Running pre-flight checks..."

# Check if required APIs are enabled
echo "📡 Checking required APIs..."
REQUIRED_APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "redis.googleapis.com"
    "vpcaccess.googleapis.com"
    "compute.googleapis.com"
    "container.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo "❌ API $api is not enabled. Enabling..."
        gcloud services enable $api
    else
        echo "✅ API $api is enabled"
    fi
done

# Check if Redis instance exists
echo "🗄️ Checking Redis instance..."
if ! gcloud redis instances describe mafia-redis-eu --region=$REGION >/dev/null 2>&1; then
    echo "❌ Redis instance not found. Creating..."
    gcloud redis instances create mafia-redis-eu \
        --size=1 \
        --region=$REGION \
        --redis-version=redis_6_x \
        --enable-auth \
        --display-name="Mafia Game Redis Production"
        
    echo "⏳ Waiting for Redis to be ready (this takes 5-10 minutes)..."
    gcloud redis instances describe mafia-redis-eu --region=$REGION --format="value(state)"
else
    echo "✅ Redis instance exists"
fi

# Get Redis IP
REDIS_IP=$(gcloud redis instances describe mafia-redis-eu --region=$REGION --format="value(host)")
echo "📝 Redis IP: $REDIS_IP"

# Check if VPC connector exists
echo "🌐 Checking VPC connector..."
if ! gcloud compute networks vpc-access connectors describe mafia-connector-eu --region=$REGION >/dev/null 2>&1; then
    echo "❌ VPC connector not found. Creating..."
    gcloud compute networks vpc-access connectors create mafia-connector-eu \
        --region=$REGION \
        --subnet-project=$PROJECT_ID \
        --subnet=default \
        --min-instances=2 \
        --max-instances=10
else
    echo "✅ VPC connector exists"
fi

# Create service account if it doesn't exist
echo "🔐 Checking service account..."
SERVICE_ACCOUNT_EMAIL="mafia-backend@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL >/dev/null 2>&1; then
    echo "❌ Service account not found. Creating..."
    gcloud iam service-accounts create mafia-backend \
        --display-name="Mafia Backend Service Account" \
        --description="Service account for Mafia game backend"
        
    # Grant necessary permissions
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/redis.editor"
else
    echo "✅ Service account exists"
fi

# Build and deploy
echo "🏗️ Starting build and deployment..."
cd apps/backend

# Run production build
gcloud builds submit \
    --config=cloudbuild.prod.yaml \
    --substitutions=_REDIS_URL="redis://${REDIS_IP}:6379",_SERVICE_URL="https://${SERVICE_NAME}-$(echo $PROJECT_ID | tr '-' ' ' | awk '{print $3}')-ew.a.run.app" \
    ../..

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Production Summary:"
echo "   🌐 Backend URL: $SERVICE_URL"
echo "   🗄️ Redis IP: $REDIS_IP"
echo "   🔐 Service Account: $SERVICE_ACCOUNT_EMAIL"
echo ""
echo "🧪 Testing deployment..."
curl -f "$SERVICE_URL/health" && echo "✅ Health check passed" || echo "❌ Health check failed"

echo ""
echo "📝 Next Steps:"
echo "1. Update frontend environment variables with backend URL: $SERVICE_URL"
echo "2. Deploy frontend to Vercel"
echo "3. Update CORS settings in backend if needed"
echo "4. Set up monitoring and alerts"

echo ""
echo "🔗 Useful Commands:"
echo "   View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo "   Update service: gcloud run services update $SERVICE_NAME --region=$REGION"
echo "   Get service details: gcloud run services describe $SERVICE_NAME --region=$REGION"