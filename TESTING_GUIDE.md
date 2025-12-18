# Testing Guide - Russian Roulette Game

## Quick Start Testing

### Local Development
```bash
cd russian_roulette
npm run dev
# Visit http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
# Visit http://localhost:3000
```

---

## Test Cases

### 🎯 Priority 1: Critical Fixes

#### Test 1: Cash Out Flow (BLACK SCREEN FIX)
**Steps:**
1. Open the game
2. Connect wallet
3. Click "Load Bullet"
4. Keep pulling trigger until you survive 7 times
5. When decision screen appears, click "💰 Cash Out (Lock in 7)"
6. **VERIFY**: Game returns to ready state (bullet loading screen)
7. **VERIFY**: No black screen appears
8. **VERIFY**: Max streak updated to 7 (check Profile tab)
9. Click "Load Bullet" again
10. **VERIFY**: New round starts normally

**Expected Result:** ✅ No black screen, smooth transition back to ready state

**Debug Logs to Check:**
```
💰 Cash out at 7
✅ Game reset to ready state after cash out
```

---

#### Test 2: Leaderboard Persistence (STORAGE FIX)
**Steps:**
1. Open browser console (F12)
2. Play the game (fire trigger at least once)
3. **CHECK CONSOLE** for:
   ```
   📤 Syncing stats to API
   ✅ Stats synced: {...}
   ```
4. Go to Leaderboard tab
5. **CHECK CONSOLE** for:
   ```
   📊 Leaderboard entry: {...}
   ```
6. **VERIFY**: Your entry appears on leaderboard
7. **IMPORTANT**: Keep tab open for 5 minutes (or deploy to Vercel)
8. Refresh the page
9. Go to Leaderboard tab again
10. **VERIFY**: Your stats are still there

**Local Expected Result:** ✅ Stats persist in API (server memory)
**Vercel Expected Result:** ✅ Stats persist for ~5-15 minutes

**Server Logs to Check:**
First run:
```
⚠️ Using in-memory storage (no persistent file available)
```

After playing:
```
💾 Saved data to persistent storage
```

Next API call:
```
📂 Loaded data from persistent storage
```

---

### 🎨 Priority 2: UI/UX Features

#### Test 3: Username Feature
**Steps:**
1. Go to Profile tab
2. Click the ✏️ (edit) button next to "Anonymous"
3. Enter username: "TestPlayer123"
4. Click "Save"
5. **CHECK CONSOLE** for:
   ```
   ✅ Username saved: TestPlayer123 for address: 0x...
   ```
6. **VERIFY**: Profile shows "TestPlayer123"
7. Play the game (fire at least one shot)
8. **CHECK CONSOLE** for:
   ```
   📤 Syncing stats to API: {username: "TestPlayer123", ...}
   ```
9. Go to Leaderboard tab
10. **CHECK CONSOLE** for:
    ```
    📊 Leaderboard entry: {username: "TestPlayer123", ...}
    ```
11. **VERIFY**: Leaderboard shows:
    ```
    🥇 TestPlayer123
       0x1234...5678
    ```

**Expected Result:** ✅ Username displays above address on leaderboard

---

#### Test 4: Explosion Video
**Steps:**
1. Play game until you die (bullet hits)
2. **VERIFY**: Explosion video plays once (not twice)
3. **VERIFY**: Video doesn't lag or stutter
4. **VERIFY**: Video closes after ~3 seconds automatically
5. **VERIFY**: Can't pull trigger during video playback

**Expected Result:** ✅ Smooth video playback, no double play

---

#### Test 5: Chamber Rotation
**Steps:**
1. Load bullet
2. Pull trigger multiple times
3. **VERIFY**: Chamber rotates smoothly (300ms)
4. **VERIFY**: No lag or jank
5. **VERIFY**: Rotation is visible between shots

**Expected Result:** ✅ Smooth, fast rotation

---

### 💰 Priority 3: Payment Features

#### Test 6: Deposit (Testnet Only!)
**Prerequisites:** 
- Using Base Sepolia (testnet)
- Have test USDC in wallet
- Connected wallet

**Steps:**
1. After first death, modal appears
2. Click "💵 Play with 1 USDC entry fee"
3. Click "Deposit 1 USDC"
4. **VERIFY**: Wallet transaction prompt appears
5. Approve transaction
6. **VERIFY**: Transaction includes builder code `bc_t0xxtf9a`
7. Wait for confirmation
8. **VERIFY**: Modal closes, game continues

**Expected Result:** ✅ Real USDC deposit works with builder code

---

#### Test 7: Builder Code Attribution
**Steps:**
1. Make any USDC transaction (deposit or entry fee)
2. Open wallet transaction details
3. **VERIFY**: Transaction data includes builder code attribution
4. Check transaction on BaseScan
5. **VERIFY**: Extra data appended to transaction

**Expected Result:** ✅ Builder code present in all USDC txns

---

### 🔌 Priority 4: Farcaster Integration

#### Test 8: Farcaster Wallet Connection
**Prerequisites:**
- Access to Farcaster app or frame tester
- Or use iframe to simulate

