# 🛠️ Mafia Game Operations Guide
*Complete operations, monitoring, and maintenance guide*

## 🏗️ Architecture Deep Dive

### **System Components**
```
┌─────────────────────────────────────────────────┐
│                 Users (Global)                  │
│           UK • Canada • India                   │
└─────────────────┬───────────────────────────────┘
                  │ HTTPS/WSS
┌─────────────────▼───────────────────────────────┐
│            Vercel CDN (Global)                  │
│         • Static asset serving                  │
│         • Edge caching (50+ locations)          │
│         • Automatic SSL/TLS                     │
└─────────────────┬───────────────────────────────┘
                  │ API Calls
┌─────────────────▼───────────────────────────────┐
│         Google Cloud Run (EU-West1)            │
│         • Auto-scaling (1-10 instances)        │
│         • WebSocket + HTTP support             │
│         • 1GB RAM, 1 CPU per instance          │
└─────────────────┬───────────────────────────────┘
                  │ VPC Connector
┌─────────────────▼───────────────────────────────┐
│        Redis Memory Store (EU-West1)           │
│         • 1GB memory                           │
│         • Sub-millisecond latency               │
│         • Automatic failover                   │
└─────────────────────────────────────────────────┘
```

### **Data Flow Explanation**
1. **Frontend Request**: User opens game → Vercel CDN serves static files
2. **WebSocket Connection**: Browser connects to Cloud Run via Socket.IO
3. **Game State**: Cloud Run stores/retrieves game data from Redis
4. **Real-time Updates**: Socket.IO broadcasts changes to all connected players
5. **Session Management**: JWT tokens stored in Redis for reconnection

---

## 🔧 Infrastructure Components Explained

### **Frontend (Vercel)**
**What it does**: Serves the React application globally
**Why Vercel**: 
- Global CDN with 50+ edge locations
- Automatic deployments from Git
- Built-in SSL/TLS certificates
- Zero-config React optimization

**Configuration**:
```json
// apps/frontend/vercel.json
{
  "buildCommand": "pnpm build",           // Build the React app
  "outputDirectory": "dist",              // Where built files are
  "framework": "vite",                    // Auto-detects Vite config
  "rewrites": [                          // SPA routing support
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### **Backend (Google Cloud Run)**
**What it does**: Runs the Node.js server with Socket.IO
**Why Cloud Run**:
- Pay-per-request pricing
- Auto-scales from 0 to thousands
- Fully managed (no server maintenance)
- Built-in load balancing

**Key Settings**:
- **Memory**: 1GB (enough for 1000+ concurrent connections)
- **CPU**: 1 vCPU (sufficient for game logic)
- **Concurrency**: 1000 requests per instance
- **Min Instances**: 1 (keeps service warm)
- **Max Instances**: 10 (handles traffic spikes)

### **Database (Redis Memory Store)**
**What it does**: Stores game sessions, player data, room states
**Why Redis**:
- In-memory = sub-millisecond response times
- Pub/sub for real-time updates
- Automatic persistence
- Built-in data expiration (rooms auto-cleanup)

**Data Structure**:
```
Redis Keys:
├── room:{roomId}              # Game state JSON
├── room_code:{CODE}           # Room code → room ID mapping  
├── session:{playerId}:{roomId} # Player session data
├── player:{playerId}          # Player profile
└── dedup:{actionId}           # Action deduplication
```

---

## 🔒 Security Architecture

### **Authentication Flow**
1. **Connection**: Player connects → Server generates JWT
2. **Session**: JWT contains playerId, roomId, sessionId
3. **Storage**: Session data stored in Redis with TTL
4. **Reconnection**: Browser sends JWT → Server validates and restores session
5. **Eviction**: Multiple sessions → Latest wins, others disconnected

### **Security Measures**
- **Non-root Container**: App runs as `nodejs:1001` user
- **Vulnerability Scanning**: Trivy scans container images
- **VPC Network**: Redis only accessible via VPC connector
- **Service Account**: Minimal permissions (redis.editor only)
- **Environment Variables**: Secrets managed via Cloud Run environment

### **CORS Configuration**
```typescript
// apps/backend/src/index.ts
cors: {
  origin: [
    'https://your-app.vercel.app',           // Your frontend URL
    /^https:\/\/.*\.vercel\.app$/            // All Vercel preview URLs
  ],
  credentials: true                          // Allow cookies/auth headers
}
```

---

## 📊 Monitoring & Observability

### **Health Checks**
```typescript
// Endpoint: GET /health
{
  "status": "ok",
  "timestamp": 1756676198951,
  "protocolVersion": 1
}
```

**What it checks**:
- Server is responding
- Redis connection is active
- Memory usage is reasonable
- No critical errors

### **Key Metrics**
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Uptime** | 99.9% | < 99% |
| **Response Time** | P95 < 500ms | P95 > 1s |
| **Error Rate** | < 1% | > 5% |
| **Memory Usage** | < 80% | > 90% |
| **CPU Usage** | < 70% | > 85% |
| **Active Connections** | Monitor | Sudden drops |

### **Logging Strategy**
```json
// Structured JSON logs
{
  "level": 30,                    // Info level
  "time": 1756676198951,         // Timestamp  
  "pid": 1234,                   // Process ID
  "hostname": "instance-1",      // Container ID
  "msg": "Player joined room",   // Human readable
  "playerId": "abc123",          // Structured data
  "roomId": "room456"
}
```

**Log Levels**:
- **DEBUG** (20): Detailed flow information
- **INFO** (30): Normal operations (player joins, games start)
- **WARN** (40): Recoverable issues (connection timeouts)
- **ERROR** (50): Serious problems (Redis failures)
- **FATAL** (60): Service-breaking issues

---

## 🚨 Alerting & Incident Response

### **Alert Channels**
- **Email**: Immediate notifications for critical issues
- **Slack**: Team notifications (optional)
- **SMS**: For P0 incidents (optional)

### **Alert Policies**
1. **Service Down**: Health check fails for >1 minute
2. **High Error Rate**: >5% errors for 5 minutes
3. **Memory Pressure**: >90% memory for 5 minutes
4. **CPU Overload**: >85% CPU for 5 minutes
5. **Redis Connection Loss**: Connection failures

### **Incident Response Runbook**

#### **🚨 Service Down**
```bash
# 1. Check service status
gcloud run services describe mafia-backend-prod --region=europe-west1

