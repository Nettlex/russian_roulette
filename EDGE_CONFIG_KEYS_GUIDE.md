# 🔑 Edge Config Keys - Where to Find Them

## 🎯 You Need 3 Keys Total

---

## **KEY 1: EDGE_CONFIG** (Connection String)

### **Where to Get It:**

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard

2. **Click on your project** (russian-roulette)

3. **Go to the "Storage" tab** (top menu)

4. **You should see:**
   - Your Edge Config store: `russian-roulette-store`
   - ID: `ecfg_xrn7l4fukyhsvpsejvsfix0amgff`

5. **Click on the store name** to open it

6. **Look for "Connection String"** at the top
   - It looks like: `https://edge-config.vercel.com/ecfg_xxxxx?token=xxxxx`

7. **COPY THIS ENTIRE STRING**

### **Alternative: Auto-Connect Method**

1. In your project → **Storage** tab
2. Find your Edge Config store
3. Click **"Connect to Project"** button (if you see it)
4. Select your project from dropdown
5. Click **"Connect"**
6. This **automatically** adds `EDGE_CONFIG` to your environment variables!

**✅ RECOMMENDED: Use the auto-connect method**

---

## **KEY 2: EDGE_CONFIG_ID**

### **Where to Get It:**

1. **Go to Vercel Dashboard** → **Storage**
   - https://vercel.com/[your-username]/~/<store-name>

2. **Or:** In your project → Storage tab → Click on your Edge Config store

3. **Look at the top of the page:**
   ```
   ID: ecfg_xrn7l4fukyhsvpsejvsfix0amgff
   ```

4. **Copy just the ID part:** `ecfg_xrn7l4fukyhsvpsejvsfix0amgff`

### **Your Edge Config ID:**
```
ecfg_xrn7l4fukyhsvpsejvsfix0amgff
```

**✅ Copy this exactly as shown above**

---

## **KEY 3: VERCEL_TOKEN** (API Token)

### **Where to Get It:**

1. **Go to Vercel Account Settings:**
   - https://vercel.com/account/tokens
   - Or: Click your profile → **Settings** → **Tokens** (left sidebar)

2. **Click "Create Token"**

3. **Fill out the form:**
   - **Token Name:** `Russian Roulette Edge Config`
   - **Scope:** Select **"Full Access"** (or at minimum "Read-Write")
   - **Expiration:** Choose your preference (recommend: No Expiration)

4. **Click "Create Token"**

5. **⚠️ IMPORTANT:** Copy the token immediately!
   - It looks like: `XGTxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You can only see it once!
   - Store it somewhere safe

6. **If you already created a token:**
   - Use the one you said you have
   - Make sure it has **Read-Write** or **Full Access** permissions

---

## 📝 **How to Add These to Vercel**

### **Method 1: Via Vercel Dashboard (Recommended)**

1. **Go to your project:**
   - https://vercel.com/[your-username]/russian-roulette

2. **Go to Settings → Environment Variables**

3. **Add each variable:**

**Variable 1:**
```
Name: EDGE_CONFIG
Value: [paste the connection string from Storage]
Environment: Production, Preview, Development (check all 3)
```

**Variable 2:**
```
Name: EDGE_CONFIG_ID
Value: ecfg_xrn7l4fukyhsvpsejvsfix0amgff
Environment: Production, Preview, Development (check all 3)
```

**Variable 3:**
```
Name: VERCEL_TOKEN
Value: [paste your API token]
Environment: Production, Preview, Development (check all 3)
```

4. **Click "Save" after each one**

---

### **Method 2: Via Vercel CLI**

```bash
cd russian_roulette

# Add EDGE_CONFIG (auto-added if you connected the store)
vercel env add EDGE_CONFIG

# Add EDGE_CONFIG_ID
vercel env add EDGE_CONFIG_ID
# When prompted, paste: ecfg_xrn7l4fukyhsvpsejvsfix0amgff

# Add VERCEL_TOKEN
vercel env add VERCEL_TOKEN
# When prompted, paste your API token
```

---

## ✅ **Quick Checklist:**

- [ ] **EDGE_CONFIG**: Got from Storage → Edge Config → Connection String (or auto-connected)
- [ ] **EDGE_CONFIG_ID**: `ecfg_xrn7l4fukyhsvpsejvsfix0amgff`
- [ ] **VERCEL_TOKEN**: Created at https://vercel.com/account/tokens
- [ ] All 3 variables added to **Production, Preview, AND Development**
- [ ] Redeployed the app

---

## 🧪 **Test After Setup:**

1. **Redeploy your app:**
   ```bash
   vercel --prod
   ```

2. **Check the debug endpoint:**
   ```
   https://russian-roulette-lyart.vercel.app/api/debug-storage
   ```

3. **You should see:**
   ```json
   {
     "environment": {
       "EDGE_CONFIG": true,
       "EDGE_CONFIG_ID": true,
       "VERCEL_TOKEN": true
     }
   }
   ```

4. **Play the game and check leaderboard persists!**

---

## ❓ **Still Having Issues?**

### **If EDGE_CONFIG is missing:**
- Make sure you clicked "Connect to Project" in the Storage tab
- Or manually copy the connection string from the Edge Config page

### **If EDGE_CONFIG_ID is wrong:**
- Double-check the ID at the top of your Edge Config store page
- It should start with `ecfg_`

### **If VERCEL_TOKEN doesn't work:**
- Make sure the token has **Read-Write** or **Full Access** scope
- Try creating a new token with Full Access
- Make sure you copied the entire token (starts with letters/numbers, no spaces)

### **If variables are set but still not working:**
- Make sure you selected all 3 environments (Production, Preview, Development)
- Redeploy the app after adding variables
- Check for typos in variable names (they're case-sensitive!)

---

## 🎯 **Expected Result:**

After setup, when players finish a game:
- ✅ Leaderboard saves immediately
- ✅ Data persists across reloads
- ✅ All players see the same leaderboard
- ✅ Data never disappears, even after days
- ✅ Prize pool accumulates correctly

---

**Need help? Show me the output of:**
```
https://your-app.vercel.app/api/debug-storage
```

