# 🚀 Quick Deployment Guide - Get Your Test URL

## Deploy to Vercel (Easiest - 5 Minutes)

### Step 1: Prepare Your Project

1. **Make sure you have a `package.json`** (you already have this)
2. **Create `vercel.json`** (I'll create this for you)

### Step 2: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/permaculture-app.git
git push -u origin main
```

### Step 3: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login** (use GitHub account - easiest)
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure:**
   - Framework Preset: **Vite**
   - Root Directory: `./` (or leave default)
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Click "Deploy"**

### Step 4: Get Your URL

- Vercel will give you a URL like: `https://your-app-name.vercel.app`
- **This is your test URL!** Share it with business.

---

## Alternative: Deploy to Netlify

### Step 1: Build Your App

```bash
npm run build
```

### Step 2: Deploy

1. **Go to [netlify.com](https://netlify.com)**
2. **Sign up/Login**
3. **Drag and drop your `dist` folder** OR
4. **Connect to GitHub** (same as Vercel)

### Step 3: Get Your URL

- Netlify gives you: `https://your-app-name.netlify.app`

---

## Alternative: Deploy to GitHub Pages

### Step 1: Install gh-pages

```bash
npm install --save-dev gh-pages
```

### Step 2: Update package.json

Add these scripts:

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://YOUR_USERNAME.github.io/permaculture-app"
}
```

### Step 3: Deploy

```bash
npm run deploy
```

### Step 4: Get Your URL

- GitHub Pages URL: `https://YOUR_USERNAME.github.io/permaculture-app`

---

## ⚠️ Important Notes

### Backend URL Configuration

Your frontend needs to know where the backend is. Update `App.jsx`:

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://permaculture-backend.onrender.com'); // Your backend URL
```

### Environment Variables (Vercel/Netlify)

If you need to set environment variables:

1. **Vercel**: Project Settings → Environment Variables
2. **Netlify**: Site Settings → Build & Deploy → Environment Variables

Add:
- `VITE_BACKEND_URL=https://your-backend-url.com`

---

## 🎯 Quickest Option: Vercel

**Recommended for fastest deployment:**

1. Push code to GitHub
2. Connect to Vercel
3. Deploy
4. Get URL in 2 minutes!

**Your test URL will be live immediately!**

---

## 📝 After Deployment

1. **Test the URL** - Make sure everything works
2. **Share with business** - They can click and access immediately
3. **Monitor** - Check Vercel dashboard for any errors

---

## 🔧 Troubleshooting

### Map not showing?
- Check browser console for errors
- Ensure Leaflet CSS is loaded
- Verify map container has dimensions

### Backend not connecting?
- Check CORS settings on backend
- Verify backend URL is correct
- Check backend is running

### Build fails?
- Check `package.json` has all dependencies
- Ensure Node.js version is compatible
- Check for any syntax errors

---

## ✅ Success!

Once deployed, you'll have a URL like:
- `https://permaculture-app.vercel.app`
- `https://permaculture-app.netlify.app`
- `https://your-username.github.io/permaculture-app`

**Share this URL with business - they can click and test immediately!** 🎉

