# Production Deployment Guide - Business Ready

## Goal
Deploy your app so business users can access it via a simple URL - no setup required!

---

## Deployment Strategy

### Frontend (React App)
**Recommended: Vercel** (Free, automatic deployments, easy setup)

### Backend (Python FastAPI)
**Recommended: Render.com** (Free tier available)

---

## STEP 1: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Website (Easiest)

1. **Create GitHub Repository:**
   - Go to GitHub.com
   - Create a new repository: `permaculture-app`
   - Push your code:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/permaculture-app.git
     git push -u origin main
     ```

2. **Deploy to Vercel:**
   - Go to: https://vercel.com
   - Sign up/login with GitHub
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite
   - **Build Settings:**
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click "Deploy"
   - Wait 2-3 minutes
   - **You'll get a URL like:** `https://permaculture-app.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? permaculture-app
# - Directory? ./
```

---

## STEP 2: Deploy Backend to Render.com

1. **Create render.yaml in backend folder:**
   ```yaml
   services:
     - type: web
       name: permaculture-backend
       env: python
       buildCommand: pip install -r requirements.txt
       startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
       envVars:
         - key: PORT
           value: 8000
   ```

2. **Push backend to GitHub:**
   - Create a separate repository for backend OR
   - Push backend folder to same repo in a `backend/` folder

3. **Deploy on Render:**
   - Go to: https://render.com
   - Sign up/login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - **Settings:**
     - Name: `permaculture-backend`
     - Environment: `Python 3`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
     - Plan: Free
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - **You'll get a URL like:** `https://permaculture-backend.onrender.com`

---

## STEP 3: Update Frontend for Production

### Update index.html with Production Backend URL

Before deploying, update the backend URL in your code:

1. **Create `.env.production` file:**
   ```env
   VITE_BACKEND_URL=https://permaculture-backend.onrender.com
   ```

2. **Or update App.jsx directly:**
   ```javascript
   const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
     (import.meta.env.PROD 
       ? 'https://permaculture-backend.onrender.com' 
       : 'http://localhost:8000');
   ```

3. **Update index.html** - Firebase config is already set, but verify it's correct

---

## STEP 4: Environment Variables (Vercel)

1. **In Vercel Dashboard:**
   - Go to your project
   - Settings → Environment Variables
   - Add:
     - `VITE_BACKEND_URL` = `https://permaculture-backend.onrender.com`
   - Redeploy

---

## STEP 5: Final Checklist

### Frontend
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Environment variables set
- [ ] App accessible via URL
- [ ] Firebase config correct

### Backend
- [ ] Backend deployed to Render
- [ ] Backend URL accessible
- [ ] CORS enabled (should be in your code)
- [ ] Test endpoint: `https://your-backend.onrender.com/` should return `{"status": "OK"}`

### Testing
- [ ] Frontend loads without errors
- [ ] Firebase authentication works
- [ ] Can save projects
- [ ] Backend API calls work (Run Analysis)

---

## Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Build frontend
npm run build

# Deploy to Vercel
vercel --prod

echo "Deployment complete!"
echo "Frontend: https://your-app.vercel.app"
echo "Backend: https://your-backend.onrender.com"
```

---

## Alternative: GitHub Pages (Free)

### For Frontend:

1. **Update vite.config.js:**
   ```javascript
   export default defineConfig({
     plugins: [react()],
     base: '/permaculture-app/', // Your repo name
     // ... rest of config
   });
   ```

2. **Deploy:**
   ```bash
   npm run build
   # Push dist folder to gh-pages branch
   ```

3. **GitHub Settings:**
   - Settings → Pages
   - Source: `gh-pages` branch
   - URL: `https://username.github.io/permaculture-app/`

---

## Business User Access

Once deployed, business users can:

1. **Access the app:**
   - Simply visit: `https://your-app.vercel.app`
   - No installation needed
   - Works on any device with a browser

2. **Features available:**
   - Draw areas of interest
   - Run analysis
   - Save/load projects
   - All features work as expected

---

## Troubleshooting

### Frontend not loading
- Check Vercel deployment logs
- Verify build succeeded
- Check environment variables

### Backend not responding
- Check Render logs
- Verify backend is running
- Test backend URL directly

### CORS errors
- Ensure backend has CORS enabled
- Check allowed origins in backend code

### Firebase errors
- Verify Firebase config in index.html
- Check Firestore is enabled
- Verify security rules

---

## Cost

**Free Tier:**
- Vercel: Free (unlimited deployments)
- Render: Free (with limitations)
- Firebase: Free Spark plan
- **Total: $0/month**

**For Production:**
- Consider paid plans for better performance
- Render free tier: 750 hours/month
- Vercel free tier: Unlimited

---

## Summary

1. **Frontend → Vercel** (5 minutes)
2. **Backend → Render** (10 minutes)
3. **Update URLs** (2 minutes)
4. **Test** (5 minutes)

**Total time: ~20 minutes**

**Result: Business users get a URL to access your app!** 🎉

---

## Next Steps After Deployment

1. Share the URL with business users
2. Monitor usage in Vercel/Render dashboards
3. Set up custom domain (optional)
4. Add analytics (optional)

---

## Support

If deployment fails:
1. Check deployment logs
2. Verify all environment variables
3. Test locally first
4. Check service status pages

