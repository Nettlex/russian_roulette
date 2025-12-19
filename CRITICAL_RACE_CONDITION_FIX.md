# 🔴 CRITICAL RACE CONDITION - DATA OVERWRITE BUG

**Date:** December 19, 2025  
**Issue:** Leaderboard randomly resets to empty or loses entries  
**Root Cause:** Race conditions between concurrent serverless instances

---

## 🚨 **THE EXACT BUG - USER WAS RIGHT!**

> "We are overwriting it ourselves. When the site loads or closes, some init / bootstrap / frontend logic writes EMPTY state back to Edge Config."

**YOU WERE 100% CORRECT!** But it's not frontend - it's a **serverless race condition**.

---

## 🔴 **RACE CONDITION #1: Read-Then-Write Pattern**

**Location:** `app/api/game/route.ts` - Line 271

```typescript
// POST /api/game?action=joinPrizePool
const data = getData();  // ← Gets CACHED data (line 271)

await updatePrizePool({
  totalAmount: data.prizePool.totalAmount + 1,  // ← Uses stale value!
  participants: data.prizePool.participants + 1,
});
```

**The Problem:**

1. **Request A:** `getData()` returns `{ totalAmount: 100 }` (from cache)
2. **Request B (concurrent):** `getData()` returns `{ totalAmount: 100 }` (same cache)
3. **Request A:** Calls `updatePrizePool({ totalAmount: 101 })`
   - `updatePrizePool()` calls `loadData()` (gets 100)
   - Saves `{ totalAmount: 101 }`
