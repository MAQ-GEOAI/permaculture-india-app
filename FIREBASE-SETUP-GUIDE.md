# Complete Firebase Setup Guide

## Step-by-Step Instructions

### STEP 1: Create Firebase Project

1. **On the "Create a project" page you're seeing:**

   - **Enter Project Name:**
     - Type: `permaculture-app` (or any name you prefer)
     - Example: `permaculture-design-platform`
   
   - **Project ID:**
     - Firebase will auto-generate an ID like `my-awesome-project-id`
     - You can click the edit icon to customize it
     - Keep it simple: `permaculture-app` or `perma-design`
   
   - **Checkboxes:**
     - ✅ **Check:** "I accept the Firebase terms" (required)
     - ✅ **Optional:** "Join the Google Developer Programme" (you can leave this checked or unchecked)
   
   - **Click "Continue"** (or "Next") button at the bottom

---

### STEP 2: Configure Google Analytics (Optional)

1. **You'll see a page asking about Google Analytics:**
   - For this project, you can **disable** Google Analytics (it's optional)
   - Or enable it if you want usage statistics
   - Click "Continue" either way

2. **Wait for project creation:**
   - Firebase will create your project (takes 30-60 seconds)
   - You'll see a progress indicator
   - Click "Continue" when it's done

---

### STEP 3: Get Your Firebase Configuration

1. **Once project is created, you'll be in the Firebase Console dashboard**

2. **Click the gear icon (⚙️) next to "Project Overview"** (top left)
   - Select "Project settings"

3. **Scroll down to "Your apps" section:**
   - You'll see options for different platforms (iOS, Android, Web, etc.)
   - Click the **Web icon** (`</>`) to add a web app

4. **Register your app:**
   - **App nickname:** `Permaculture Web App` (or any name)
   - **Check:** "Also set up Firebase Hosting" (optional, you can skip this)
   - Click "Register app"

5. **Copy the Firebase configuration:**
   - You'll see a code block that looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyC...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
   - **Copy this entire configuration object**

---

### STEP 4: Enable Firestore Database

1. **In Firebase Console, go to "Firestore Database"** (left sidebar)

2. **Click "Create database"**

3. **Choose mode:**
   - Select **"Start in test mode"** (for development)
   - Click "Next"

4. **Choose location:**
   - Select a location close to you (e.g., `us-central`, `asia-south1` for India)
   - Click "Enable"

5. **Wait for database creation** (takes 1-2 minutes)

---

### STEP 5: Update Your React App

1. **Open `index-react.html` in your project**

2. **Find this section:**
   ```javascript
   window.__firebase_config = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     // ... etc
   };
   ```

3. **Replace with your actual Firebase config:**
   ```javascript
   window.__firebase_config = {
     apiKey: "AIzaSyC...",  // Paste your actual apiKey
     authDomain: "your-project.firebaseapp.com",  // Paste your actual authDomain
     projectId: "your-project-id",  // Paste your actual projectId
     storageBucket: "your-project.appspot.com",  // Paste your actual storageBucket
     messagingSenderId: "123456789",  // Paste your actual messagingSenderId
     appId: "1:123456789:web:abc123"  // Paste your actual appId
   };
   
   window.__app_id = "permaculture-app";
   window.__initial_auth_token = null;
   ```

4. **Save the file**

---

### STEP 6: Configure Firestore Security Rules (Important!)

1. **In Firebase Console, go to "Firestore Database"**

2. **Click "Rules" tab**

3. **Update the rules to allow authenticated users:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow users to read/write their own projects
       match /artifacts/{appId}/users/{userId}/permaculture_projects/{projectId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

4. **Click "Publish"**

---

### STEP 7: Test Your Setup

1. **Start your React app:**
   ```bash
   npm run dev
   ```

2. **Open the app in browser** (`http://localhost:3000`)

3. **Check the browser console:**
   - Should see: "Firebase initialized successfully"
   - Should see your User ID displayed in the header
   - No Firebase errors

4. **Test project save:**
   - Draw an AOI
   - Enter a project name
   - Click "Save"
   - Should see "Project saved successfully!"

---

## Quick Reference: What Each Field Means

- **apiKey:** Public API key (safe to expose in frontend)
- **authDomain:** Domain for Firebase Authentication
- **projectId:** Your unique project identifier
- **storageBucket:** Cloud Storage bucket name
- **messagingSenderId:** For Firebase Cloud Messaging
- **appId:** Unique identifier for your web app

---

## Troubleshooting

### Error: "Firebase configuration not found"
- Make sure you pasted the config in `index-react.html`
- Check for typos in the config object
- Make sure `window.__firebase_config` is defined before React loads

### Error: "Permission denied" when saving
- Check Firestore security rules (Step 6)
- Make sure rules allow authenticated users
- Verify you're logged in (check User ID in header)

### Error: "Firestore not enabled"
- Go to Firebase Console → Firestore Database
- Make sure database is created
- Check that you selected "Start in test mode"

---

## Security Note

For production, you should:
1. Update Firestore rules to be more restrictive
2. Consider using Firebase App Check
3. Set up proper authentication (not just anonymous)

For development, test mode is fine!

---

## Next Steps After Firebase Setup

1. ✅ Firebase project created
2. ✅ Firestore enabled
3. ✅ Config added to `index-react.html`
4. ✅ Security rules configured
5. ✅ Test the app

Now you can:
- Save projects to Firestore
- Load saved projects
- User authentication works automatically

---

## Summary

1. Create project → Enter name → Continue
2. Skip/Enable Analytics → Continue
3. Get config → Click Web icon → Copy config
4. Enable Firestore → Test mode → Enable
5. Update `index-react.html` with your config
6. Update Firestore rules
7. Test the app!

Your Firebase setup is complete! 🎉

