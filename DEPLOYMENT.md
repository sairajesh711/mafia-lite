# 🏭 Production Deployment Guide
*Enterprise-grade deployment for Mafia Game*

## 🎯 Production-Ready Features

### ✅ **Security Hardening**
- Multi-stage Docker build with minimal runtime image
- Non-root user execution (`nodejs:1001`)
- Security vulnerability scanning with Trivy
- Service account with least-privilege access
- VPC-only Redis access
- Environment variable security

### ✅ **Performance Optimization**
- Multi-stage build with dependency optimization
- Build caching for faster deployments
- Memory limits (1GB) and CPU allocation
- Always-warm instances (min=1, max=10)
- HTTP/2 and connection pooling ready

### ✅ **Reliability & Monitoring**
- Health checks with proper timeouts
- Graceful shutdown with dumb-init
- Structured logging
- Uptime monitoring
- Resource usage alerts
- Error rate monitoring

### ✅ **DevOps Best Practices**
- Immutable deployments with build IDs
- Automated smoke testing
- Zero-downtime deployments
- Build artifact caching
- Comprehensive logging

---

## 🚀 Quick Production Deployment

### **Step 1: One-Command Deployment**
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

### **Step 2: Update Frontend Environment**
```bash
# Update apps/frontend/.env.production
VITE_SERVER_URL=https://your-backend-url-from-deployment
```

### **Step 3: Deploy Frontend**
```bash
cd apps/frontend && vercel --prod
```

---

## 🔧 Manual Production Setup

### **Prerequisites**
```bash
# Install required tools
gcloud auth login
gcloud config set project mafia-game-prod-470720

# Install Docker (for local testing)
# Install curl, jq (for testing)
```

### **Infrastructure Setup**
```bash
# 1. Enable APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com

# 2. Create Redis (takes 5-10 minutes)
gcloud redis instances create mafia-redis-eu \
  --size=1 \
  --region=europe-west1 \
  --redis-version=redis_6_x \
  --enable-auth

# 3. Create VPC Connector
gcloud compute networks vpc-access connectors create mafia-connector-eu \
  --region=europe-west1 \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10

# 4. Create Service Account
gcloud iam service-accounts create mafia-backend \
  --display-name="Mafia Backend Service Account"

gcloud projects add-iam-policy-binding mafia-game-prod-470720 \
  --member="serviceAccount:mafia-backend@mafia-game-prod-470720.iam.gserviceaccount.com" \
  --role="roles/redis.editor"
```

### **Production Build & Deploy**
```bash
# Get Redis IP
REDIS_IP=$(gcloud redis instances describe mafia-redis-eu --region=europe-west1 --format="value(host)")

# Deploy with production configuration
cd apps/backend
gcloud builds submit \
  --config=cloudbuild.prod.yaml \
  --substitutions=_REDIS_URL="redis://${REDIS_IP}:6379" \
  ../..
```

---

## 🔍 Production Verification

### **Health Checks**
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe mafia-backend-prod --region=europe-west1 --format="value(status.url)")

# Test health endpoint
curl -f "$SERVICE_URL/health"
# Expected: {"status":"ok","timestamp":...,"protocolVersion":1}

# Test WebSocket connection
wscat -c "${SERVICE_URL/https/wss}/socket.io/?EIO=4&transport=websocket"
```

### **Performance Testing**
```bash
# Load test with Apache Bench
ab -n 1000 -c 10 "$SERVICE_URL/health"

# WebSocket connection test
node -e "
const io = require('socket.io-client');
const socket = io('$SERVICE_URL');
socket.on('connect', () => console.log('✅ WebSocket connected'));
socket.on('disconnect', () => console.log('❌ WebSocket disconnected'));
"
```

### **Monitoring Setup**
```bash
# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="Mafia Alerts" \
  --type=email \
  --channel-labels=email_address=your-email@domain.com

