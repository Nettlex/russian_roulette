# Storage Issue Explanation & Fix

## The Problem You're Experiencing

**Symptom**: Leaderboard doesn't show saved data until players play again after ~10 minutes.

**What's Actually Happening**:

### On Vercel Serverless Functions:

1. **Player A plays** → Saves data to Function Instance 1's `/tmp` directory
2. **Player B requests leaderboard** → Request goes to Function Instance 2 (different instance/region)
3. **Instance 2 doesn't have the file** → Shows empty leaderboard
4. **After 10 mins or new play** → Eventually hits Instance 1 again OR new data triggers sync

### Why This Happens:

Vercel serverless functions are:
- **Stateless**: Each instance has its own memory and `/tmp` directory
- **Distributed**: Your app runs on multiple instances across regions
- **Ephemeral**: Instances spin up/down constantly
- **Isolated**: Instance A can't see Instance B's `/tmp` folder

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Instance 1     │     │  Instance 2     │     │  Instance 3     │
│  (US-East)      │     │  (US-West)      │     │  (EU)           │
│                 │     │                 │     │                 │
│  /tmp/          │     │  /tmp/          │     │  /tmp/          │
│  ├─game-data ✅│     │  ├─game-data ❌│     │  ├─game-data ❌│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Player A               Player B               Player C
     saves here             sees empty!            sees empty!
```

## Current Enhanced Logging

I've added detailed logging to help you see exactly what's happening:

### Check Vercel Function Logs:

You'll see:
```
🔄 GET request received
✅ Storage initialized
📂 Loaded data from persistent storage: {freeLeaderboard: 3, paidLeaderboard: 1, ...}
📋 Leaderboard request - mode: free, free: 3, paid: 1
```

OR if on a different instance:
```
🔄 GET request received
✅ Storage initialized
⚠️ Using in-memory storage (no persistent file available)
📋 Leaderboard request - mode: free, free: 0, paid: 0
```

## The Proper Solution: Shared Database

You need ONE central database that ALL instances can access:

### Option 1: Vercel Postgres (RECOMMENDED) ✅

**Pros:**
- ✅ Free tier (256MB storage)
- ✅ Fully managed
- ✅ Perfect for Vercel
- ✅ Fast & reliable
- ✅ SQL familiar syntax

**Setup:**

1. **Install package:**
```bash
npm install @vercel/postgres
```

2. **Add database to Vercel project:**
```bash
vercel postgres create
```

Or via dashboard: https://vercel.com/dashboard → Storage → Create Database → Postgres

3. **Get connection string** (automatically added to environment variables)

4. **Create schema:**

Create `app/lib/db/schema.sql`:
```sql
-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) NOT NULL,
  username VARCHAR(50),
  trigger_pulls INT DEFAULT 0,
  deaths INT DEFAULT 0,
  max_streak INT DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  last_played TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(address, is_paid)
);

