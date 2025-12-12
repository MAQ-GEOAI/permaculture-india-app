# 🚨 ACTION REQUIRED: Deploy Backend to Make App Work

## The Problem
Your app is showing "Backend unavailable" because the backend server is **NOT DEPLOYED** on Render.com.

## The Solution (5 Minutes)

### Step 1: Deploy Backend to Render.com

1. **Go to:** https://render.com
2. **Sign in** (or create free account)
3. **Click:** "New +" → "Web Service"
4. **Connect GitHub:**
   - Select: `MAQ-GEOAI/permaculture-india-app`
   - Branch: `main`
5. **Configure:**
   - **Name:** `permaculture-backend`
   - **Root Directory:** `backend` ⚠️ **IMPORTANT**
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
6. **Click:** "Create Web Service"
7. **Wait:** 10-15 minutes for deployment
8. **Copy URL:** `https://permaculture-backend-XXXX.onrender.com`

### Step 2: Update Frontend

1. **Go to:** https://vercel.com
2. **Your Project** → Settings → Environment Variables
3. **Add:**
   - Key: `VITE_BACKEND_URL`
   - Value: `https://permaculture-backend-XXXX.onrender.com` (your URL from Step 1)
4. **Redeploy** frontend

### Step 3: Test

1. Visit your app: `https://permaculture-india-app.vercel.app`
2. Draw an Area of Interest
3. Click "Run Analysis"
4. **Should work!** ✅

## Alternative: Railway.app (Easier)

If Render.com is too complex:

1. **Go to:** https://railway.app
2. **Sign in** with GitHub
3. **New Project** → Deploy from GitHub
4. **Select:** Your repository
5. **Root Directory:** `backend`
6. **Auto-deploys** - just wait!

## What I Fixed

✅ Updated `backend/requirements.txt` with proper versions  
✅ Fixed `backend/render.yaml` with correct root directory  
✅ Updated `backend/main.py` to use PORT environment variable  
✅ Added deployment guides  

## Current Status

- ✅ **Frontend:** Deployed and working
- ❌ **Backend:** NOT DEPLOYED (this is the problem)
- ✅ **Code:** All fixed and ready

## After Backend Deployment

✅ All layers will work  
✅ Contours will load  
✅ Slope/aspect will work  
✅ Hydrology will work  
✅ **Ready for business!**

---

**The backend MUST be deployed for the app to work. This is a one-time setup that takes 15 minutes.**

