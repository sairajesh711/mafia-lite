# 🚀 Complete Deployment Guide
*Deploy your Mafia game to production in 15 minutes*

## 📋 Prerequisites

### **Required Tools**
```bash
# 1. Google Cloud CLI
# Download: https://cloud.google.com/sdk/docs/install
gcloud --version

# 2. Vercel CLI  
npm install -g vercel
vercel --version

# 3. Basic tools
curl --version  # For testing
git --version   # For version control
```

### **Required Accounts**
- **Google Cloud Platform** (with billing enabled)
- **Vercel** (free tier is sufficient)

---

## 🎯 Quick Deployment (15 minutes)

### **Step 1: Setup Google Cloud (5 minutes)**

```bash
# Login and set project
gcloud auth login
gcloud config set project mafia-game-prod-470720

# Run the automated production deployment
chmod +x deploy-production.sh
./deploy-production.sh
```

✅ **Result**: Backend deployed to Cloud Run with Redis and monitoring

### **Step 2: Deploy Frontend (3 minutes)**

```bash
# Get your backend URL (from Step 1 output)
BACKEND_URL="https://mafia-backend-prod-xxxxx-ew.a.run.app"

# Update frontend environment
cd apps/frontend
echo "VITE_SERVER_URL=$BACKEND_URL" > .env.production

# Deploy to Vercel
vercel login  # First time only
vercel --prod
```

✅ **Result**: Frontend deployed globally with CDN

### **Step 3: Test Your Game (2 minutes)**

```bash
# Test backend
curl "$BACKEND_URL/health"

# Open your game (use URL from Vercel deployment)
# https://your-app-xxxxx.vercel.app
```

✅ **Result**: Fully functional multiplayer Mafia game

---

## 📖 Detailed Deployment Guide

### **Backend Deployment (Google Cloud)**

#### **1. Project Setup**
```bash
# Create or use existing project
PROJECT_ID="mafia-game-prod-470720"
gcloud config set project $PROJECT_ID

# Enable required services
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com
```

#### **2. Infrastructure Creation**
```bash
# Create Redis instance (takes 5-10 minutes)
gcloud redis instances create mafia-redis-eu \
  --size=1 \
  --region=europe-west1 \
  --redis-version=redis_6_x \
  --enable-auth

# Create VPC connector for Redis access
gcloud compute networks vpc-access connectors create mafia-connector-eu \
  --region=europe-west1 \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10

# Create service account
gcloud iam service-accounts create mafia-backend \
  --display-name="Mafia Backend Service Account"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:mafia-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/redis.editor"
```

#### **3. Application Deployment**
```bash
# Get Redis IP
REDIS_IP=$(gcloud redis instances describe mafia-redis-eu --region=europe-west1 --format="value(host)")

# Deploy application
cd apps/backend
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REDIS_URL="redis://$REDIS_IP:6379" \
  ../..

# Get deployed URL
BACKEND_URL=$(gcloud run services describe mafia-backend-prod --region=europe-west1 --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"
```

#### **4. Verify Backend**
```bash
# Health check
curl "$BACKEND_URL/health"
# Expected: {"status":"ok","timestamp":...,"protocolVersion":1}

# WebSocket test (optional)
wscat -c "${BACKEND_URL/https/wss}/socket.io/?EIO=4&transport=websocket"
```

---

### **Frontend Deployment (Vercel)**

#### **1. Environment Configuration**
```bash
cd apps/frontend

# Create production environment file
cat > .env.production << EOF
VITE_SERVER_URL=$BACKEND_URL
VITE_APP_ENV=production
EOF
```

#### **2. Deploy to Vercel**
```bash
# Login (first time only)
vercel login

# Deploy production build
vercel --prod

# Note the deployment URL from output
# Example: https://mafia-game-frontend-xxxxx.vercel.app
```

#### **3. Update Backend CORS**
```bash
# Edit apps/backend/src/index.ts
# Update CORS origins with your actual Vercel URL:
# 'https://your-actual-app.vercel.app'

# Redeploy backend with updated CORS
cd apps/backend
gcloud builds submit --config=cloudbuild.yaml ../..
```

