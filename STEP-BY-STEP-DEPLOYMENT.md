# 🚀 Step-by-Step Deployment Guide

## Your Current Situation
- ✅ You have a GitHub repo: `MAQ-GEOAI/permaculture-india-app`
- ✅ You have a React/Vite app ready in `perma` folder
- ✅ You need to deploy and get a test URL

---

## 📋 STEP 1: Prepare Your Code

### 1.1 Check Your Current Directory
```bash
# Make sure you're in the perma folder
cd D:\MAQ\Biz\permaculture\perma
```

### 1.2 Verify Your Files
Make sure you have:
- ✅ `App.jsx`
- ✅ `main.jsx`
- ✅ `index.html`
- ✅ `package.json`
- ✅ `vite.config.js`

---

## 📋 STEP 2: Initialize Git (If Not Already Done)

### 2.1 Check if Git is Initialized
```bash
git status
```

### 2.2 If Not Initialized, Initialize Git
```bash
git init
```

### 2.3 Add Your Remote Repository
```bash
# Replace with your actual repo URL
git remote add origin https://github.com/MAQ-GEOAI/permaculture-india-app.git
```

### 2.4 Check Remote
```bash
git remote -v
```

---

## 📋 STEP 3: Create .gitignore (If Not Exists)

Create a `.gitignore` file with:

```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
.vscode/
.idea/
```

---

## 📋 STEP 4: Commit and Push Your Code

### 4.1 Add All Files
```bash
git add .
```

### 4.2 Commit
```bash
git commit -m "Deploy React/Vite permaculture app with all features"
```

### 4.3 Push to GitHub
```bash
# If this is your first push
git branch -M main
git push -u origin main

# If main branch already exists
git push origin main
```

**Wait for push to complete!**

---

## 📋 STEP 5: Choose Deployment Method

You have **2 options**:

### Option A: Vercel (Recommended - Easiest & Fastest) ⭐
### Option B: GitHub Pages (Free, Already Set Up)

---

## 🎯 OPTION A: Deploy to Vercel (Recommended)

### Step 5A.1: Go to Vercel
1. Open browser: https://vercel.com
2. Click **"Sign Up"** or **"Log In"**

### Step 5A.2: Sign Up with GitHub
1. Click **"Continue with GitHub"**
2. Authorize Vercel to access your GitHub

### Step 5A.3: Import Your Repository
1. Click **"Add New..."** → **"Project"**
2. Find **"permaculture-india-app"** in the list
3. Click **"Import"**

### Step 5A.4: Configure Project
1. **Framework Preset:** Select **"Vite"** (should auto-detect)
2. **Root Directory:** Leave as `./` (or set to `perma` if needed)
3. **Build Command:** `npm run build` (should be auto-filled)
4. **Output Directory:** `dist` (should be auto-filled)
5. **Install Command:** `npm install` (should be auto-filled)

### Step 5A.5: Environment Variables (Optional)
If you need backend URL:
- Click **"Environment Variables"**
- Add: `VITE_BACKEND_URL` = `https://your-backend-url.com`

### Step 5A.6: Deploy!
1. Click **"Deploy"** button
2. Wait 2-3 minutes for build to complete
3. **You'll get a URL like:** `https://permaculture-india-app.vercel.app`

### Step 5A.7: Get Your Test URL
- ✅ Your URL is ready!
- ✅ Share with business: `https://permaculture-india-app.vercel.app`
- ✅ It auto-updates on every push!

---

## 🎯 OPTION B: Deploy to GitHub Pages

### Step 5B.1: Install gh-pages
```bash
npm install --save-dev gh-pages
```

### Step 5B.2: Update package.json
Add these to your `package.json`:

```json
{
  "homepage": "https://MAQ-GEOAI.github.io/permaculture-india-app",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

### Step 5B.3: Update vite.config.js
Make sure it has:

```javascript
export default {
  base: '/permaculture-india-app/',
  // ... rest of config
}
```

### Step 5B.4: Deploy
```bash
npm run deploy
```

### Step 5B.5: Enable GitHub Pages
1. Go to your GitHub repo
2. Click **"Settings"** tab
3. Scroll to **"Pages"** section
4. Under **"Source"**, select **"gh-pages"** branch
5. Click **"Save"**

### Step 5B.6: Get Your Test URL
- ✅ Your URL: `https://MAQ-GEOAI.github.io/permaculture-india-app`
- ✅ Takes 2-5 minutes to be live

---

## 📋 STEP 6: Test Your Deployment

### 6.1 Open Your URL
- Open the URL in a browser
- Test all features:
  - ✅ Map loads
  - ✅ Draw AOI
  - ✅ Run Analysis
  - ✅ Export works

### 6.2 Check Console
- Press `F12` to open DevTools
- Check for any errors
- Fix if needed

---

## 📋 STEP 7: Share with Business

### 7.1 Send the URL
```
Subject: Permaculture App - Test URL Ready

Hi,

The permaculture design intelligence platform is ready for testing.

Test URL: [YOUR_URL_HERE]

Features available:
- Interactive map with multiple basemaps
- Area of Interest drawing
- Terrain analysis (contours, hydrology)
- Sun path visualization
- Wind analysis
- AI advisory
- Export maps (PNG, PDF)

Please test and provide feedback.

Thanks!
```

---

## 🔧 Troubleshooting

### Issue: Build Fails
**Solution:**
- Check `package.json` has all dependencies
- Run `npm install` locally first
- Check for syntax errors

### Issue: Map Not Showing
**Solution:**
- Check browser console for errors
- Verify Leaflet CSS is loaded
- Check map container has dimensions

### Issue: Backend Not Connecting
**Solution:**
- Verify backend is running
- Check CORS settings
- Update `BACKEND_URL` in code

### Issue: GitHub Push Fails
**Solution:**
```bash
# Pull first
git pull origin main --allow-unrelated-histories

# Then push
git push origin main
```

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel/GitHub Pages
- [ ] Test URL works
- [ ] All features functional
- [ ] Shared with business

---

## 🎉 You're Done!

**Your test URL is ready!** Share it with business and collect feedback.

**Need help?** Check the error messages and let me know!

