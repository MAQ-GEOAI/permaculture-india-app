# How to Install Node.js on Windows

## The Problem
You're getting this error:
```
npm : The term 'npm' is not recognized...
```

This means Node.js (which includes npm) is not installed on your computer.

## Solution: Install Node.js

### Step 1: Download Node.js

1. **Go to the official Node.js website:**
   - Visit: https://nodejs.org/
   - You'll see two download buttons:
     - **LTS** (Recommended) - This is the stable version
     - **Current** - Latest features (may have bugs)

2. **Click the LTS button** (left side, green button)
   - This downloads the Windows installer (.msi file)
   - File name will be like: `node-v20.x.x-x64.msi`

### Step 2: Install Node.js

1. **Run the downloaded .msi file**
   - Double-click the installer
   - Click "Next" through the installation wizard

2. **Important: Check these options during installation:**
   - ✅ **"Add to PATH"** - This is CRITICAL! Make sure it's checked
   - ✅ Accept the license agreement
   - ✅ Choose default installation location (usually `C:\Program Files\nodejs\`)

3. **Complete the installation**
   - Click "Install"
   - Wait for installation to finish
   - Click "Finish"

### Step 3: Verify Installation

1. **Close and reopen PyCharm terminal** (or open a new PowerShell window)
   - This is important so it picks up the new PATH

2. **Test Node.js:**
   ```bash
   node --version
   ```
   - Should show something like: `v20.11.0`

3. **Test npm:**
   ```bash
   npm --version
   ```
   - Should show something like: `10.2.4`

### Step 4: Run npm install

Now go back to your project directory and run:
```bash
cd D:\MAQ\Biz\permaculture\perma
npm install
```

This should work now! ✅

---

## Alternative: If PATH Still Doesn't Work

If after installing Node.js, `npm` still isn't recognized:

1. **Restart your computer** (this refreshes the PATH)

2. **Or manually add to PATH:**
   - Open "Environment Variables" in Windows
   - Add: `C:\Program Files\nodejs\` to PATH
   - Restart terminal

---

## Quick Checklist

- [ ] Download Node.js LTS from nodejs.org
- [ ] Install with "Add to PATH" checked
- [ ] Close and reopen terminal
- [ ] Verify with `node --version` and `npm --version`
- [ ] Run `npm install` in your project folder

---

## After Installation

Once Node.js is installed, you can:

1. **Install project dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

---

## Need Help?

If you still have issues:
- Make sure you downloaded from nodejs.org (official site)
- Restart your computer after installation
- Check that Node.js appears in: `C:\Program Files\nodejs\`

