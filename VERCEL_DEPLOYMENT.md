# Vercel Deployment Guide

## Storage Considerations

### Current Setup
The game uses **file-based storage** in `/tmp` directory with in-memory fallback.

### How It Works on Vercel

#### Storage Behavior
- ✅ Data persists while serverless function is "warm" (~5-15 minutes)
- ⚠️ Data clears when function instance is recycled
- ⚠️ Not shared between different regions/instances
- ✅ Good for development and low-traffic apps

#### What This Means
- Leaderboard will persist for 5-15 minutes
- After that, data may reset (when Vercel recycles the function)
- During active play (frequent requests), data stays persistent
- During inactive periods, data may be lost

### Upgrade to Permanent Storage (Optional)

If you need 100% guaranteed persistence:

#### Option 1: Vercel Postgres (Recommended)
```bash
# Install Vercel Postgres
npm install @vercel/postgres

# Add to Vercel project
vercel env add POSTGRES_URL
```

Then update `app/lib/storage.ts`:
```typescript
import { sql } from '@vercel/postgres';

export async function loadData() {
  const { rows } = await sql`SELECT * FROM game_data LIMIT 1`;
  return rows[0]?.data || memoryStore;
}

export async function saveData(data: StorageData) {
  await sql`
    INSERT INTO game_data (id, data, updated_at) 
    VALUES (1, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = NOW()
  `;
}
```

#### Option 2: Vercel KV (Redis)
```bash
# Install Vercel KV
npm install @vercel/kv

# Add to Vercel project via dashboard
```

Then update `app/lib/storage.ts`:
```typescript
import { kv } from '@vercel/kv';

export async function loadData() {
  const data = await kv.get('game_data');
  return data || memoryStore;
}

export async function saveData(data: StorageData) {
  await kv.set('game_data', data);
}
```

#### Option 3: External Database
Use MongoDB, Supabase, PlanetScale, etc.

## Environment Variables

Required for production:

```env
# .env.local
NEXT_PUBLIC_CHAIN=mainnet
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_PRIZE_POOL_WALLET=0xYourWalletAddress
NEXT_PUBLIC_DEPOSIT_WALLET=0xYourWalletAddress

# Optional: Custom storage path
STORAGE_PATH=/tmp/game-data.json
```

Add these to Vercel:
```bash
vercel env add NEXT_PUBLIC_CHAIN
vercel env add NEXT_PUBLIC_USDC_ADDRESS
vercel env add NEXT_PUBLIC_PRIZE_POOL_WALLET
vercel env add NEXT_PUBLIC_DEPOSIT_WALLET
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
# From russian_roulette directory
cd russian_roulette
vercel

# For production
vercel --prod
```

### 4. Configure Environment Variables
Go to Vercel dashboard → Your Project → Settings → Environment Variables

Add all variables from `.env.local`

### 5. Verify Deployment
- Visit your deployment URL
- Check browser console for storage logs
- Play a few rounds
- Check leaderboard
- Wait 5 minutes, refresh, check if data persists

## Monitoring Storage

### Check Logs
In Vercel dashboard → Your Project → Deployments → Functions

Look for:
- `📂 Loaded data from persistent storage` ✅
- `💾 Saved data to persistent storage` ✅
- `⚠️ Using in-memory storage` (warning - fallback mode)
- `⚠️ Could not save to file` (warning - file write failed)

### Expected Behavior
First API call after deployment:
```
⚠️ Using in-memory storage (no persistent file available)
```

After first game action:
```
💾 Saved data to persistent storage
```

Subsequent API calls (while warm):
```
📂 Loaded data from persistent storage
```

After ~15 minutes of inactivity:
```
⚠️ Using in-memory storage (no persistent file available)
```
(This is normal - instance was recycled)

## Troubleshooting

### Issue: Leaderboard keeps resetting
**Cause**: Vercel is recycling function instances frequently (low traffic)

**Solutions**:
1. Accept temporary resets (good for development)
2. Upgrade to Vercel Postgres/KV (permanent storage)
3. Keep site warm with periodic ping (bandaid solution)

### Issue: Username not saving
**Cause**: Stats not syncing to API, or storage not persisting

**Check**:
1. Browser console - look for `📤 Syncing stats to API`
2. Vercel logs - look for `💾 Saved data to persistent storage`
3. Play at least one round after setting username (to trigger sync)

### Issue: Different leaderboards on refresh
**Cause**: Vercel deployed to multiple regions, each with own storage

**Solutions**:
1. Pin deployment to single region (Vercel settings)
2. Use centralized database (Postgres/KV)

### Issue: Storage file not writable
**Cause**: `/tmp` permissions issue (rare)

**Solution**:
Storage automatically falls back to in-memory mode. No action needed for development. For production, use database instead.

## Performance Optimization

### Edge Functions (Optional)
For faster global response times:

```typescript
// app/api/game/route.ts
export const runtime = 'edge'; // Run on Vercel Edge Network
```

Note: `/tmp` not available on Edge Runtime. Must use KV or Postgres.

### Caching
API responses can be cached:

```typescript
export async function GET(request: NextRequest) {
  const data = getData();
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
    }
  });
}
```

## Cost Considerations

### Current Setup (Free)
- ✅ Next.js hosting: Free
- ✅ Serverless functions: Free (100GB-hrs/month)
- ✅ File storage in /tmp: Free
- ✅ Bandwidth: 100GB free/month

### With Database
- **Vercel Postgres**: Free tier (256MB storage)
- **Vercel KV**: Free tier (256MB storage, 3000 commands/day)
- **External DB**: Varies (many have free tiers)

All options have generous free tiers suitable for development and small-scale production.

## Security Notes

1. Never commit `.env.local` to git
2. Set environment variables in Vercel dashboard
3. Prize pool wallet should be a secure multi-sig wallet for production
4. Admin endpoints should require authentication (add later)

## Farcaster Integration

The app is already configured for Farcaster:
- ✅ Mini app SDK integrated
- ✅ Wallet connection works in iframes
- ✅ Manifest at `/.well-known/farcaster.json`
- ✅ Account association configured

After deploying, register your app at:
https://build.base.org/

## Next Steps After Deployment

1. ✅ Deploy to Vercel
2. ✅ Test all features
3. ✅ Set up custom domain (optional)
4. ⏳ Register with Farcaster Base Build
5. ⏳ Post to Base app to launch
6. ⏳ Monitor usage and upgrade storage if needed
7. ⏳ Add analytics (Vercel Analytics, etc.)

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check browser console logs
3. Look for storage log messages
4. Verify environment variables are set
5. Test locally with `vercel dev` first

