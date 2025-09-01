# 🚀 Vercel Frontend Deployment Guide
*Complete step-by-step guide to deploy your Mafia game frontend*

## 📋 Prerequisites (5 minutes)

### **Required Accounts**
- **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
- **GitHub/GitLab**: Repository must be hosted (recommended for auto-deployments)

### **Required Tools**
```bash
# 1. Vercel CLI (recommended)
npm install -g vercel
vercel --version

# 2. Node.js and pnpm (for local testing)
node --version  # Should be 18+
pnpm --version  # Should match your project
```

### **Required Information**
- **Backend URL**: Your deployed backend endpoint (e.g., `https://your-backend.run.app`)
- **Environment Variables**: Any additional config your frontend needs

---

## 🎯 Deployment Methods

Choose your preferred deployment method:

### **Method 1: Vercel CLI (Recommended)** 
✅ **Best for**: First-time deployments, quick testing  
⏱️ **Time**: 3-5 minutes

### **Method 2: GitHub Integration**
✅ **Best for**: Continuous deployment, team collaboration  
⏱️ **Time**: 5-10 minutes (one-time setup)

### **Method 3: Vercel Dashboard**
✅ **Best for**: Visual interface, drag-and-drop  
⏱️ **Time**: 5-7 minutes

---

## 🚀 Method 1: Vercel CLI Deployment

### **Step 1: Prepare Your Frontend (2 minutes)**

```bash
# Navigate to frontend directory
cd apps/frontend

# Install dependencies if not already done
pnpm install

# Test local build (optional but recommended)
pnpm build
```

### **Step 2: Configure Environment Variables (1 minute)**

```bash
# Create production environment file
cat > .env.production << EOF
VITE_SERVER_URL=https://your-backend-url.run.app
VITE_APP_ENV=production
VITE_APP_NAME=Mafia Game
EOF

# Or edit manually with your actual backend URL
nano .env.production
```

**Important**: Replace `https://your-backend-url.run.app` with your actual backend URL!

### **Step 3: Deploy to Vercel (2 minutes)**

```bash
# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod

# Follow the prompts:
# ? Set up and deploy "~/path/to/mafia-lite/apps/frontend"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Username]
# ? Link to existing project? [y/N] n (for new deployment)
# ? What's your project's name? mafia-game-frontend
# ? In which directory is your code located? ./
```

### **Step 4: Verify Deployment (30 seconds)**

**Expected Output:**
```bash
✅ Production: https://mafia-game-frontend-xxxxx.vercel.app [2s]
📝 Deployed to production. Run `vercel --prod` to overwrite later.
```

**Test Your Deployment:**
1. **Open the URL** provided in the output
2. **Check functionality**: Click "HOST NEW GAME" 
3. **Test backend connection**: Should not show connection errors
4. **Check browser console**: No critical errors

---

## 🐙 Method 2: GitHub Integration

### **Step 1: Push Code to GitHub (if not already done)**

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare frontend for Vercel deployment"
git push origin main
```

### **Step 2: Connect GitHub to Vercel**

1. **Visit**: [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Click**: "Add New..." → "Project"
3. **Import Git Repository**:
   - Select your GitHub account
   - Find your `mafia-lite` repository
   - Click "Import"

### **Step 3: Configure Project Settings**

**Framework Preset**: Vite (should auto-detect)

**Root Directory**: `apps/frontend`

**Build Settings**:
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`

**Environment Variables** (click "Add"):
```
VITE_SERVER_URL = https://your-backend-url.run.app
VITE_APP_ENV = production
```

### **Step 4: Deploy**

1. **Click**: "Deploy"
2. **Wait**: 2-3 minutes for build to complete
3. **Success**: You'll get a URL like `https://mafia-lite-xxxxx.vercel.app`

### **Step 5: Set Up Auto-Deployment**

**Automatic deployments are now configured!**
- **Main branch**: Deploys to production
- **Other branches**: Create preview deployments
- **Pull requests**: Get preview links automatically

---

## 🖥️ Method 3: Vercel Dashboard

### **Step 1: Prepare Deployment Package**

```bash
# Create deployment folder
mkdir mafia-frontend-deploy
cd mafia-frontend-deploy

# Copy frontend files
cp -r ../apps/frontend/* .

# Install dependencies and build
pnpm install
pnpm build

# The 'dist' folder is what gets deployed
```

### **Step 2: Dashboard Upload**