-- Player stats table
CREATE TABLE IF NOT EXISTS player_stats (
  address VARCHAR(42) PRIMARY KEY,
  username VARCHAR(50),
  trigger_pulls INT DEFAULT 0,
  deaths INT DEFAULT 0,
  max_streak INT DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  last_played TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prize pool table
CREATE TABLE IF NOT EXISTS prize_pool (
  id INT PRIMARY KEY DEFAULT 1,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  participants INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  CHECK (id = 1) -- Only one row
);

-- Initialize prize pool
INSERT INTO prize_pool (id, total_amount, participants)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX idx_leaderboard_streak ON leaderboard(max_streak DESC);
CREATE INDEX idx_leaderboard_paid ON leaderboard(is_paid);
CREATE INDEX idx_player_stats_address ON player_stats(address);
```

5. **Update storage module:**

Replace `app/lib/storage.ts` with:

```typescript
import { sql } from '@vercel/postgres';

interface LeaderboardEntry {
  address: string;
  username?: string;
  triggerPulls: number;
  deaths: number;
  maxStreak: number;
  rank?: number;
  isPaid?: boolean;
  lastPlayed?: number;
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(mode: 'free' | 'paid' | 'all') {
  try {
    if (mode === 'free') {
      const { rows } = await sql`
        SELECT address, username, trigger_pulls as "triggerPulls", 
               deaths, max_streak as "maxStreak", is_paid as "isPaid",
               EXTRACT(EPOCH FROM last_played) * 1000 as "lastPlayed"
        FROM leaderboard 
        WHERE is_paid = false
        ORDER BY max_streak DESC, trigger_pulls DESC, deaths ASC
        LIMIT 50
      `;
      return { free: rows };
    } else if (mode === 'paid') {
      const { rows } = await sql`
        SELECT address, username, trigger_pulls as "triggerPulls", 
               deaths, max_streak as "maxStreak", is_paid as "isPaid",
               EXTRACT(EPOCH FROM last_played) * 1000 as "lastPlayed"
        FROM leaderboard 
        WHERE is_paid = true
        ORDER BY max_streak DESC, trigger_pulls DESC, deaths ASC
        LIMIT 50
      `;
      return { paid: rows };
    } else {
      const free = await sql`
        SELECT address, username, trigger_pulls as "triggerPulls", 
               deaths, max_streak as "maxStreak", is_paid as "isPaid",
               EXTRACT(EPOCH FROM last_played) * 1000 as "lastPlayed"
        FROM leaderboard 
        WHERE is_paid = false
        ORDER BY max_streak DESC, trigger_pulls DESC, deaths ASC
        LIMIT 50
      `;
      const paid = await sql`
        SELECT address, username, trigger_pulls as "triggerPulls", 
               deaths, max_streak as "maxStreak", is_paid as "isPaid",
               EXTRACT(EPOCH FROM last_played) * 1000 as "lastPlayed"
        FROM leaderboard 
        WHERE is_paid = true
        ORDER BY max_streak DESC, trigger_pulls DESC, deaths ASC
        LIMIT 50
      `;
      return { free: free.rows, paid: paid.rows };
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return mode === 'free' ? { free: [] } : mode === 'paid' ? { paid: [] } : { free: [], paid: [] };
  }
}

/**
 * Update leaderboard entry
 */
export async function updateLeaderboardEntry(
  mode: 'free' | 'paid',
  entry: LeaderboardEntry
) {
  try {
    await sql`
      INSERT INTO leaderboard (
        address, username, trigger_pulls, deaths, max_streak, 
        is_paid, last_played, updated_at
      ) VALUES (
        ${entry.address},
        ${entry.username || null},
        ${entry.triggerPulls},
        ${entry.deaths},
        ${entry.maxStreak},
        ${mode === 'paid'},
        NOW(),
        NOW()
      )
      ON CONFLICT (address, is_paid) 
      DO UPDATE SET
        username = COALESCE(${entry.username}, leaderboard.username),
        trigger_pulls = ${entry.triggerPulls},
        deaths = ${entry.deaths},
        max_streak = GREATEST(leaderboard.max_streak, ${entry.maxStreak}),
        last_played = NOW(),
        updated_at = NOW()
    `;
    
    console.log('✅ Leaderboard entry updated in database:', entry.address);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}

/**
 * Get player stats
 */
export async function getPlayerStats(address: string) {
  try {
    const { rows } = await sql`
      SELECT address, username, trigger_pulls as "triggerPulls",
             deaths, max_streak as "maxStreak", is_paid as "isPaid",
             EXTRACT(EPOCH FROM last_played) * 1000 as "lastPlayed"
      FROM player_stats
      WHERE address = ${address}
    `;
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return null;
  }
}

/**
 * Update player stats
 */
export async function updatePlayerStats(address: string, stats: any) {
  try {
    await sql`
      INSERT INTO player_stats (
        address, username, trigger_pulls, deaths, max_streak, 
        is_paid, last_played, updated_at
      ) VALUES (
        ${address},
        ${stats.username || null},
        ${stats.triggerPulls || 0},
        ${stats.deaths || 0},
        ${stats.maxStreak || 0},
        ${stats.isPaid || false},
        NOW(),
        NOW()
      )
      ON CONFLICT (address)
      DO UPDATE SET
        username = COALESCE(${stats.username}, player_stats.username),
        trigger_pulls = ${stats.triggerPulls || 0},
        deaths = ${stats.deaths || 0},
        max_streak = GREATEST(player_stats.max_streak, ${stats.maxStreak || 0}),
        is_paid = ${stats.isPaid || false},
        last_played = NOW(),
        updated_at = NOW()
    `;
    
    console.log('✅ Player stats updated in database:', address);
  } catch (error) {
    console.error('Error updating player stats:', error);
  }
}

/**
 * Get prize pool
 */
export async function getPrizePool() {
  try {
    const { rows } = await sql`
      SELECT total_amount as "totalAmount", 
             participants,
             EXTRACT(EPOCH FROM last_updated) * 1000 as "lastUpdated"
      FROM prize_pool
      WHERE id = 1
    `;
    return rows[0] || { totalAmount: 0, participants: 0, lastUpdated: Date.now() };
  } catch (error) {
    console.error('Error fetching prize pool:', error);
    return { totalAmount: 0, participants: 0, lastUpdated: Date.now() };
  }
}

/**
 * Update prize pool
 */
export async function updatePrizePool(update: {
  totalAmount?: number;
  participants?: number;
}) {
  try {
    const current = await getPrizePool();
    
    await sql`
      UPDATE prize_pool
      SET total_amount = ${update.totalAmount !== undefined ? update.totalAmount : current.totalAmount},
          participants = ${update.participants !== undefined ? update.participants : current.participants},
          last_updated = NOW()
      WHERE id = 1
    `;
    
    console.log('✅ Prize pool updated in database');
  } catch (error) {
    console.error('Error updating prize pool:', error);
  }
}

// No initStorage needed - database is always available!
export async function initStorage() {
  console.log('✅ Using Postgres database - no initialization needed');
}

// For backwards compatibility
export async function getData() {
  const leaderboard = await getLeaderboard('all');
  const prizePool = await getPrizePool();
  return {
    leaderboard,
    prizePool,
    playerStats: {}, // Not needed with direct queries
  };
}
```

6. **Update API routes:**

`app/api/game/route.ts` now just uses the storage functions directly - they'll automatically query the database!

7. **Run schema migration:**

Create `scripts/migrate.ts`:
```typescript
import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const schema = fs.readFileSync(
    path.join(__dirname, '../app/lib/db/schema.sql'),
    'utf-8'
  );
  
  await sql.query(schema);
  console.log('✅ Database schema created');
}

migrate().catch(console.error);
```

Run: `npx tsx scripts/migrate.ts`

### Option 2: Vercel KV (Redis)

**Pros:**
- ✅ Free tier (256MB, 3000 commands/day)
- ✅ Very fast (in-memory)
- ✅ Simple key-value storage
- ✅ Good for caching + leaderboard

**Best for:** High-read scenarios, simpler than SQL

**Setup:** Similar to Postgres but uses Redis commands

### Option 3: External Database

- **Supabase** (Postgres + realtime)
- **PlanetScale** (MySQL)
- **MongoDB Atlas**
- **Neon** (Serverless Postgres)

All have free tiers and work great with Vercel.

## Temporary Workaround (Not Recommended)

If you want to stick with file storage for now:

### Pin to Single Region

In `vercel.json`:
```json
{
  "regions": ["iad1"]
}
```

This forces all requests to one region = one instance = shared /tmp.

**Downsides:**
- Slower for global users
- Single point of failure
- Still resets every ~15 min

## Recommendation

🎯 **Use Vercel Postgres**

It's the proper solution and takes ~10 minutes to set up. The free tier is more than enough for thousands of users.

**Migration is easy:**
1. Install package
2. Create database
3. Replace storage.ts
4. Deploy

Your leaderboard will work perfectly and persist forever!

## Summary

Current setup works for:
- ✅ Development/testing
- ✅ Single-region low-traffic apps
- ⚠️ Temporary storage OK

Production needs:
- ✅ Vercel Postgres (recommended)
- ✅ Vercel KV
- ✅ External database

Choose based on:
- **Postgres**: Complex queries, relations, guaranteed persistence
- **KV/Redis**: Simple data, super fast, great for caching
- **File storage**: Dev only, not production-ready

---

*Ready to migrate? Let me know and I'll help you set it up!*


