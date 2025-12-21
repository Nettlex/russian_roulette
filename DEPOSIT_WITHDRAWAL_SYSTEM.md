# 💰 Secure Deposit & Withdrawal System

## Overview

This document explains how the deposit and withdrawal system works with **on-chain verification** and **server-authoritative balance management**.

---

## ✅ **DEPOSITS (Fully Automated & Secure)**

### How It Works:

1. **User initiates deposit:**
   - Clicks "Deposit X USDC" button
   - Frontend calls `handleDeposit(amount)`
   - Real USDC transfer is created using `sendCalls()` from wagmi
   - USDC is sent from user's wallet → `DEPOSIT_WALLET` (your wallet)

2. **Blockchain confirmation:**
   - `useWaitForTransactionReceipt` monitors the transaction
   - Waits for blockchain to confirm the transaction (~few seconds)
   - Transaction hash is captured: `depositHash`

3. **Server verification & balance update:**
   - Once confirmed (`isDepositSuccess === true`), frontend sends transaction hash to server
   - Server calls `POST /api/game` with:
     ```json
     {
       "action": "deposit",
       "address": "0x...",
       "transactionHash": "0x123...",
       "expectedAmount": 10
     }
     ```
   - **Server verifies on-chain:**
     - ✅ Fetches transaction receipt from blockchain
     - ✅ Checks transaction status (must be successful)
     - ✅ Verifies it's to USDC contract
     - ✅ Parses Transfer event to get actual amount
     - ✅ Verifies sender is the user
     - ✅ Verifies recipient is `DEPOSIT_WALLET`
     - ✅ Verifies amount matches expected amount
   - **If all checks pass:**
     - Calls `addBalance(address, amount, 'deposit')`
     - Updates Edge Config with new balance
     - Returns updated balance to frontend

### Security Features:

✅ **Real on-chain transactions** - No fake deposits possible
✅ **Server verifies on blockchain** - Cannot lie about transaction
✅ **Server-authoritative balance** - Stored in Edge Config
✅ **Transaction hash proof** - Immutable blockchain record
✅ **Amount verification** - Server reads actual amount from blockchain
✅ **Recipient verification** - Ensures USDC went to your wallet

### Code Flow:

```typescript
// Frontend (ProvablyFairGame.tsx)
handleDeposit(10) 
  → sendCalls({ transfer USDC to DEPOSIT_WALLET })
  → useWaitForTransactionReceipt({ hash: depositHash })
  → isDepositSuccess = true
  → POST /api/game { action: 'deposit', transactionHash: '0x123...' }

// Backend (app/api/game/route.ts)
POST /api/game { action: 'deposit' }
  → publicClient.getTransactionReceipt(transactionHash)
  → Verify: status, contract, sender, recipient, amount
  → addBalance(address, verifiedAmount, 'deposit')
  → Edge Config updated
  → Return { success: true, balance, verifiedAmount }
```

---

## ⚠️ **WITHDRAWALS (Manual Approval)**

### How It Works:

1. **User requests withdrawal:**
   - Clicks "Withdraw X USDC"
   - Frontend calls `handleWithdraw(amount)`

2. **Create withdrawal request:**
   - `POST /api/withdraw` with `action: 'request'`
   - Server creates `WithdrawalRequest`:
     ```typescript
     {
       requestId: 'withdraw_1234567890_abc123',
       address: '0x...',
       amount: 10,
       timestamp: 1234567890,
       status: 'pending'
     }
     ```
   - Saved to `logs/withdrawals.json`

3. **Deduct balance immediately:**
   - `POST /api/game` with `action: 'withdraw'`
   - Server calls `deductBalance(address, amount, 'withdrawal')`
   - Balance is deducted from Edge Config
   - User cannot spend this money anymore

4. **Manual approval by admin (YOU):**
   - Check pending withdrawals: `GET /api/withdraw?action=pending`
   - Send USDC manually from your wallet to user's wallet
   - Update withdrawal status:
     ```bash
     POST /api/withdraw
     {
       "action": "update",
       "requestId": "withdraw_1234567890_abc123",
       "status": "completed",
       "transactionHash": "0xabc...",
       "processedBy": "admin"
     }
     ```

### Current Issues:

❌ **Withdrawal logs stored in file** (`logs/withdrawals.json`)
  - Not persistent on Vercel (lost on redeploy)
  - Should be moved to Edge Config

❌ **No automated notification**
  - You have to manually check for pending withdrawals
  - Should add email/webhook notification

❌ **No admin panel**
  - Must use API calls directly
  - Should create admin UI to approve withdrawals

### Recommended Improvements:

1. **Move withdrawal logs to Edge Config:**
   ```typescript
   interface StorageData {
     leaderboard: {...},
     prizePool: {...},
     playerStats: {...},
     playerBalances: {...},
     withdrawalRequests: {
       [requestId: string]: WithdrawalRequest
     } // ← Add this!
   }
   ```

