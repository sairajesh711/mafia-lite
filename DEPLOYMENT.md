# 🚀 Step-by-Step Deployment Guide
*Deploy your Mafia game to production in 20 minutes*

## 📋 Prerequisites (5 minutes)

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

## 🎯 Quick Deployment (20 minutes)

### **Step 1: Backend Deployment (Google Cloud) - 12 minutes**

#### **1.1 Setup Google Cloud (2 minutes)**
```bash
# Login and set project
gcloud auth login
gcloud config set project mafia-game-prod-470720
```

#### **1.2 Automated Infrastructure & Deployment (10 minutes)**
```bash
# Run the automated production deployment
chmod +x deploy-production.sh
./deploy-production.sh
```

**What this script does:**
- ✅ Enables required Google Cloud APIs
- ✅ Creates Redis Memory Store (1GB, Europe-West1)
- ✅ Creates VPC connector for Redis access
- ✅ Sets up service account with minimal permissions
- ✅ Builds production Docker image with security scanning
- ✅ Deploys to Cloud Run with auto-scaling
- ✅ Runs health checks to verify deployment

**Expected output:**
```
🎉 Deployment completed successfully!

📋 Production Summary:
   🌐 Backend URL: https://mafia-backend-prod-xxxxx-ew.a.run.app
   🗄️ Redis IP: 10.154.0.3
   🔐 Service Account: mafia-backend@mafia-game-prod-470720.iam.gserviceaccount.com

🧪 Testing deployment...
✅ Health check passed
```

---

### **Step 2: Frontend Deployment (Vercel) - 5 minutes**

#### **2.1 Configure Environment Variables (1 minute)**
```bash
# Get your backend URL from Step 1 output
BACKEND_URL="https://mafia-backend-prod-xxxxx-ew.a.run.app"

# Update frontend environment
cd apps/frontend
echo "VITE_SERVER_URL=$BACKEND_URL" > .env.production
echo "VITE_APP_ENV=production" >> .env.production
```

#### **2.2 Deploy to Vercel (3 minutes)**
```bash
# Login (first time only)
vercel login

# Deploy production build
vercel --prod
```

**Expected output:**
```
✅ Production: https://mafia-game-xxxxx.vercel.app [2s]
📝 Deployed to production. Run `vercel --prod` to overwrite later.
```

#### **2.3 Update Backend CORS (1 minute)**
```bash
# Note your Vercel URL from above, then run:
chmod +x update-cors.sh
./update-cors.sh
```

---

### **Step 3: Test Your Game (3 minutes)**

#### **3.1 Backend Health Check**
```bash
curl "$BACKEND_URL/health"
# Expected: {"status":"ok","timestamp":...,"protocolVersion":1}
```

#### **3.2 Multi-Player Test**
1. **Host Player** (Chrome): Visit `https://your-app-xxxxx.vercel.app`
   - Click "HOST NEW GAME" → Enter name → Create room
   - Note the room code (e.g., "FIRE")

2. **Player 2** (Firefox/Incognito): Visit same URL
   - Click "JOIN GAME" → Enter room code → Join successfully
   - Verify both players see each other in lobby

3. **Player 3** (Mobile): Visit same URL
   - Join with same room code
   - Start game with 3+ players

**✅ Success criteria:**
- All players see each other in lobby
- Game starts successfully with role assignments
- Real-time updates work across all devices
- No WebSocket connection errors

---

## 🌍 Production Architecture

```
Users (UK/Canada/India)
         ↓ HTTPS/WSS
   Vercel CDN (Global)
    50+ edge locations
         ↓ API calls  
 Cloud Run (Europe-West1)
  Auto-scaling 1-10 instances
         ↓ VPC connector
  Redis Memory Store (1GB)
   Sub-millisecond latency
```

### **Performance Expectations**
- **UK**: 20-40ms latency ⭐⭐⭐⭐⭐
- **Europe**: 10-30ms latency ⭐⭐⭐⭐⭐  
- **Canada**: 80-120ms latency ⭐⭐⭐
- **India**: 120-180ms latency ⭐⭐
- **Uptime**: 99.9%+
- **Concurrent Games**: 100+

---

## 🔧 Configuration Details

### **Backend Configuration**
- **Memory**: 1GB (handles 1000+ concurrent connections)
- **CPU**: 1 vCPU (sufficient for game logic)
- **Scaling**: 1 min instance (warm), 10 max instances
- **Region**: Europe-West1 (optimal for UK/Canada/India)
- **Security**: Non-root container, vulnerability scanning
- **Networking**: VPC connector for secure Redis access

### **Frontend Configuration**  
- **Framework**: Vite + React
- **CDN**: Vercel global edge network
- **Caching**: Static assets cached for 1 year
- **SSL**: Automatic HTTPS with custom domains
- **Build**: Optimized production bundle

### **Redis Configuration**
- **Size**: 1GB memory store
- **Version**: Redis 6.x
- **Auth**: Enabled for security
- **Network**: VPC-only access
- **Region**: Europe-West1