# 2. Check recent deployments
gcloud run revisions list --service=mafia-backend-prod --region=europe-west1

# 3. View error logs
gcloud run services logs tail mafia-backend-prod --region=europe-west1

# 4. Rollback if needed
gcloud run services update mafia-backend-prod \
  --image=eu.gcr.io/mafia-game-prod-470720/mafia-backend:previous-build \
  --region=europe-west1
```

#### **🔥 High Error Rate**
```bash
# 1. Check error logs
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50

# 2. Check Redis connectivity  
gcloud redis instances describe mafia-redis-eu --region=europe-west1

# 3. Restart service if needed
gcloud run services update mafia-backend-prod --region=europe-west1
```

#### **💾 Memory/CPU Issues**
```bash
# 1. Check resource usage
gcloud monitoring metrics list --filter="displayName:container/memory/utilizations"

# 2. Scale up resources temporarily
gcloud run services update mafia-backend-prod \
  --memory=2Gi \
  --region=europe-west1

# 3. Investigate memory leaks in code
```

---

## 💰 Cost Management

### **Current Cost Breakdown**
```
Monthly Costs (Moderate Usage):
├── Cloud Run: $15-30
│   ├── Instance time: $20
│   ├── Request processing: $5
│   └── Networking: $5
├── Redis Memory Store: $25
├── VPC Connector: $3
├── Container Registry: $2
├── Monitoring/Logging: $3
└── Total: $48-63/month
```

### **Cost Optimization Strategies**

#### **Immediate Savings**
```bash
# 1. Reduce min instances during off-peak
gcloud run services update mafia-backend-prod \
  --min-instances=0 \
  --region=europe-west1

# 2. Set up budget alerts
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Mafia Game Budget" \
  --budget-amount=60 \
  --threshold-rule=percent=80,basis=CURRENT_SPEND
```

#### **Scaling Strategies**
- **Low Traffic** (nights): min-instances=0, max-instances=3
- **Peak Traffic** (evenings): min-instances=2, max-instances=10
- **Events/Tournaments**: max-instances=20, upgrade Redis size

### **Usage Patterns**
```
Daily Traffic:
├── 00:00-08:00: Low (10-50 concurrent users)
├── 08:00-12:00: Medium (50-200 concurrent users)  
├── 12:00-18:00: Medium (100-300 concurrent users)
├── 18:00-23:00: Peak (200-500 concurrent users)
└── 23:00-00:00: Medium (100-200 concurrent users)
```

---

## 🔧 Maintenance Operations

### **Daily Operations**
```bash
# Morning health check
curl -f https://your-backend-url/health

# Check error rate (should be <1%)
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --freshness=1d --limit=10