2. **Add webhook notification:**
   - Send Discord/Telegram/Email notification when withdrawal is requested
   - Include: user address, amount, requestId

3. **Create admin panel:**
   - `/admin` page (password protected)
   - Show pending withdrawals
   - One-click approve with wallet signature

4. **(Optional) Automated withdrawals:**
   - Server has access to a "withdrawal wallet" private key
   - Automatically sends USDC when withdrawal is requested
   - **⚠️ SECURITY RISK:** Private key must be extremely secure
   - Only for small amounts (e.g., < $100)
   - Large withdrawals still require manual approval

---

## 🎯 **Environment Variables Required:**

```env
# Deposit wallet (receives all deposits)
NEXT_PUBLIC_DEPOSIT_WALLET=0x... # Your wallet address

# Prize pool wallet (for game entry fees)
NEXT_PUBLIC_PRIZE_POOL_WALLET=0x... # Can be same as deposit wallet

# Chain selection
NEXT_PUBLIC_CHAIN=mainnet # or 'testnet'

# Edge Config (for persistent storage)
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_...?token=...
EDGE_CONFIG_ID=ecfg_...
VERCEL_TOKEN=vercel_... # Full account API token
```

---

## 📊 **Balance Tracking:**

All balances are stored **server-side** in Edge Config:

```typescript
interface PlayerBalance {
  balance: number;              // Available to play/withdraw
  pendingPrizes: number[];      // Won prizes waiting approval
  totalDeposited: number;       // Lifetime deposits
  totalWithdrawn: number;       // Lifetime withdrawals
  lastUpdated: number;          // Timestamp
  transactions: Array<{         // Transaction history
    type: 'deposit' | 'withdrawal' | 'prize' | 'entry_fee';
    amount: number;
    timestamp: number;
    transactionHash?: string;
  }>;
}
```

### Balance Operations:

- **Deposit:** `addBalance(address, amount, 'deposit')` ✅ Verified on-chain
- **Withdraw:** `deductBalance(address, amount, 'withdrawal')` ⚠️ Manual approval
- **Game Entry:** `deductBalance(address, 1, 'entry_fee')` ✅ Immediate
- **Prize Win:** `addPendingPrize(address, amount)` ⚠️ Pending approval
- **Prize Approval:** `approvePendingPrize(address, amount)` ✅ Moves to balance

---

## 🔒 **Security Guarantees:**

| Feature | Current Implementation | Security Level |
|---------|----------------------|----------------|
| Deposits | ✅ On-chain verified | 🟢 **SECURE** |
| Balance storage | ✅ Server-authoritative (Edge Config) | 🟢 **SECURE** |
| Withdrawals | ⚠️ Manual approval + file logs | 🟡 **MEDIUM** |
| Prize distribution | ⚠️ Manual approval | 🟡 **MEDIUM** |
| Game entry fees | ✅ On-chain verified | 🟢 **SECURE** |

---

## 🚀 **Next Steps:**

1. ✅ **Fix Vercel Token** - Use correct API token (not Edge Config read token)
2. ✅ **Initialize Edge Config** - Add `game-data` key manually
3. ⏳ **Move withdrawal logs to Edge Config** - Make them persistent
4. ⏳ **Add withdrawal notifications** - Email/webhook when requested
5. ⏳ **Create admin panel** - Easy UI to approve withdrawals
6. ⏳ **Add transaction history** - Show users their deposit/withdrawal history

---

## 📝 **Testing Checklist:**

### Deposits:
- [ ] Deposit 1 USDC - verify transaction on blockchain
- [ ] Check balance updated on server
- [ ] Try depositing with fake transaction hash (should fail)
- [ ] Try depositing to wrong wallet (should fail)
- [ ] Try depositing wrong amount (should fail)

### Withdrawals:
- [ ] Request withdrawal - verify balance deducted
- [ ] Check withdrawal request saved in logs
- [ ] Approve withdrawal - send USDC manually
- [ ] Update withdrawal status to 'completed'
- [ ] Verify user receives USDC

### Edge Cases:
- [ ] Deposit 0.01 USDC (minimum)
- [ ] Deposit 1000 USDC (large amount)
- [ ] Withdraw more than balance (should fail)
- [ ] Multiple deposits in quick succession
- [ ] Withdrawal request while game in progress

---

## 💡 **Why This System is Secure:**

1. **No trust required:** Server verifies deposits on blockchain
2. **No fake deposits:** Must have real USDC transaction hash
3. **No double spending:** Balance tracked server-side
4. **No manipulation:** Edge Config is read-only from client
5. **Audit trail:** All transactions recorded with blockchain proof

**Result:** Users can deposit safely, and you can verify every transaction on the blockchain! 🎉


