import { NextRequest, NextResponse } from 'next/server';
import { calculatePrizeDistributionForLeaderboard, saveDistributionLog, getDistributionLogs, PrizeDistribution } from '../../utils/prizeDistribution';
import { loadData, updateLeaderboardEntry, updatePlayerStats, getPlayerStats, updatePrizePool, initStorage, getPlayerBalance, addBalance, deductBalance, addPendingPrize as addPendingPrizeStorage, approvePendingPrize as approvePendingPrizeStorage } from '../../lib/storage';
import { createPublicClient, http, decodeEventLog, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// ✅ FIX: Force Node.js runtime (Edge runtime is stateless and loses data!)
export const runtime = 'nodejs';

// Setup viem client for on-chain verification
const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? base : baseSepolia;
const publicClient = createPublicClient({
  chain,
  transport: http(),
});

// USDC contract addresses
const USDC_ADDRESS = process.env.NEXT_PUBLIC_CHAIN === 'mainnet'
  ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const DEPOSIT_WALLET = process.env.NEXT_PUBLIC_DEPOSIT_WALLET || process.env.NEXT_PUBLIC_PRIZE_POOL_WALLET;
const ETH_DEPOSIT_WALLET = '0x0B9188dCE5f4C8a9eAd3BF4d2fAF1A7AFd7027AA';

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

// Initialize storage on first load
let isInitialized = false;
async function ensureInitialized() {
  if (!isInitialized) {
    await initStorage();
    isInitialized = true;
  }
}

export async function GET(request: NextRequest) {
  console.log('🔄 GET request received');
  await ensureInitialized();
  console.log('✅ Storage initialized');
  // ✅ FIX: Always load fresh data (never use cached getData())
  const data = await loadData();
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const address = searchParams.get('address');

  if (action === 'leaderboard') {
    const mode = searchParams.get('mode') || 'all';
    
    console.log(`📋 Leaderboard request - mode: ${mode}, free: ${data.leaderboard.free.length}, paid: ${data.leaderboard.paid.length}`);
    
    if (mode === 'free') {
      return NextResponse.json({ leaderboard: data.leaderboard.free });
    } else if (mode === 'paid') {
      return NextResponse.json({ 
        leaderboard: data.leaderboard.paid,
        prizePool: data.prizePool 
      });
    }
    
    return NextResponse.json({ 
      free: data.leaderboard.free,
      paid: data.leaderboard.paid,
      prizePool: data.prizePool 
    });
  }

  if (action === 'stats' && address) {
    const stats = await getPlayerStats(address);
    return NextResponse.json({ stats: stats || null });
  }

  if (action === 'balance' && address) {
    // SERVER-AUTHORITATIVE: Get balance from Edge Config
    const balance = await getPlayerBalance(address);
    console.log('💰 Balance fetched for', address, ':', balance);
    return NextResponse.json({ balance });
  }

  if (action === 'prizepool') {
    return NextResponse.json({ prizePool: data.prizePool });
  }

  if (action === 'pendingPrizes' && address) {
    // Get pending prizes from server storage
    const balance = await getPlayerBalance(address);
    console.log('🎁 Pending prizes for', address, ':', balance.pendingPrizes);
    return NextResponse.json({ pendingPrizes: balance.pendingPrizes });
  }

  if (action === 'distributionLogs') {
    const logs = getDistributionLogs();
    return NextResponse.json({ logs });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  await ensureInitialized();
  
  try {
    const body = await request.json();
    const { action, address, username } = body;

    // ========================================
    // SERVER-AUTHORITATIVE GAME EVENTS
    // ========================================
    
    if (action === 'triggerPull') {
      // Server increments trigger pulls
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }

      const existingStats = await getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        maxStreak: 0,
        currentStreak: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      const updatedStats = {
        ...existingStats,
        triggerPulls: (existingStats.triggerPulls || 0) + 1,
        currentStreak: (existingStats.currentStreak || 0) + 1,
        lastPlayed: Date.now(),
      };

      await updatePlayerStats(address, updatedStats);
      await updateLeaderboardEntry(
        updatedStats.isPaid ? 'paid' : 'free',
        {
          address: updatedStats.address,
          username: updatedStats.username || existingStats.username,
          triggerPulls: updatedStats.triggerPulls,
          deaths: updatedStats.deaths || 0,
          maxStreak: updatedStats.maxStreak || 0,
          isPaid: updatedStats.isPaid,
          lastPlayed: updatedStats.lastPlayed,
        }
      );

      console.log('🔫 Trigger pull recorded:', address, 'pulls:', updatedStats.triggerPulls);
      return NextResponse.json({ success: true, stats: updatedStats });
    }

    if (action === 'death') {
      // Server records death and resets streak
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }

      const existingStats = await getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        maxStreak: 0,
        currentStreak: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      const updatedStats = {
        ...existingStats,
        deaths: (existingStats.deaths || 0) + 1,
        maxStreak: Math.max(existingStats.maxStreak || 0, existingStats.currentStreak || 0),
        currentStreak: 0, // Reset on death
        lastPlayed: Date.now(),
      };

      await updatePlayerStats(address, updatedStats);
      await updateLeaderboardEntry(
        updatedStats.isPaid ? 'paid' : 'free',
        {
          address: updatedStats.address,
          username: updatedStats.username || existingStats.username,
          triggerPulls: updatedStats.triggerPulls || 0,
          deaths: updatedStats.deaths,
          maxStreak: updatedStats.maxStreak,
          isPaid: updatedStats.isPaid,
          lastPlayed: updatedStats.lastPlayed,
        }
      );

      console.log('💀 Death recorded:', address, 'deaths:', updatedStats.deaths, 'maxStreak:', updatedStats.maxStreak);
      return NextResponse.json({ success: true, stats: updatedStats });
    }

    if (action === 'cashout') {
      // Server records cashout at 7 pulls
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }

      const existingStats = await getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        maxStreak: 0,
        currentStreak: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      const updatedStats = {
        ...existingStats,
        maxStreak: Math.max(existingStats.maxStreak || 0, 7), // Cash out at 7
        currentStreak: 0, // Reset after cashout
        lastPlayed: Date.now(),
      };

      await updatePlayerStats(address, updatedStats);
      await updateLeaderboardEntry(
        updatedStats.isPaid ? 'paid' : 'free',
        {
          address: updatedStats.address,
          username: updatedStats.username || existingStats.username,
          triggerPulls: updatedStats.triggerPulls || 0,
          deaths: updatedStats.deaths || 0,
          maxStreak: updatedStats.maxStreak,
          isPaid: updatedStats.isPaid,
          lastPlayed: updatedStats.lastPlayed,
        }
      );

      console.log('💰 Cashout recorded:', address, 'maxStreak:', updatedStats.maxStreak);
      return NextResponse.json({ success: true, stats: updatedStats });
    }

    if (action === 'setUsername') {
      // Update username only
      if (!address || !username) {
        return NextResponse.json({ error: 'Missing address or username' }, { status: 400 });
      }

      const existingStats = await getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        maxStreak: 0,
        currentStreak: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      const updatedStats = {
        ...existingStats,
        username,
        lastPlayed: Date.now(),
      };

      await updatePlayerStats(address, updatedStats);
      await updateLeaderboardEntry(
        updatedStats.isPaid ? 'paid' : 'free',
        {
          address: updatedStats.address,
          username: updatedStats.username,
          triggerPulls: updatedStats.triggerPulls || 0,
          deaths: updatedStats.deaths || 0,
          maxStreak: updatedStats.maxStreak || 0,
          isPaid: updatedStats.isPaid,
          lastPlayed: updatedStats.lastPlayed,
        }
      );

      console.log('✏️ Username updated:', address, username);
      return NextResponse.json({ success: true, stats: updatedStats });
    }

    if (action === 'joinPrizePool') {
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }

      // ✅ FIX: Atomic increment (no need to read first!)
      // updatePrizePool will load fresh data internally
      await updatePrizePool({
        incrementAmount: 1,
        incrementParticipants: 1,
      });

      // Update player stats
      const existingStats = await getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      existingStats.isPaid = true;
      await updatePlayerStats(address, existingStats);

      // ✅ FIX: Load fresh data instead of using cache
      const freshData = await loadData();
      return NextResponse.json({ 
        success: true, 
        prizePool: freshData.prizePool 
      });
    }

    if (action === 'distributePrizes') {
      // ✅ FIX: Load fresh data instead of using cache
      const data = await loadData();
      
      // Calculate and distribute prizes to all paid players
      const paidEntries = data.leaderboard.paid.map((entry: any) => ({
        address: entry.address,
        maxStreak: entry.maxStreak || 0,
        totalPulls: entry.triggerPulls || 0,
        totalDeaths: entry.deaths || 0,
      }));

      if (paidEntries.length === 0 || data.prizePool.totalAmount === 0) {
        return NextResponse.json({ 
          error: 'No participants or empty prize pool' 
        }, { status: 400 });
      }

      // Calculate distributions
      const distributions = calculatePrizeDistributionForLeaderboard(
        data.prizePool.totalAmount,
        paidEntries
      );

      // Create distribution log
      const distributionLog = {
        distributionId: distributions[0]?.distributionId || `dist_${Date.now()}`,
        timestamp: Date.now(),
        prizePoolAmount: data.prizePool.totalAmount,
        participants: paidEntries.length,
        distributions,
      };

      // Save log
      saveDistributionLog(distributionLog);

      // Reset prize pool after distribution
      await updatePrizePool({
        totalAmount: 0,
        participants: 0,
      });

      // ✅ FIX: Load fresh data instead of using cache
      const freshDataAfterReset = await loadData();
      return NextResponse.json({ 
        success: true, 
        distribution: distributionLog,
        prizePool: freshDataAfterReset.prizePool 
      });
    }

    if (action === 'approveDistribution') {
      const { distributionId, address: userAddress } = body;
      
      if (!distributionId || !userAddress) {
        return NextResponse.json({ error: 'Missing distributionId or address' }, { status: 400 });
      }

      // Update distribution status in logs
      const logs = getDistributionLogs();
      let found = false;

      logs.forEach(log => {
        if (log.distributionId === distributionId) {
          for (let i = 0; i < log.distributions.length; i++) {
            const dist = log.distributions[i] as PrizeDistribution;
            if (dist.address.toLowerCase() === userAddress.toLowerCase() && dist.status === 'pending') {
              // Create new object with approvedAt property
              log.distributions[i] = {
                ...dist,
                status: 'approved' as const,
                approvedAt: Date.now()
              };
              found = true;
              break;
            }
          }
          if (found) {
            log.approvedBy = userAddress;
            log.approvedAt = Date.now();
          }
        }
      });

      if (!found) {
        return NextResponse.json({ error: 'Distribution not found' }, { status: 404 });
      }

      // Save updated logs
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logsDir, 'prize_distributions.json');
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf-8');
      }

      return NextResponse.json({ success: true, logs });
    }

    // ========================================
    // SERVER-AUTHORITATIVE BALANCE OPERATIONS
    // ========================================

    if (action === 'deposit') {
      // ✅ SECURE: Verify transaction on-chain before crediting balance
      const { transactionHash, expectedAmount, currency = 'USDC' } = body;
      
      if (!address || !transactionHash) {
        return NextResponse.json({ error: 'Missing transaction hash' }, { status: 400 });
      }

      try {
        console.log(`🔍 Verifying ${currency} deposit transaction:`, transactionHash);
        
        // Get transaction receipt from blockchain
        const receipt = await publicClient.getTransactionReceipt({
          hash: transactionHash as `0x${string}`,
        });

        // Verify transaction was successful
        if (receipt.status !== 'success') {
          console.error('❌ Transaction failed on-chain');
          return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
        }

        let transferAmount = 0;
        let usdValue = 0;
        let transferFrom = '';
        let transferTo = '';

        if (currency === 'ETH') {
          // ✅ ETH (native) transaction verification
          // Get actual transaction details
          const tx = await publicClient.getTransaction({
            hash: transactionHash as `0x${string}`,
          });

          transferFrom = tx.from;
          transferTo = tx.to || '';
          transferAmount = Number(tx.value) / 1e18; // ETH has 18 decimals

          // Verify the transfer is from the user
          if (transferFrom.toLowerCase() !== address.toLowerCase()) {
            console.error('❌ Transfer is not from the requesting user');
            return NextResponse.json({ error: 'Invalid transaction: sender mismatch' }, { status: 400 });
          }

          // Verify the transfer is to the ETH deposit wallet
          if (transferTo.toLowerCase() !== ETH_DEPOSIT_WALLET.toLowerCase()) {
            console.error('❌ Transfer is not to the ETH deposit wallet');
            return NextResponse.json({ error: 'Invalid transaction: recipient mismatch' }, { status: 400 });
          }

          // TODO: Convert ETH to USD using price oracle
          // For now, use rough estimate: 1 ETH ≈ $3000 (should use Chainlink oracle in production)
          const ETH_PRICE_USD = 3000; // Replace with Chainlink price feed
          usdValue = transferAmount * ETH_PRICE_USD;

        } else {
          // ✅ USDC transaction verification
          // Verify transaction is to USDC contract
          if (receipt.to?.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
            console.error('❌ Transaction is not to USDC contract');
            return NextResponse.json({ error: 'Invalid transaction: not a USDC transfer' }, { status: 400 });
          }

          // Parse Transfer event from logs to get amount and recipient
          const transferEventAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']);
          
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
              try {
                const decoded = decodeEventLog({
                  abi: transferEventAbi,
                  data: log.data,
                  topics: log.topics,
                });

                if (decoded.eventName === 'Transfer') {
                  transferFrom = decoded.args.from as string;
                  transferTo = decoded.args.to as string;
                  transferAmount = Number(decoded.args.value) / 1_000_000; // USDC has 6 decimals
                  break;
                }
              } catch (e) {
                // Skip logs that don't match Transfer event
                continue;
              }
            }
          }

          // Verify the transfer is from the user
          if (transferFrom.toLowerCase() !== address.toLowerCase()) {
            console.error('❌ Transfer is not from the requesting user');
            return NextResponse.json({ error: 'Invalid transaction: sender mismatch' }, { status: 400 });
          }

          // Verify the transfer is to the deposit wallet
          if (transferTo.toLowerCase() !== DEPOSIT_WALLET?.toLowerCase()) {
            console.error('❌ Transfer is not to the deposit wallet');
            return NextResponse.json({ error: 'Invalid transaction: recipient mismatch' }, { status: 400 });
          }

          // USDC is 1:1 with USD
          usdValue = transferAmount;
        }

        // Verify amount (allow small rounding differences)
        if (expectedAmount && Math.abs(transferAmount - expectedAmount) > 0.0001) {
          console.warn(`⚠️ Amount mismatch: expected ${expectedAmount}, got ${transferAmount}`);
        }

        // ✅ Transaction verified! Credit balance (in USD)
        const updated = await addBalance(address, usdValue, 'deposit');
        console.log(`✅ Deposit verified and recorded: ${address} - ${transferAmount} ${currency} (≈$${usdValue.toFixed(2)})`);
        
        return NextResponse.json({ 
          success: true, 
          balance: updated,
          verifiedAmount: transferAmount,
          currency,
          usdValue,
          transactionHash 
        });
      } catch (error: any) {
        console.error('❌ Error verifying deposit:', error);
        return NextResponse.json({ 
          error: error.message || 'Failed to verify deposit transaction' 
        }, { status: 500 });
      }
    }

    if (action === 'withdraw') {
      // Record withdrawal in server storage
      const { amount } = body;
      
      if (!address || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid withdrawal data' }, { status: 400 });
      }

      try {
        const updated = await deductBalance(address, amount, 'withdrawal');
        console.log('💸 Withdrawal recorded:', address, amount, 'USDC');
        return NextResponse.json({ success: true, balance: updated });
      } catch (error: any) {
        console.error('Error recording withdrawal:', error);
        return NextResponse.json({ 
          error: error.message || 'Failed to record withdrawal' 
        }, { status: 400 });
      }
    }

    if (action === 'approvePrize') {
      // Approve pending prize (move to balance)
      const { amount } = body;
      
      if (!address || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid prize approval data' }, { status: 400 });
      }

      try {
        const updated = await approvePendingPrizeStorage(address, amount);
        console.log('✅ Prize approved:', address, amount, 'USDC');
        return NextResponse.json({ success: true, balance: updated });
      } catch (error: any) {
        console.error('Error approving prize:', error);
        return NextResponse.json({ 
          error: error.message || 'Failed to approve prize' 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Old updateLeaderboard function removed - now using storage module


