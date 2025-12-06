# Quick Fixes for App Issues

## Current Issues & Fixes

### 1. Map Not Displaying

**Problem:** Map area appears empty/blank

**Fixes Applied:**
- ✅ Improved map initialization with retry logic
- ✅ Added container dimension checks
- ✅ Added loading indicator
- ✅ Better error handling

**To Test:**
1. Refresh browser (Ctrl+R)
2. Check console for "Map initialized successfully"
3. Map should appear within 1-2 seconds

**If Still Not Working:**
- Check browser console for errors
- Verify Leaflet is loading (check Network tab)
- Try resizing browser window

---

### 2. Search Functionality

**Test Search:**
1. Type "Mumbai" in search bar
2. Press Enter or click search icon
3. Map should zoom to Mumbai
4. Marker should appear

**If Not Working:**
- Check internet connection (uses OpenStreetMap API)
- Check browser console for CORS errors
- Try different location name

---

### 3. GPX Import

**Test GPX:**
1. Click "Import GPX File"
2. Select your GPX file
3. Map should display tracks/waypoints
4. Map should auto-zoom to GPX bounds

**If Not Working:**
- Verify file is .gpx format
- Check file isn't corrupted
- Check console for parse errors

---

### 4. Export Functions

**Test Export:**
1. Click PNG button (top-right)
2. Should download PNG file
3. Try PDF button
4. Should download PDF file

**If Not Working:**
- Check if html2canvas/jsPDF loaded (Network tab)
- Check browser console for errors
- Try refreshing page

---

## Debugging Steps

### Step 1: Check Console
Open browser console (F12) and look for:
- ✅ "Map initialized successfully"
- ✅ "Firebase config loaded in head: OK"
- ❌ Any red error messages

### Step 2: Check Network Tab
Verify these are loading:
- ✅ Leaflet CSS
- ✅ Leaflet JS
- ✅ html2canvas
- ✅ jsPDF

### Step 3: Test Features
1. **Map**: Should show satellite imagery
2. **Search**: Type location, should zoom
3. **Draw AOI**: Click "Draw Area", click map
4. **Export**: Click export buttons

---

## Common Fixes

### Map Not Showing
```javascript
// In browser console, try:
L.map(document.getElementById('leaflet-map-container'), {
  center: [20.59, 78.96],
  zoom: 5
});
```

### Search Not Working
- Check: `https://nominatim.openstreetmap.org` is accessible
- Try: Different location name
- Check: Browser console for CORS errors

### GPX Not Loading
- Verify: File is valid GPX format
- Check: File size (very large files may take time)
- Try: Smaller GPX file first

---

## If Nothing Works

1. **Clear browser cache:**
   - Ctrl+Shift+Delete
   - Clear cached files
   - Refresh page

2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Check dependencies:**
   ```bash
   npm install
   ```

4. **Verify files:**
   - Check `index.html` exists
   - Check `App.jsx` exists
   - Check `main.jsx` exists

---

## Expected Behavior

**On Load:**
1. Firebase initializes (1-2 seconds)
2. Map initializes (1 second)
3. Map displays satellite imagery
4. Sidebar shows all controls

**When Working:**
- Map is visible and interactive
- Can zoom/pan
- Can search locations
- Can draw AOI
- Can export maps

---

## Still Having Issues?

Share:
1. Browser console errors (F12 → Console)
2. Network tab errors (F12 → Network)
3. What feature isn't working
4. Screenshot if possible