# Apply monitoring configuration
# (Update monitoring.yaml with actual URLs first)
kubectl apply -f apps/backend/monitoring.yaml
```

---

## 📊 Production Metrics & Logs

### **Key Metrics to Monitor**
- **Request Rate**: > 100 RPS sustained
- **Error Rate**: < 1% (target: < 0.1%)
- **Response Time**: P95 < 500ms, P99 < 1s
- **Memory Usage**: < 80% of 1GB
- **CPU Usage**: < 70% sustained
- **Active Connections**: WebSocket connections

### **Logging**
```bash
# View real-time logs
gcloud run services logs tail mafia-backend-prod --region=europe-west1

# Search logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mafia-backend-prod" --limit=50

# Error logs only
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=20
```

### **Alerts Configuration**
- **Service Down**: > 1 minute downtime
- **High Error Rate**: > 5% for 5 minutes
- **High Memory**: > 80% for 5 minutes
- **High CPU**: > 80% for 5 minutes
- **Low Redis Connections**: Connection failures

---

## 🛠️ Production Operations

### **Deployment Updates**
```bash
# Zero-downtime deployment
gcloud builds submit --config=cloudbuild.prod.yaml ../..

# Rollback if needed
gcloud run services update mafia-backend-prod \
  --image=eu.gcr.io/mafia-game-prod-470720/mafia-backend:previous-build-id \
  --region=europe-west1
```

### **Scaling**
```bash
# Increase max instances during peak
gcloud run services update mafia-backend-prod \
  --max-instances=20 \
  --region=europe-west1

# Reduce during off-peak
gcloud run services update mafia-backend-prod \
  --max-instances=5 \
  --min-instances=0 \
  --region=europe-west1
```

### **Security Updates**
```bash
# Update base image and redeploy
gcloud builds submit --config=cloudbuild.prod.yaml ../..

# Rotate service account keys (if using)
gcloud iam service-accounts keys create new-key.json \
  --iam-account=mafia-backend@mafia-game-prod-470720.iam.gserviceaccount.com
```

---

## 💰 Cost Optimization

### **Current Costs (Estimated)**
- **Cloud Run**: $10-30/month (depending on usage)
- **Redis**: €22/month (~$25)
- **VPC Connector**: $3/month
- **Container Registry**: $2/month
- **Monitoring/Logging**: $5/month
- **Total**: ~$45-65/month

### **Cost-Saving Tips**
1. **Use min-instances=0** during low traffic periods
2. **Optimize image size** (current: ~100MB)
3. **Use preemptible instances** for batch processing
4. **Set up budget alerts** at $50/month

---

## 🚨 Troubleshooting

### **Common Issues**

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Cold Starts** | First request slow | Increase min-instances |
| **Memory Issues** | 500 errors, OOM kills | Increase memory limit |
| **Redis Connection** | Connection timeouts | Check VPC connector |
| **CORS Errors** | Frontend can't connect | Update CORS origins |
| **High Latency** | Slow responses | Check Redis performance |

### **Debug Commands**
```bash
# Service status
gcloud run services describe mafia-backend-prod --region=europe-west1

# Recent deployments
gcloud run revisions list --service=mafia-backend-prod --region=europe-west1

# Resource usage
gcloud monitoring metrics list --filter="displayName:container/memory/utilizations"

# Network connectivity test
gcloud compute ssh test-vm --command="curl -I http://10.154.0.3:6379"
```

---

## 🎯 Success Criteria

### **Production Readiness Checklist**
- [ ] Multi-stage Docker build working
- [ ] Security scanning passing
- [ ] Health checks responding < 100ms
- [ ] WebSocket connections stable
- [ ] Error rate < 1%
- [ ] Memory usage < 80%
- [ ] Redis connectivity working
- [ ] Monitoring alerts configured
- [ ] Logs structured and searchable
- [ ] Frontend connecting successfully
- [ ] Multi-region user testing passed

### **Go-Live Checklist**
- [ ] Domain configured (optional)
- [ ] SSL certificates valid
- [ ] Monitoring dashboards created
- [ ] Team access configured
- [ ] Backup/recovery procedures documented
- [ ] Performance benchmarks established
- [ ] Support runbook created

---

**🎮 Ready for Production!** Your Mafia game is now deployed with enterprise-grade reliability, security, and monitoring.