# Quick Test Guide - Contour Improvements

## 🚀 Fastest Way to Test

### Step 1: Start Backend (Terminal 1)

```bash
cd D:\MAQ\Biz\permaculture\perma\backend
python main.py
```

**Wait for:** `Uvicorn running on http://0.0.0.0:8000`

### Step 2: Start Frontend (Terminal 2)

```bash
cd D:\MAQ\Biz\permaculture\perma
npm run dev
```

**Wait for:** `Local: http://localhost:3000/`

### Step 3: Test in Browser

1. Open: `http://localhost:3000`
2. Search: `Mumbai, India`
3. Click: **"Draw Area"**
4. Click map to draw polygon
5. Double-click to finish
6. Click: **"Run Analysis"**
7. Wait 10-30 seconds
8. ✅ Contours should appear!

---

## 🎯 Quick Test Checklist

- [ ] Backend running (`http://localhost:8000` shows OK)
- [ ] Frontend running (`http://localhost:3000` opens)
- [ ] Can search location
- [ ] Can draw AOI
- [ ] Contour Settings panel visible
- [ ] Can select interval (0.5m - 100m)
- [ ] Can select bold interval
- [ ] Can toggle labels
- [ ] Contours appear after analysis
- [ ] Labels show on contours (if enabled)
- [ ] Bold contours are thicker
- [ ] Can export GeoJSON

---

## 📍 Test Locations (India)

| Location | Elevation | Interval | Expected Result |
|----------|----------|----------|-----------------|
| Mumbai | Low | 2m | Gentle contours |
| Delhi | Medium | 5m | Flat to gentle |
| Shimla | High | 10m | Steep contours |
| Leh | Very High | 20m | Very steep |

---

## ⚡ Quick API Test

Test backend directly:

```bash
# Health check
curl http://localhost:8000/

# Test contours (Mumbai area)
curl "http://localhost:8000/contours?bbox=72.8,19.0,72.9,19.1&interval=5&bold_interval=5"
```

---

## 🐛 Quick Troubleshooting

**Contours not appearing?**
- Check backend is running
- Check browser console (F12) for errors
- Try smaller AOI
- Try larger interval (10m, 20m)

**Backend not starting?**
```bash
pip install -r requirements.txt
python main.py
```

**Frontend not starting?**
```bash
npm install
npm run dev
```

---

## 📚 Full Testing Guide

See `TESTING-CONTOUR-IMPROVEMENTS.md` for complete testing checklist.

