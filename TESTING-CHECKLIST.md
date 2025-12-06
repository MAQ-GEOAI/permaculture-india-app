# Testing Checklist - Verify All Features Work

## Quick Test Steps

### 1. Map Display ✅
- [ ] Map shows satellite imagery
- [ ] Can zoom in/out
- [ ] Can pan around
- [ ] Map controls visible (zoom buttons)

**If map doesn't show:**
- Check console for "Map initialized successfully"
- Try refreshing page
- Check Network tab - verify Leaflet CSS/JS loaded

---

### 2. Location Search ✅
- [ ] Type "Mumbai" in search bar
- [ ] Press Enter or click search
- [ ] Map zooms to Mumbai
- [ ] Marker appears with popup
- [ ] Toast shows "Found: Mumbai..."

**Test locations:**
- "Mumbai, India"
- "New Delhi"
- "Bangalore"
- "Taj Mahal"

---

### 3. Coordinate Search ✅
- [ ] Click "Coordinates" tab
- [ ] Enter: Lat: 20.5937, Lng: 78.9629
- [ ] Click "Navigate"
- [ ] Map zooms to coordinates
- [ ] Marker appears

---

### 4. GPX Import ✅
- [ ] Click "Import GPX File"
- [ ] Select your GPX file
- [ ] Map displays tracks/waypoints
- [ ] Map auto-fits to GPX bounds
- [ ] Toast shows "GPX loaded: X features"

**Test file:**
- `D:\MAQ\Biz\permaculture\Mountain Cycling.gpx`

---

### 5. Draw AOI ✅
- [ ] Click "Draw Area" button
- [ ] Click on map to add points
- [ ] Add at least 3 points
- [ ] Double-click to finish
- [ ] Green polygon appears
- [ ] Statistics appear automatically

---

### 6. AOI Statistics ✅
- [ ] After drawing AOI, check sidebar
- [ ] See area in hectares/acres
- [ ] See perimeter in km
- [ ] See center coordinates
- [ ] See vertex count
- [ ] Check floating card on map (bottom-left)

---

### 7. Export PNG ✅
- [ ] Click "PNG" button (top-right)
- [ ] File downloads
- [ ] Image shows map correctly

---

### 8. Export PDF ✅
- [ ] Click "PDF" button (top-right)
- [ ] File downloads
- [ ] PDF opens correctly

---

### 9. Print Map ✅
- [ ] Click "Print" button
- [ ] Print dialog opens
- [ ] Preview looks correct

---

### 10. Share Map ✅
- [ ] Click "Share" button
- [ ] Share dialog opens (mobile) OR
- [ ] Link copied to clipboard (desktop)
- [ ] Toast shows confirmation

---

### 11. Basemap Switching ✅
- [ ] Click different basemap names
- [ ] Map tiles change instantly
- [ ] All 10 basemaps work

---

### 12. Project Management ✅
- [ ] Enter project name
- [ ] Click "Save"
- [ ] Toast shows "Project saved"
- [ ] Project appears in list
- [ ] Click project to load
- [ ] AOI and layers restore

---

## Common Issues & Fixes

### Map Not Showing
**Symptoms:** Empty dark area where map should be

**Fix:**
1. Check console for errors
2. Verify Leaflet loaded (Network tab)
3. Try refreshing page
4. Check container has dimensions

**Console should show:**
```
Creating Leaflet map... {width: 1234, height: 800}
Map initialized successfully
```

### Search Not Working
**Symptoms:** No results, error message

**Fix:**
1. Check internet connection
2. Try different location name
3. Check console for CORS errors
4. Verify Nominatim API is accessible

### GPX Not Loading
**Symptoms:** File selected but nothing happens

**Fix:**
1. Verify file is .gpx format
2. Check file isn't corrupted
3. Try smaller GPX file
4. Check console for parse errors

### Export Not Working
**Symptoms:** Button clicked but no download

**Fix:**
1. Check html2canvas/jsPDF loaded (Network tab)
2. Check browser console for errors
3. Try refreshing page
4. Check browser download settings

---

## Expected Console Output

**On Load:**
```
Firebase config loaded in head: OK
Initializing Firebase with config: {projectId: 'perma-kisan-ai', ...}
Creating Leaflet map... {width: 1234, height: 800}
Map initialized successfully
```

**On Search:**
```
(No errors)
Toast: "Found: [location name]"
```

**On GPX Import:**
```
GPX loaded: X features
Toast: "GPX loaded: X features"
```

---

## Performance Checks

- [ ] Map loads within 2 seconds
- [ ] Search completes within 3 seconds
- [ ] GPX import completes within 5 seconds (for normal files)
- [ ] Export completes within 10 seconds
- [ ] No memory leaks (check after multiple operations)

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (recommended)
- [ ] Firefox
- [ ] Safari (if available)

---

## Mobile Testing

- [ ] Responsive layout works
- [ ] Touch interactions work
- [ ] Search works on mobile
- [ ] Export works on mobile

---

## Final Verification

**All features working:**
- ✅ Map displays
- ✅ Search works
- ✅ GPX import works
- ✅ AOI drawing works
- ✅ Statistics calculate
- ✅ Export works
- ✅ Share works
- ✅ Basemaps switch
- ✅ Projects save/load

**If all checked:**
🎉 **App is fully functional!**

---

## Still Having Issues?

1. **Check browser console** (F12 → Console)
2. **Check Network tab** (F12 → Network)
3. **Share error messages**
4. **Describe what's not working**