# Monitor active games
# (Check Redis for room count - implement monitoring endpoint)
```

### **Weekly Operations**
```bash
# 1. Review performance metrics
gcloud monitoring dashboards list

# 2. Check cost trends
gcloud billing budgets list

# 3. Security updates
gcloud builds submit --config=apps/backend/cloudbuild.yaml apps/backend

# 4. Clean up old container images
gcloud container images list-tags eu.gcr.io/mafia-game-prod-470720/mafia-backend \
  --format='get(digest)' --limit=5 | tail -n +3 | \
  xargs -I {} gcloud container images delete eu.gcr.io/mafia-game-prod-470720/mafia-backend@{}
```

### **Monthly Operations**
```bash
# 1. Performance review
# - Analyze P95 response times
# - Review error patterns
# - Check memory/CPU trends

# 2. Cost optimization review
# - Analyze usage patterns
# - Adjust scaling parameters
# - Review Redis size requirements

# 3. Security review
# - Update dependencies
# - Review access logs
# - Rotate service account keys (if applicable)
```

---

## 🔍 Troubleshooting Guide

### **Common Issues & Solutions**

#### **Problem**: Players can't connect to game
**Symptoms**: WebSocket connection errors, timeouts
**Diagnosis**:
```bash
# Check backend health
curl -f https://your-backend-url/health

# Test WebSocket connection
wscat -c wss://your-backend-url/socket.io/?EIO=4&transport=websocket

# Check CORS settings
curl -H "Origin: https://your-frontend-url" https://your-backend-url/health
```
**Solutions**:
1. Update CORS origins in backend
2. Check Vercel deployment URL
3. Verify SSL certificates

#### **Problem**: High latency for some players
**Symptoms**: Slow game responses, timeouts
**Diagnosis**:
```bash
# Test from different locations
curl -w "@curl-format.txt" https://your-backend-url/health
```
**Solutions**:
1. Consider multi-region deployment
2. Optimize Redis queries
3. Enable CDN for API responses

#### **Problem**: Memory leaks
**Symptoms**: Increasing memory usage, eventual crashes
**Diagnosis**:
```bash
# Monitor memory trends
gcloud monitoring timeseries list \
  --filter='resource.type="cloud_run_revision"' \
  --interval='1h'
```
**Solutions**:
1. Review Socket.IO connection cleanup
2. Check Redis connection pooling
3. Add memory profiling

---

## 📈 Performance Tuning

### **Backend Optimization**
```typescript
// Socket.IO optimizations
const io = new SocketIOServer(server, {
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,        // Keep connections alive
  pingInterval: 25000,       // Heartbeat frequency
  maxHttpBufferSize: 1e6,    // 1MB max message size
  cors: { /* ... */ }
});

// Redis optimizations  
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    keepAlive: true,         // TCP keep-alive
    reconnectDelay: 1000     // Auto-reconnect
  }
});
```

### **Frontend Optimization**
```typescript
// Connection optimization
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000,           // Connection timeout
  reconnection: true,       // Auto-reconnect
  reconnectionAttempts: 5,  // Max retry attempts
  reconnectionDelay: 2000   // Delay between retries
});
```

### **Scaling Recommendations**

| Concurrent Games | Cloud Run Config | Redis Size | Expected Cost |
|-----------------|------------------|------------|---------------|
| **1-20** | min=0, max=3 | 1GB | $35/month |
| **20-50** | min=1, max=5 | 1GB | $50/month |
| **50-100** | min=2, max=8 | 2.5GB | $80/month |
| **100-200** | min=3, max=15 | 5GB | $150/month |

---

## 🎯 Success Metrics

### **Technical KPIs**
- **Uptime**: >99.9%
- **Response Time**: P95 <500ms, P99 <1s
- **Error Rate**: <0.5%
- **WebSocket Connection Success**: >99%
- **Game Completion Rate**: >95%

### **Business KPIs**
- **Daily Active Users**: Track growth
- **Average Session Duration**: Target >20 minutes
- **Game Completion Rate**: >80% of started games finish
- **User Retention**: Weekly retention >30%

### **Monitoring Dashboards**
Create custom dashboards in Google Cloud Monitoring:
1. **System Health**: CPU, memory, error rates
2. **User Experience**: Response times, connection success
3. **Business Metrics**: Active games, player counts
4. **Cost Tracking**: Resource usage, billing trends

---

**🎮 Your Mafia game is now production-ready with enterprise-grade operations!**

This operations guide provides everything needed to:
- ✅ Monitor system health
- ✅ Respond to incidents  
- ✅ Optimize costs
- ✅ Scale reliably
- ✅ Maintain security