**Steps:**
1. Open game in Farcaster miniapp context
2. **CHECK CONSOLE** for:
   ```
   🎯 Farcaster wallet detected: 0x...
   ```
3. **VERIFY**: Wallet address auto-detected
4. **VERIFY**: No "Connect Wallet" button shows (already connected)
5. Click "Load Bullet"
6. **VERIFY**: Game works normally
7. Make a transaction
8. **VERIFY**: Uses Farcaster wallet

**Expected Result:** ✅ Auto-connects in Farcaster context

---

#### Test 9: Farcaster Manifest
**Steps:**
1. Visit: `https://your-domain.com/.well-known/farcaster.json`
2. **VERIFY**: JSON loads without errors
3. **VERIFY**: All URLs include `https://` protocol
4. **VERIFY**: No duplicate keys
5. Use Base Build preview tool
6. **VERIFY**: App preview works
7. **VERIFY**: Launch button works

**Expected Result:** ✅ Valid manifest, passes Base Build checks

---

### 📊 Priority 5: Game Logic

#### Test 10: Prize Distribution
**Steps:**
1. Simulate multiple paid players (via API or manual)
2. Trigger prize distribution
3. **VERIFY**: Distribution follows new rules:
   - 1st place: 40%
   - 2nd place: 25%
   - 3rd place: 15%
   - Remaining players: 10% split equally
   - House: 10%

**Expected Result:** ✅ Correct prize distribution percentages

---

#### Test 11: Stats Tracking
**Steps:**
1. Play multiple rounds
2. Track these stats:
   - Total pulls
   - Total deaths
   - Max streak
   - Score
3. Go to Profile
4. **VERIFY**: All stats accurate
5. Go to Leaderboard
6. **VERIFY**: Your ranking is correct
7. **VERIFY**: Score calculation is correct:
   ```
   score = maxStreak × (1 + deaths/pulls)
   ```

**Expected Result:** ✅ Accurate stat tracking and scoring

---

## Browser Testing Matrix

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile Firefox

### Farcaster
- [ ] Warpcast app (iOS)
- [ ] Warpcast app (Android)
- [ ] Base app

---

## Network Testing

### Testnet (Base Sepolia)
- [ ] Wallet connection
- [ ] USDC deposits
- [ ] Builder code attribution
- [ ] Transaction confirmations

### Mainnet (Base)
**⚠️ ONLY AFTER THOROUGH TESTNET TESTING!**
- [ ] Small amount first (0.01 USDC)
- [ ] Verify all flows
- [ ] Monitor transactions

---

## Performance Testing

### Load Time
- [ ] Initial page load <3s
- [ ] Interactive <5s
- [ ] Lighthouse score >90

### Responsiveness
- [ ] Trigger response instant
- [ ] Chamber rotation smooth
- [ ] Video playback smooth
- [ ] No UI jank

### API Performance
- [ ] Leaderboard loads <1s
- [ ] Stats sync <500ms
- [ ] No rate limiting issues

---

## Error Handling Testing

### Network Errors
1. Disconnect internet
2. Try to sync stats
3. **VERIFY**: Graceful error handling

### Wallet Errors
1. Reject transaction
2. **VERIFY**: App doesn't crash
3. **VERIFY**: User can try again

### Storage Errors
1. Fill localStorage
2. **VERIFY**: App uses fallback
3. **VERIFY**: No data loss

---

## Regression Testing

After any changes, re-run:
- [ ] Cash out flow
- [ ] Username system
- [ ] Leaderboard persistence
- [ ] Wallet connection

---

## Debug Mode

### Enable Verbose Logging
All major actions already have console logs:
- `🔫 PULL` - Trigger pulled
- `💰 Cash out` - Cash out chosen
- `✅ Username saved` - Username saved
- `📤 Syncing stats` - Stats syncing to API
- `📊 Leaderboard entry` - Leaderboard data
- `📂 Loaded data` - Storage loaded
- `💾 Saved data` - Storage saved

### Check for Errors
Open console, filter by "error":
```javascript
// Should be empty (no errors)
```

---

## Automated Testing (Future)

### Unit Tests
```bash
npm run test
```

### E2E Tests (Playwright)
```bash
npx playwright test
```

### Integration Tests
```bash
npm run test:integration
```

---

## Reporting Issues

### Issue Template
```
**Test Case:** Test 1 - Cash Out Flow
**Browser:** Chrome 120.0.0
**Network:** Base Sepolia
**Steps to Reproduce:**
1. ...
2. ...

**Expected:** No black screen
**Actual:** Black screen appears

**Console Logs:**
```
[Paste relevant logs]
```

**Screenshots:** [Attach if applicable]
```

---

## Sign-Off Checklist

Before deploying to production:

### Functionality
- [ ] All Priority 1 tests passing
- [ ] All Priority 2 tests passing
- [ ] All Priority 3 tests passing (testnet)
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No linter warnings

### Performance
- [ ] Load time acceptable
- [ ] Smooth animations
- [ ] No memory leaks

### Security
- [ ] Environment variables set
- [ ] No sensitive data in console
- [ ] Wallet transactions secure

### Documentation
- [ ] README updated
- [ ] Changelog updated
- [ ] Deployment guide reviewed

---

*Last updated: December 17, 2025*



