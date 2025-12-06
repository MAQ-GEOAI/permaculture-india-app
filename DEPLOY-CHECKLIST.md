# Deployment Checklist - Business Ready

## Pre-Deployment Checklist

### Code Preparation
- [x] Firebase config added to `index.html`
- [x] Backend URL configured in `App.jsx`
- [ ] Update backend URL in `App.jsx` with actual Render URL after deployment
- [ ] Test app locally: `npm run dev`
- [ ] Test backend locally: `python backend/main.py`

### Firebase Setup
- [x] Firebase project created
- [x] Firestore Database enabled
- [x] Security rules configured
- [ ] Anonymous authentication enabled (if not done)

---

## Deployment Steps

### 1. Frontend Deployment (Vercel)

**Time: 5 minutes**

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Production ready"
   git remote add origin https://github.com/YOUR_USERNAME/permaculture-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Visit: https://vercel.com
   - Sign up/login
   - "Add New Project"
   - Import GitHub repo
   - Deploy
   - **Get URL:** `https://your-app.vercel.app`

3. **Set Environment Variable:**
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `VITE_BACKEND_URL` = `https://your-backend.onrender.com`
   - Redeploy

**Frontend URL:** `https://your-app.vercel.app` ✅

---

### 2. Backend Deployment (Render)

**Time: 10 minutes**

1. **Deploy to Render:**
   - Visit: https://render.com
   - Sign up/login
   - "New +" → "Web Service"
   - Connect GitHub repo
   - **Settings:**
     - Name: `permaculture-backend`
     - Root Directory: `backend`
     - Environment: `Python 3`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
     - Plan: Free
   - Create Web Service
   - Wait for deployment

2. **Test Backend:**
   - Visit: `https://your-backend.onrender.com/`
   - Should see: `{"status": "OK", "message": "Permaculture PRO backend running"}`

**Backend URL:** `https://your-backend.onrender.com` ✅

---

### 3. Update Frontend with Backend URL

**Option A: Environment Variable (Recommended)**
- Already set in Vercel (Step 1.3)

**Option B: Direct Update**
- Update `App.jsx` line 72-75:
  ```javascript
  const BACKEND_URL = 'https://your-backend.onrender.com';
  ```
- Push to GitHub
- Vercel auto-redeploys

---

### 4. Final Testing

**Test Checklist:**
- [ ] Frontend loads: `https://your-app.vercel.app`
- [ ] No console errors
- [ ] Firebase authentication works (User ID shows)
- [ ] Can draw AOI
- [ ] Can save project
- [ ] Backend responds: `https://your-backend.onrender.com/`
- [ ] "Run Analysis" works (if backend deployed)

---

## Business User Access

**Share this URL with business users:**
```
https://your-app.vercel.app
```

**That's it!** No setup, no installation - just a URL.

---

## Post-Deployment

### Monitor
- Check Vercel dashboard for frontend logs
- Check Render dashboard for backend logs
- Monitor Firebase usage

### Updates
- Push code to GitHub
- Vercel auto-deploys frontend
- Render auto-deploys backend (if configured)

### Custom Domain (Optional)
- Add custom domain in Vercel
- Update DNS records
- SSL auto-configured

---

## Cost

**Free Tier:**
- Vercel: Free (unlimited)
- Render: Free (750 hours/month)
- Firebase: Free Spark plan
- **Total: $0/month**

---

## Support

**If something breaks:**
1. Check deployment logs
2. Verify environment variables
3. Test endpoints directly
4. Check service status

**Quick fixes:**
- Frontend: Redeploy in Vercel
- Backend: Restart service in Render
- Firebase: Check console

---

## Summary

✅ **Frontend:** Vercel → `https://your-app.vercel.app`  
✅ **Backend:** Render → `https://your-backend.onrender.com`  
✅ **Business URL:** Share Vercel URL  
✅ **Cost:** $0/month (free tier)

**Ready for business users!** 🚀

