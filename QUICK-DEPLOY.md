# Quick Deployment - 5 Steps to Production

## For Business Users - Simple URL Access

---

## Step 1: Push Code to GitHub (5 min)

```bash
# In your project folder
git init
git add .
git commit -m "Ready for production"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/permaculture-app.git
git push -u origin main
```

---

## Step 2: Deploy Frontend to Vercel (3 min)

1. Go to: https://vercel.com
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your repository
5. Click "Deploy"
6. **Copy your URL:** `https://your-app.vercel.app`

---

## Step 3: Deploy Backend to Render (10 min)

1. Go to: https://render.com
2. Sign up
3. Click "New +" → "Web Service"
4. Connect GitHub repository
5. **Settings:**
   - Name: `permaculture-backend`
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Click "Create"
7. **Copy your URL:** `https://your-backend.onrender.com`

---

## Step 4: Update Backend URL (2 min)

1. In Vercel Dashboard:
   - Go to your project
   - Settings → Environment Variables
   - Add: `VITE_BACKEND_URL` = `https://your-backend.onrender.com`
   - Redeploy

2. Or update `App.jsx` line 72:
   ```javascript
   const BACKEND_URL = 'https://your-backend.onrender.com';
   ```

---

## Step 5: Test & Share (2 min)

1. Visit your Vercel URL
2. Test the app
3. **Share URL with business users!**

---

## That's It! 🎉

**Business users can now access:**
- `https://your-app.vercel.app`

**No setup required - just a URL!**

---

## Important Notes

- **Backend URL:** Update `App.jsx` with your actual Render backend URL
- **Firebase:** Already configured, should work
- **Free Tier:** Both Vercel and Render have free tiers
- **Custom Domain:** Optional, can add later

---

## Troubleshooting

**App not loading?**
- Check Vercel deployment logs
- Verify build succeeded

**Backend not working?**
- Check Render logs
- Test backend URL: `https://your-backend.onrender.com/`

**Need help?**
- Check deployment logs
- Verify environment variables
- Test locally first