#### **4. Verify Frontend**
```bash
# Open your deployed app
FRONTEND_URL="https://your-app-xxxxx.vercel.app"
echo "Frontend URL: $FRONTEND_URL"

# Test full flow:
# 1. Open $FRONTEND_URL in Chrome
# 2. Click "HOST NEW GAME" → Enter name → Create room
# 3. Open $FRONTEND_URL in Firefox (or incognito)
# 4. Click "JOIN GAME" → Enter room code → Join successfully
```

---

## 🌍 Architecture Overview

```
Users (UK/Canada/India)
         ↓
   Vercel CDN (Global)
         ↓  
 Cloud Run (Europe-West1)
         ↓
  Redis Memory Store
```

### **Performance Expectations**
- **UK**: 20-40ms latency ⭐⭐⭐
- **Canada**: 80-120ms latency ⭐⭐  
- **India**: 120-180ms latency ⭐
- **Uptime**: 99.9%+
- **Concurrent Games**: 100+

---

## 🔧 Configuration Files

### **Backend Files**
```
apps/backend/
├── Dockerfile              # Production multi-stage build
├── cloudbuild.yaml         # Google Cloud Build configuration
├── monitoring.yaml         # Production monitoring setup
├── .env.production.example # Environment variables template
└── .dockerignore.prod     # Docker ignore rules
```

### **Frontend Files**
```
apps/frontend/
├── vercel.json         # Vercel deployment configuration
└── .env.production     # Production environment variables
```

### **Deployment Scripts**
```
./deploy-production.sh    # One-command production deployment
```

---

## 💰 Cost Breakdown

| Service | Monthly Cost | Usage |
|---------|-------------|--------|
| **Cloud Run** | $15-30 | 1GB RAM, auto-scaling |
| **Redis** | $25 | 1GB memory store |
| **VPC Connector** | $3 | Always-on connector |
| **Other** | $5 | Logging, monitoring, storage |
| **Total** | **$48-63** | Moderate usage |

### **Cost Optimization**
- **Off-peak**: Set min-instances=0 to reduce Cloud Run costs
- **Monitoring**: Set budget alerts at $60/month
- **Scaling**: Increase max-instances during peak times only

---

## 🚨 Troubleshooting

### **Common Issues**

| Issue | Solution |
|-------|----------|
| **Build fails** | Check Docker context, ensure all packages built |
| **Redis connection fails** | Verify VPC connector configuration |
| **CORS errors** | Update backend CORS with actual Vercel URL |
| **WebSocket fails** | Check Cloud Run allows WebSocket (default: yes) |
| **High latency** | Consider multi-region deployment |

### **Debug Commands**
```bash
# Backend logs
gcloud run services logs tail mafia-backend-prod --region=europe-west1

# Redis status
gcloud redis instances describe mafia-redis-eu --region=europe-west1

# Service status
gcloud run services describe mafia-backend-prod --region=europe-west1

# Frontend build logs
vercel logs https://your-app-xxxxx.vercel.app
```

---

## 🎮 Testing Your Deployment

### **Multi-Player Test**
1. **Host Player** (Chrome): Visit frontend → Host game → Share room code
2. **Player 2** (Firefox): Visit frontend → Join with code  
3. **Player 3** (Mobile): Visit frontend → Join with code
4. **Verify**: All players see each other in lobby

### **Performance Test**
```bash
# Load test health endpoint
ab -n 1000 -c 10 "$BACKEND_URL/health"

# WebSocket connection test
npm install -g wscat
wscat -c "${BACKEND_URL/https/wss}/socket.io/?EIO=4&transport=websocket"
```

---

## 📈 Monitoring & Maintenance

### **Key Metrics**
- **Uptime**: > 99.9%
- **Response Time**: P95 < 500ms
- **Error Rate**: < 1%
- **Memory Usage**: < 80%

### **Regular Tasks**
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches  
- **Quarterly**: Review costs and optimize resources

---

## 🎯 Success!

Your Mafia game is now deployed with:
✅ **Enterprise-grade security and reliability**  
✅ **Global CDN for fast loading worldwide**  
✅ **Auto-scaling backend handling 100+ concurrent games**  
✅ **Production monitoring and alerting**  
✅ **Sub-$65/month operating costs**

**Share your game URL with friends around the world and start playing!** 🎉

---

*Need help? Check `DEPLOYMENT.md` for detailed production operations guide.*