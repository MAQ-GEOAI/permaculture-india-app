# How to Start the Backend Server

## Quick Start

The app needs the backend server running for analysis features. Here's how to start it:

### Step 1: Open a New Terminal

Keep your frontend running (`npm run dev`) and open a **new terminal window**.

### Step 2: Navigate to Backend Folder

```bash
cd D:\MAQ\Biz\permaculture\perma\backend
```

### Step 3: Install Python Dependencies (First Time Only)

```bash
pip install -r requirements.txt
```

### Step 4: Start the Backend Server

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 5: Verify Backend is Running

Open in browser: http://localhost:8000

You should see:
```json
{"status": "OK", "message": "Permaculture PRO backend running"}
```

---

## What Works Without Backend

✅ **Frontend UI** - All interface elements work  
✅ **Map** - Map displays and you can draw AOI  
✅ **Project Management** - Save/load projects (uses Firebase)  
✅ **Basemap Switching** - All basemaps work  
✅ **Pond Calculator** - Works offline  
✅ **AI Advisory** - Falls back to rule-based recommendations  

---

## What Needs Backend

❌ **Run Analysis** - Requires backend for:
- Contour generation
- Hydrology analysis
- Sun path calculation
- Advanced AI recommendations

---

## Running Both Servers

**Terminal 1 (Frontend):**
```bash
npm run dev
```
Runs on: http://localhost:3000

**Terminal 2 (Backend):**
```bash
cd backend
python main.py
```
Runs on: http://localhost:8000

---

## Troubleshooting

### "Module not found" errors
```bash
pip install fastapi uvicorn python-multipart
```

### Port 8000 already in use
Change port in `backend/main.py`:
```python
uvicorn.run("main:app", host="0.0.0.0", port=8001)
```

### Backend starts but frontend can't connect
- Check CORS is enabled in backend (it is by default)
- Verify backend URL in `App.jsx` is `http://localhost:8000`
- Check firewall isn't blocking port 8000

---

## Quick Test

1. Start backend: `cd backend && python main.py`
2. Test endpoint: http://localhost:8000/
3. Should see: `{"status": "OK", ...}`
4. Now "Run Analysis" in frontend should work!

