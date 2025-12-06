# Enable Firestore Database - Quick Guide

## Important: Firestore vs Realtime Database

Your app uses **Firestore Database** (not Realtime Database).

- ❌ **Realtime Database** - What you're currently looking at
- ✅ **Firestore Database** - What you need to enable

---

## Step-by-Step: Enable Firestore

### Step 1: Navigate to Firestore

1. **In the left sidebar**, look for "Build" section
2. **Click on "Firestore Database"** (it should be under "Build" → "Run")
   - If you don't see it, click the "Build" dropdown to expand it
   - Look for "Firestore Database" with a database icon

### Step 2: Create Database

1. **You'll see a page that says "Cloud Firestore"**
2. **Click the "Create database" button** (usually a big blue button)

### Step 3: Choose Mode

1. **Select "Start in test mode"** (for development)
   - This allows read/write access for 30 days
   - Perfect for testing your app
2. **Click "Next"**

### Step 4: Choose Location

1. **Select a location close to you:**
   - For India: Choose `asia-south1` (Mumbai) or `asia-southeast1` (Singapore)
   - You can also choose `us-central1` if preferred
2. **Click "Enable"**

### Step 5: Wait for Creation

- Firestore will take 1-2 minutes to create
- You'll see a progress indicator
- Once done, you'll see the Firestore console

---

## Step 6: Update Security Rules (Important!)

After Firestore is created:

1. **Click the "Rules" tab** (top of the Firestore page)

2. **Replace the default rules with:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users to read/write their own projects
       match /artifacts/{appId}/users/{userId}/permaculture_projects/{projectId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Click "Publish"** (top right)

---

## What You Should See After Enabling

✅ **Firestore Database page** with:
- "Data" tab (showing empty database)
- "Rules" tab (for security rules)
- "Indexes" tab
- "Usage" tab

✅ **No errors** when you test your app

---

## Quick Checklist

- [ ] Navigate to Firestore Database (not Realtime Database)
- [ ] Click "Create database"
- [ ] Choose "Start in test mode"
- [ ] Select location (asia-south1 or asia-southeast1)
- [ ] Click "Enable"
- [ ] Wait for creation (1-2 minutes)
- [ ] Update security rules
- [ ] Click "Publish"

---

## After Firestore is Enabled

Your app will be able to:
- ✅ Save projects to Firestore
- ✅ Load saved projects
- ✅ Store AOI (Area of Interest) data
- ✅ Store analysis layers

---

## Test Your Setup

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Try saving a project:**
   - Draw an AOI on the map
   - Enter a project name
   - Click "Save"
   - Should see "Project saved successfully!"

3. **Check Firestore:**
   - Go back to Firebase Console
   - Click "Firestore Database" → "Data" tab
   - You should see your project data!

---

## Troubleshooting

### Can't find Firestore Database?
- Look under "Build" section in left sidebar
- It might be collapsed - click to expand
- Search for "Firestore" in the sidebar

### Still seeing Realtime Database?
- That's a different service
- You need "Firestore Database" (Cloud Firestore)
- They're two separate databases

### Rules not working?
- Make sure you clicked "Publish" after updating rules
- Check that rules match the path: `/artifacts/{appId}/users/{userId}/permaculture_projects/{projectId}`

---

## Summary

1. Go to **Firestore Database** (not Realtime Database)
2. Click **"Create database"**
3. Choose **"Start in test mode"**
4. Select **location** (asia-south1 recommended for India)
5. Click **"Enable"**
6. Update **security rules**
7. **Test your app!**

Your Firestore setup will be complete! 🎉