---

## 💰 Cost Breakdown

| Service | Monthly Cost | Usage |
|---------|-------------|-------|
| **Cloud Run** | $15-30 | 1GB RAM, auto-scaling |
| **Redis** | $25 | 1GB memory store |
| **VPC Connector** | $3 | Always-on connector |
| **Vercel** | $0 | Free tier (hobby projects) |
| **Other** | $5 | Logging, monitoring, storage |
| **Total** | **$48-63** | Moderate usage (100-500 daily players) |

### **Cost Optimization**
```bash
# Reduce costs during off-peak hours (nights)
gcloud run services update mafia-backend-prod \
  --min-instances=0 \
  --region=europe-west1

# Set up budget alerts
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Mafia Game Budget" \
  --budget-amount=60 \
  --threshold-rule=percent=80,basis=CURRENT_SPEND
```

---

## 📊 Monitoring & Operations

### **Health Monitoring**
```bash
# Real-time logs
gcloud run services logs tail mafia-backend-prod --region=europe-west1

# Error logs only  
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=20

# Service status
gcloud run services describe mafia-backend-prod --region=europe-west1
```

### **Key Metrics to Watch**
- **Uptime**: > 99.9% (target: 99.99%)
- **Response Time**: P95 < 500ms, P99 < 1s  
- **Error Rate**: < 1% (target: < 0.1%)
- **Memory Usage**: < 80% of 1GB
- **Active Games**: Monitor concurrent rooms
- **Player Connections**: WebSocket connection success rate

### **Scaling Operations**
```bash
# Peak traffic scaling (evenings, weekends)
gcloud run services update mafia-backend-prod \
  --max-instances=20 \
  --min-instances=2 \
  --region=europe-west1

# Tournament/event scaling
gcloud run services update mafia-backend-prod \
  --max-instances=50 \
  --cpu=2 \
  --memory=2Gi \
  --region=europe-west1
```

---

## 🚨 Troubleshooting

### **Common Issues & Solutions**

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Cold Starts** | First request slow (>3s) | Set min-instances=1 |
| **CORS Errors** | Frontend can't connect | Update CORS in backend, redeploy |
| **WebSocket Fails** | Connection drops | Check Cloud Run allows WebSocket |
| **High Memory** | 500 errors, crashes | Increase memory to 2GB |
| **Redis Timeout** | Connection errors | Check VPC connector health |
| **Build Failures** | Deploy fails | Check Docker context, dependencies |

### **Debug Commands**
```bash
# Service health
curl "https://your-backend-url/health"

# WebSocket test
wscat -c "wss://your-backend-url/socket.io/?EIO=4&transport=websocket"

# Check Redis connectivity
gcloud redis instances describe mafia-redis-eu --region=europe-west1

# Load test
ab -n 1000 -c 10 "https://your-backend-url/health"
```

### **Emergency Procedures**
```bash
# Rollback deployment
gcloud run services update mafia-backend-prod \
  --image=eu.gcr.io/mafia-game-prod-470720/mafia-backend:previous-build \
  --region=europe-west1

# Scale up resources quickly  
gcloud run services update mafia-backend-prod \
  --memory=2Gi \
  --cpu=2 \
  --max-instances=20 \
  --region=europe-west1

# Check recent deployments
gcloud run revisions list --service=mafia-backend-prod --region=europe-west1
```

---

## 🎯 Success Checklist

### **Pre-Launch Verification**
- [ ] Health endpoint responds < 100ms
- [ ] WebSocket connections work from multiple browsers
- [ ] Multi-player game flow works end-to-end
- [ ] CORS configured for actual frontend domain
- [ ] Error rate < 1% under load testing
- [ ] Memory usage < 80% during peak load
- [ ] Monitoring and alerts configured
- [ ] Budget alerts set at $60/month

### **Go-Live Verification**  
- [ ] UK players can connect and play smoothly
- [ ] Canada players experience acceptable latency
- [ ] India players can join games successfully
- [ ] Game rooms persist properly (24-hour expiry)
- [ ] No session eviction issues during gameplay
- [ ] Real-time updates work across all regions

### **Post-Launch Operations**
- [ ] Daily: Check error logs and uptime metrics
- [ ] Weekly: Review performance and costs
- [ ] Monthly: Update dependencies and security patches
- [ ] Quarterly: Optimize scaling and costs

---

## 🎮 You're Live!

**🎉 Congratulations!** Your Mafia game is now deployed with:

✅ **Enterprise-grade security and reliability**  
✅ **Global CDN for fast loading worldwide**  
✅ **Auto-scaling backend handling 100+ concurrent games**  
✅ **Production monitoring and alerting**  
✅ **Sub-$65/month operating costs**

**Share your game URL and start playing with friends around the world!**

---

*For detailed operations, monitoring, and maintenance information, see `OPERATIONS.md`*