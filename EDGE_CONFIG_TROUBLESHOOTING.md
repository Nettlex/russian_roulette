# 🔧 Edge Config Troubleshooting Guide

## Problem: Leaderboard Not Persisting

If you have all 3 environment variables set but leaderboard still disappears, follow these steps:

---

## ✅ **Step 1: Deploy the Latest Code**

```bash
cd russian_roulette
vercel --prod
```

Wait for deployment to complete.

---

## 🔍 **Step 2: Check Configuration**

Visit this URL in your browser:
```
https://russian-roulette-lyart.vercel.app/api/debug-storage
```

### **Expected Output:**

```json
{
  "environment": {
    "EDGE_CONFIG": true,
    "EDGE_CONFIG_ID": true,
    "VERCEL_TOKEN": true,
    "VERCEL_URL": true
  },
  "loadError": null,
  "cachedData": {
    "freeLeaderboard": 0,
    "paidLeaderboard": 0,
    "playerStats": 0,
    "prizePool": {
      "totalAmount": 0,
      "participants": 0,
      "lastUpdated": 1234567890
    }
  }
}
```

### **If Any Environment Variable is `false`:**

❌ **Problem:** Environment variable not set properly

✅ **Fix:** 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure all 3 variables are added:
   - `EDGE_CONFIG`
   - `EDGE_CONFIG_ID`
   - `VERCEL_TOKEN`
3. Make sure each is checked for: **Production**, **Preview**, AND **Development**
4. Redeploy after adding

---

## 🎯 **Step 3: Initialize Edge Config**

Even if environment variables are correct, the Edge Config might not have the `game-data` key yet.

### **Initialize the Database:**

**Method 1: Using curl (Recommended)**

```bash
curl -X POST https://russian-roulette-lyart.vercel.app/api/init-edge-config
```

**Method 2: Using Browser**

You can't POST from browser address bar, so use this tool:
1. Go to: https://reqbin.com/
2. Change method to **POST**
3. Enter URL: `https://russian-roulette-lyart.vercel.app/api/init-edge-config`
4. Click **Send**

**Method 3: Using PowerShell**

```powershell
Invoke-WebRequest -Uri "https://russian-roulette-lyart.vercel.app/api/init-edge-config" -Method POST
```

### **Expected Response:**

```json
{
  "success": true,
  "message": "Edge Config initialized with game-data key",
  "initialData": {
    "leaderboard": {
      "free": [],
      "paid": []
    },
    "prizePool": {
      "totalAmount": 0,
      "participants": 0,
      "lastUpdated": 1234567890
    },
    "playerStats": {}
  }
}
```

✅ **This creates the `game-data` key in your Edge Config store**

---

## 🧪 **Step 4: Test Leaderboard Persistence**

1. **Go to your app:**
   ```
   https://russian-roulette-lyart.vercel.app
   ```

2. **Connect wallet and play a game**

3. **After game ends, check leaderboard:**
   ```
   https://russian-roulette-lyart.vercel.app/api/game?action=leaderboard
   ```

4. **You should see your score:**
   ```json
   {
     "free": [
       {
         "address": "0x...",
         "username": "...",
         "triggerPulls": 5,
         "deaths": 1,
         "maxStreak": 5,
         "rank": 1
       }
     ],
     "paid": []
   }
   ```

5. **Wait 10 minutes, then check again** - your score should still be there! ✅

---

## 🔬 **Step 5: Verify Edge Config Directly**

Check if data is actually being saved to Edge Config:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard

2. **Go to Storage → russian-roulette-store**

3. **Click "View Items"**

4. **You should see:**
   ```
   Key: game-data
   Value: { leaderboard: {...}, prizePool: {...}, playerStats: {...} }
   ```

5. **Click on `game-data` to see the full JSON**

---

## 📊 **Common Issues & Solutions**

### ❌ **Issue 1: "Failed to initialize Edge Config"**

**Possible Causes:**
- Wrong `EDGE_CONFIG_ID`
- Wrong `VERCEL_TOKEN`
- Token doesn't have write permissions

**Solution:**
1. Double-check `EDGE_CONFIG_ID`: `ecfg_xrn7l4fukyhsvpsejvsfix0amgff`
2. Create a new Vercel token with **Full Access**
3. Update the environment variable
4. Redeploy

---

### ❌ **Issue 2: "loadError: Connection refused"**

**Possible Causes:**
- `EDGE_CONFIG` connection string is wrong
- Edge Config not connected to project

**Solution:**
1. Go to Vercel Dashboard → Storage
2. Click **"Connect to Project"** on your Edge Config
3. Select your project
4. This auto-adds the correct `EDGE_CONFIG` variable
5. Redeploy

---

### ❌ **Issue 3: Leaderboard saves but disappears after time**

**Possible Causes:**
- Cache is working, but writes are failing
- Check Vercel function logs

**Solution:**
1. Go to Vercel Dashboard → Your Project → **Logs**
2. Look for errors when leaderboard updates
3. Check for messages like:
   - ❌ "Failed to save to Edge Config"
   - ✅ "Saved data to Edge Config"
4. If you see errors, the issue is with write permissions
5. Recreate `VERCEL_TOKEN` with Full Access

---

### ❌ **Issue 4: "game-data key not found"**

**Solution:**
Run the initialization endpoint (Step 3 above):
```bash
curl -X POST https://russian-roulette-lyart.vercel.app/api/init-edge-config
```

---

## 🎯 **Full Diagnostic Checklist**

Run through this checklist:

- [ ] All 3 environment variables are set in Vercel
  - [ ] `EDGE_CONFIG` (connection string)
  - [ ] `EDGE_CONFIG_ID` (ecfg_xrn7l4fukyhsvpsejvsfix0amgff)
  - [ ] `VERCEL_TOKEN` (API token with Full Access)

- [ ] All variables are set for Production, Preview, AND Development

- [ ] Deployed latest code
  ```bash
  vercel --prod
  ```

- [ ] Debug endpoint shows all environment variables as `true`
  ```
  /api/debug-storage
  ```

- [ ] Initialized Edge Config
  ```bash
  curl -X POST https://your-app.vercel.app/api/init-edge-config
  ```

- [ ] Verified `game-data` key exists in Edge Config
  - Go to Storage → Edge Config → View Items

- [ ] Tested game and checked leaderboard API
  ```
  /api/game?action=leaderboard
  ```

- [ ] Checked Vercel function logs for errors
  - Dashboard → Project → Logs

- [ ] Waited 10+ minutes and data is still there

---

## 🚀 **Expected Behavior After Fix**

✅ **When working correctly:**

1. Player finishes game → Score saved to Edge Config
2. Check `/api/game?action=leaderboard` → Score appears
3. Wait 10 minutes → Score still there
4. Wait 1 day → Score still there
5. New deployment → Score still there
6. All players see same leaderboard globally

---

## 📞 **Still Not Working?**

If you've done all the above and it's still not working, share:

1. **Output of debug endpoint:**
   ```
   https://your-app.vercel.app/api/debug-storage
   ```

2. **Output of initialization:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/init-edge-config
   ```

3. **Output of leaderboard:**
   ```
   https://your-app.vercel.app/api/game?action=leaderboard
   ```

4. **Screenshot of Vercel Environment Variables page**

5. **Screenshot of Edge Config items in Vercel Storage**

And I'll help you debug further! 🔧

