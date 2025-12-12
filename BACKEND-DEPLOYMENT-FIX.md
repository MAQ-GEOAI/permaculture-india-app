# CRITICAL: Backend Deployment Fix

## Problem
Backend at `permaculture-backend.onrender.com` is returning 404/CORS errors - **NOT WORKING**

## Root Cause
Backend is either:
1. Not deployed on Render.com
2. Deployed but crashed during startup
3. Missing dependencies (GDAL/rasterio issues)

## IMMEDIATE FIX - Deploy Backend to Render.com

### Step 1: Check if Backend Exists on Render
1. Go to: https://dashboard.render.com
2. Check if service `permaculture-backend` exists
3. If NOT EXISTS → Deploy it (see Step 2)
4. If EXISTS → Check logs (see Step 3)

### Step 2: Deploy Backend (If Not Deployed)

1. **Go to Render Dashboard:**
   - https://render.com
   - Sign in
   - Click "New +" → "Web Service"

2. **Connect GitHub Repository:**
   - Select your repository: `MAQ-GEOAI/permaculture-india-app`
   - Branch: `main`

3. **Configure Service:**
   - **Name:** `permaculture-backend`
   - **Root Directory:** `backend` ⚠️ **CRITICAL**
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. **Environment Variables:**
   - `PORT` = `8000` (auto-set by Render)
   - `PYTHON_VERSION` = `3.11.0`

5. **Click "Create Web Service"**
   - Wait 10-15 minutes for first deployment
   - **Note:** GDAL installation takes time

6. **Get Your Backend URL:**
   - After deployment: `https://permaculture-backend-XXXX.onrender.com`
   - Copy this URL

### Step 3: Fix Existing Backend (If Already Deployed)

1. **Check Deployment Logs:**
   - Render Dashboard → Your Service → Logs
   - Look for errors:
     - "Module not found" → Missing dependency
     - "GDAL not found" → GDAL installation issue
     - "Port already in use" → Configuration issue

2. **Common Fixes:**

   **If GDAL Error:**
   - Render doesn't support GDAL easily
   - **Solution:** Use alternative approach (see below)

   **If Import Error:**
   - Check `requirements.txt` has all dependencies
   - Rebuild service

3. **Redeploy:**
   - Render Dashboard → Your Service → Manual Deploy → "Deploy latest commit"

### Step 4: Update Frontend Backend URL

1. **In Vercel Dashboard:**
   - Go to your project
   - Settings → Environment Variables
   - Add/Update: `VITE_BACKEND_URL` = `https://your-backend-XXXX.onrender.com`
   - Redeploy frontend

2. **OR Update App.jsx:**
   ```javascript
   const BACKEND_URL = 'https://your-backend-XXXX.onrender.com';
   ```

### Step 5: Test Backend

1. **Test Health Endpoint:**
   - Visit: `https://your-backend.onrender.com/`
   - Should see: `{"status": "OK", "message": "Permaculture PRO backend running"}`

2. **Test CORS:**
   - Open browser console on frontend
   - Should NOT see CORS errors

## ALTERNATIVE: Use Railway.app (Easier GDAL Support)

If Render fails due to GDAL:

1. **Deploy to Railway:**
   - https://railway.app
   - New Project → Deploy from GitHub
   - Select repository
   - Root Directory: `backend`
   - Auto-detects Python
   - Deploys automatically

2. **Railway handles GDAL better than Render**

## QUICK TEST: Local Backend

To test if backend code works:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Visit: http://localhost:8000

Should see: `{"status": "OK"}`

## Status Check

After deployment, test these endpoints:
- ✅ `https://your-backend.onrender.com/` → Should return JSON
- ✅ `https://your-backend.onrender.com/contours?bbox=88.3,26.7,88.4,26.8&interval=5` → Should return GeoJSON
- ✅ Frontend should load layers without CORS errors

## If Still Failing

1. **Check Render Logs** - Look for startup errors
2. **Test Locally** - `python backend/main.py` should work
3. **Simplify Dependencies** - Remove GDAL if causing issues
4. **Use Alternative Service** - Railway.app or Fly.io