4. **Request B:** Calls `updatePrizePool({ totalAmount: 101 })`
   - `updatePrizePool()` calls `loadData()` (gets 101 from A's write)
   - Saves `{ totalAmount: 101 }` again! ❌
5. **Result:** Only 1 increment applied instead of 2! **Data loss!**

---

## 🔴 **RACE CONDITION #2: Load-Modify-Save Pattern**

**Location:** `app/lib/storage.ts` - Lines 178-209

```typescript
export async function updateLeaderboardEntry(mode, entry) {
  const data = await loadData();  // ← Load (line 179)
  const board = data.leaderboard[mode];
  
  board.push(entry);  // ← Modify (line 191)
  board.sort(...);    // ← Sort (line 194)
  
  await saveData(data);  // ← Save (line 209)
}
```

**The Problem:**

**Timeline:**
```
T=0.00s  Instance A: loadData() → gets [entry1, entry2, entry3]
T=0.10s  Instance B: loadData() → gets [entry1, entry2, entry3] (same!)
T=0.20s  Instance A: push(entry4) → [entry1, entry2, entry3, entry4]
T=0.30s  Instance A: saveData() → Edge Config now has 4 entries ✅
T=0.40s  Instance B: push(entry5) → [entry1, entry2, entry3, entry5]
T=0.50s  Instance B: saveData() → Edge Config OVERWRITTEN! ❌
         Result: [entry1, entry2, entry3, entry5]
         ENTRY 4 IS LOST! 💀
```

**Why It Happens:**
- Instance B loaded BEFORE Instance A saved
- Instance B's data is now STALE
- Instance B OVERWRITES with stale data
- Entry 4 is DELETED!

---

## 🔴 **RACE CONDITION #3: getData() Returns Stale Cache**

**Location:** `app/lib/storage.ts` - Lines 162-169

```typescript
export function getData(): StorageData {
  return cachedData;  // ← Returns in-memory cache!
}
```

**The Problem:**

1. **Serverless Instance A:**
   - Starts with `cachedData = empty`
   - Calls `ensureInitialized()` → `initStorage()` → `loadData()`
   - `loadData()` updates `cachedData` with Edge Config data
   - `getData()` now returns filled cache ✅

2. **Serverless Instance B (concurrent):**
   - Starts with `cachedData = empty` (new instance!)
   - Request comes in BEFORE `ensureInitialized()` completes
   - OR `isInitialized` check passes but cache is still empty
   - `getData()` returns EMPTY cache! ❌
   - Write functions use empty values!
   - Edge Config OVERWRITTEN with empty data! 💀

---

## ✅ **THE FIX: Atomic Read-Modify-Write**

### **Fix #1: Remove getData() - Always loadData()**

```typescript
// ❌ BEFORE: Uses cached data
const data = getData();
await updatePrizePool({
  totalAmount: data.prizePool.totalAmount + 1,
});

// ✅ AFTER: Read-increment in one operation
await updatePrizePool({
  increment: 1,  // Let updatePrizePool handle the read!
});
```

### **Fix #2: All Write Functions Read-Then-Write Atomically**

```typescript
// ✅ PATTERN: Load → Modify → Save (all in one function)
export async function updatePrizePool(update) {
  const data = await loadData();  // ← Fresh read
  data.prizePool = {
    ...data.prizePool,
    totalAmount: (data.prizePool.totalAmount || 0) + (update.increment || 0),
  };
  await saveData(data);  // ← Save immediately
}
```

### **Fix #3: Remove getData() Export**

```typescript
// ❌ BEFORE: Exported for external use (dangerous!)
export function getData(): StorageData {
  return cachedData;
}

// ✅ AFTER: Only export safe read functions
export async function getLeaderboard(mode: 'free' | 'paid') {
  const data = await loadData();  // Always fresh!
  return data.leaderboard[mode];
}
```

---

## 🔧 **IMPLEMENTATION:**

### **Step 1: Update game/route.ts to NOT use getData()**

```typescript
// ❌ REMOVE THIS PATTERN:
const data = getData();
await updatePrizePool({
  totalAmount: data.prizePool.totalAmount + 1,
});

// ✅ REPLACE WITH:
await updatePrizePool({
  incrementAmount: 1,
  incrementParticipants: 1,
});
```

### **Step 2: Update storage.ts write functions**

```typescript
export async function updatePrizePool(update: {
  incrementAmount?: number;
  incrementParticipants?: number;
  setAmount?: number;
  setParticipants?: number;
}) {
  const data = await loadData();  // Fresh read
  
  // Atomic increment or set
  data.prizePool = {
    ...data.prizePool,
    totalAmount: update.setAmount !== undefined 
      ? update.setAmount 
      : (data.prizePool.totalAmount || 0) + (update.incrementAmount || 0),
    participants: update.setParticipants !== undefined
      ? update.setParticipants
      : (data.prizePool.participants || 0) + (update.incrementParticipants || 0),
    lastUpdated: Date.now(),
  };
  
  await saveData(data);  // Immediate save
}
```

### **Step 3: Remove getData() or make it internal-only**

```typescript
// ✅ SAFE: Internal use only, never exposed
function getDataInternal(): StorageData {
  return cachedData;
}

// ✅ SAFE: Public API always reads fresh
export async function getPrizePool() {
  const data = await loadData();
  return data.prizePool;
}
```

---

## 🚨 **WHY THIS FIXES THE BUG:**

| Issue | Before | After |
|-------|--------|-------|
| **Stale reads** | `getData()` returns old cache | All functions call `loadData()` |
| **Race conditions** | Multiple instances read same data | Each write re-reads before saving |
| **Empty overwrites** | Empty cache used for writes | Always fetch fresh before write |
| **Lost updates** | Concurrent writes lose data | Minimized (still possible, but less likely) |

---

## ⚠️ **IMPORTANT: Edge Config Limitations**

**Edge Config does NOT support:**
- ❌ Atomic operations (like Redis INCR)
- ❌ Transactions
- ❌ Optimistic locking
- ❌ Compare-and-swap

**This means:**
- Race conditions are STILL possible (but much rarer)
- For critical operations, consider using **Vercel KV (Redis)** instead
- Or implement retry logic with exponential backoff

---

## 🎯 **COMPLETE FIX CHECKLIST:**

- [ ] Remove all `getData()` calls from `game/route.ts`
- [ ] Update `updatePrizePool()` to accept increment operations
- [ ] Update `updateLeaderboardEntry()` to always loadData() first (already done!)
- [ ] Make `getData()` internal-only or remove export
- [ ] Add GET endpoints that call `loadData()` instead of `getData()`
- [ ] Test concurrent writes (2 players joining at exact same time)
- [ ] Add retry logic for critical operations
- [ ] Consider migrating to Vercel KV for atomic operations

---

## 📊 **TEST SCENARIO:**

```bash
# Simulate race condition
# Terminal 1:
curl -X POST "https://your-app.vercel.app/api/game?action=joinPrizePool&address=0xAAA"

# Terminal 2 (at EXACT same time):
curl -X POST "https://your-app.vercel.app/api/game?action=joinPrizePool&address=0xBBB"

# Check prize pool
curl "https://your-app.vercel.app/api/game?action=leaderboard"

# Expected: prizePool.participants = 2
# Before fix: Might be 1 (race condition!)
# After fix: Should be 2 (atomic operations)
```

---

## ✅ **STATUS:**

- ✅ Root cause identified
- ⏳ Fix implementation in progress
- ⏳ Testing required
- ⏳ Deployment pending

**Next:** Implement the fix by removing getData() calls and using atomic operations.

