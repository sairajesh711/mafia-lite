#!/bin/bash

# Update CORS after getting Vercel URL
echo "🔄 Updating CORS configuration..."

echo "📝 Manual step required:"
echo "1. Note your Vercel URL from the previous deployment"
echo "2. Update apps/backend/src/index.ts:"
echo "   Replace 'your-app-name.vercel.app' with your actual Vercel domain"
echo "3. Run this script again to redeploy backend"

read -p "Have you updated the CORS URLs in src/index.ts? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Redeploying backend with updated CORS..."
    
    cd apps/backend
    REDIS_IP=$(gcloud redis instances describe mafia-redis-eu --region=europe-west1 --format="value(host)" --project=mafia-game-prod-470720)
    
    gcloud builds submit \
      --config=cloudbuild-europe.yaml \
      --substitutions=_REDIS_URL="redis://${REDIS_IP}:6379" \
      --project=mafia-game-prod-470720 \
      ../..
      
    echo "✅ CORS updated! Your game should now work across all regions."
else
    echo "⚠️  Please update the CORS configuration first"
fi