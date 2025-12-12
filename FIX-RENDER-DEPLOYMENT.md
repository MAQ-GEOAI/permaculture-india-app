# 🚨 FIX: Render.com Deployment Error

## Current Error
```
BackendUnavailable: Cannot import 'setuptools.build_meta'
Exited with status 2 while building your code
```

## Root Cause
1. Missing `setuptools` in requirements.txt
2. Python 3.13 might be too new (some packages not compatible)
3. GDAL/rasterio installation issues on Render

## IMMEDIATE FIX - Step by Step

### Step 1: Update Render Service Settings

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click on "permaculture-backend" service
   - Click "Settings" in left sidebar

2. **Update Build Settings:**
   - **Build Command:** Change to:
     ```
     pip install --upgrade pip setuptools wheel && pip install -r requirements.txt
     ```
   - **Python Version:** Set to `3.11.0` (not 3.13)
   - **Start Command:** Should be:
     ```
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```

3. **Save Settings**

### Step 2: Manual Deploy

1. **In Render Dashboard:**
   - Click "Manual Deploy" button (top right)
   - Select "Deploy latest commit"
   - Wait for deployment

### Step 3: If Still Failing - Use Simplified Requirements

If the build still fails, we need to simplify dependencies:

1. **In Render Settings:**
   - Change **Build Command** to:
     ```
     pip install --upgrade pip setuptools wheel && pip install -r requirements-simple.txt
     ```

2. **Or rename file:**
   - In GitHub, rename `requirements-simple.txt` to `requirements.txt`
   - Push changes
   - Render will auto-deploy

### Step 4: Alternative - Use Railway.app (Easier)

Railway handles Python dependencies better:

1. **Go to:** https://railway.app
2. **New Project** → Deploy from GitHub
3. **Select:** Your repository
4. **Root Directory:** `backend`
5. **Auto-detects** Python and dependencies
6. **Deploys automatically** ✅

## What I Fixed in Code

✅ Added `setuptools` and `wheel` to requirements.txt  
✅ Set Python version to 3.11.0 (stable)  
✅ Created `requirements-simple.txt` as backup  
✅ Updated build command in render.yaml  

## Next Steps

1. **Update Render settings** (Step 1 above)
2. **Manual deploy** (Step 2)
3. **If fails:** Use Railway.app (Step 4) - it's easier!

## Verification

After successful deployment:
- Visit: `https://permaculture-backend.onrender.com/`
- Should see: `{"status": "OK", "message": "Permaculture PRO backend running"}`
- Frontend will connect automatically ✅