1. **Visit**: [vercel.com/new](https://vercel.com/new)
2. **Choose**: "Browse" or drag the `dist` folder
3. **Project Name**: `mafia-game-frontend`
4. **Framework**: Static (or Vite if detected)

### **Step 3: Configure Environment**

Add environment variables in the dashboard:
- `VITE_SERVER_URL`: Your backend URL
- `VITE_APP_ENV`: `production`

### **Step 4: Deploy**

Click "Deploy" and wait for completion.

---

## ⚙️ Advanced Configuration

### **Custom Domain Setup**

1. **Dashboard**: Go to your project settings
2. **Domains**: Click "Add"
3. **Enter**: Your custom domain (e.g., `mafia.yourdomain.com`)
4. **DNS**: Add CNAME record pointing to `cname.vercel-dns.com`
5. **SSL**: Automatically configured

### **Performance Optimization**

**vercel.json configuration:**
```json
{
  "framework": "vite",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### **Environment Management**

**Multiple Environments:**
- **Production**: `main` branch → `https://your-app.vercel.app`
- **Staging**: `develop` branch → `https://your-app-git-develop.vercel.app`
- **Feature**: Any branch → `https://your-app-git-feature.vercel.app`

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Build Fails** | "Command failed with exit code 1" | Check `pnpm build` works locally |
| **Blank Page** | White screen, no content | Check browser console for errors |
| **API Errors** | 404/CORS errors to backend | Verify `VITE_SERVER_URL` is correct |
| **Routing Issues** | 404 on refresh | Ensure `rewrites` in vercel.json |
| **Slow Loading** | Poor performance | Enable compression, check bundle size |

### **Debug Commands**

```bash
# Test local build
cd apps/frontend
pnpm build && pnpm preview

# Check environment variables
vercel env ls

# View deployment logs
vercel logs https://your-app.vercel.app

# Pull latest deployment locally
vercel pull
```

### **Build Troubleshooting**

**Build Command Issues:**
```bash
# If build fails, try locally first
cd apps/frontend
rm -rf node_modules dist
pnpm install
pnpm build

# Check for TypeScript errors
pnpm type-check

# Check for linting issues  
pnpm lint
```

---

## 🚀 Post-Deployment Checklist

### **Functionality Testing**
- [ ] **Homepage loads** without errors
- [ ] **"HOST NEW GAME"** creates a room successfully
- [ ] **"JOIN GAME"** accepts room codes
- [ ] **WebSocket connection** works (no connection errors)
- [ ] **Multiple browsers** can join the same game
- [ ] **Game flow** works end-to-end
- [ ] **Responsive design** works on mobile

### **Performance Testing**
- [ ] **Page load time** < 3 seconds
- [ ] **First paint** < 1 second  
- [ ] **Interactive** < 2 seconds
- [ ] **No console errors** in production
- [ ] **Bundle size** reasonable (<500KB gzipped)

### **SEO & Meta**
- [ ] **Title tag** set correctly
- [ ] **Meta description** present
- [ ] **Favicon** loads
- [ ] **Open Graph** tags for social sharing

---

## 🌍 Global Performance

### **Vercel Edge Network**
Your app automatically deploys to **50+ edge locations worldwide**:

- **North America**: US, Canada (10+ locations)
- **Europe**: UK, Germany, France, Netherlands (10+ locations)  
- **Asia**: India, Japan, Singapore, Australia (15+ locations)
- **Other**: Brazil, South Africa (5+ locations)

### **Expected Performance**
- **UK**: 20-50ms load time ⭐⭐⭐⭐⭐
- **Canada**: 30-70ms load time ⭐⭐⭐⭐⭐
- **India**: 50-100ms load time ⭐⭐⭐⭐
- **Global**: 95% of users < 100ms ⭐⭐⭐⭐

---

## 🔄 Continuous Deployment Workflow

### **Development Workflow**
```bash
# 1. Make changes locally
git checkout -b feature/new-feature
# ... make changes ...

# 2. Test locally
pnpm dev  # Test in development
pnpm build && pnpm preview  # Test production build

# 3. Push and create PR
git push origin feature/new-feature
# Create pull request on GitHub

# 4. Preview deployment
# Vercel automatically creates preview URL
# Test the preview with your team

# 5. Merge to main
# Automatic production deployment happens
```

### **Deployment Status**
Monitor deployments at: [vercel.com/dashboard](https://vercel.com/dashboard)

**Status Indicators:**
- 🟢 **Ready**: Deployment successful
- 🟡 **Building**: Currently deploying
- 🔴 **Error**: Deployment failed
- 🔵 **Queued**: Waiting to build

---

## 🎯 Success Metrics

### **After Successful Deployment**

**Your Mafia game frontend will have:**

✅ **Global CDN**: Sub-100ms load times worldwide  
✅ **Auto-scaling**: Handles unlimited concurrent players  
✅ **Zero downtime**: Updates deploy without service interruption  
✅ **HTTPS**: Automatic SSL certificates  
✅ **Custom domains**: Add your own domain easily  
✅ **Analytics**: Built-in performance monitoring  

**Monthly Costs**: **$0** (Free tier supports 100GB bandwidth, 100 deployments)

---

## 🎮 You're Live!

**🎉 Congratulations!** Your Mafia game frontend is now deployed globally!

**Share your game URL with friends around the world:**
`https://your-mafia-game.vercel.app`

---

## 📞 Need Help?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Support**: [vercel.com/support](https://vercel.com/support)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Status**: [vercel-status.com](https://vercel-status.com)

*Happy gaming! 🎲🎭*