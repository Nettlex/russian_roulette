import { NextRequest, NextResponse } from 'next/server';
import { calculatePrizeDistributionForLeaderboard, saveDistributionLog, getDistributionLogs, PrizeDistribution } from '../../utils/prizeDistribution';
import { getData, updateLeaderboardEntry, updatePlayerStats, getPlayerStats, updatePrizePool, initStorage } from '../../lib/storage';

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
  await ensureInitialized();
  const data = getData();
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const address = searchParams.get('address');

  if (action === 'leaderboard') {
    const mode = searchParams.get('mode') || 'all';
    
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
    const stats = getPlayerStats(address);
    return NextResponse.json({ stats: stats || null });
  }

  if (action === 'prizepool') {
    return NextResponse.json({ prizePool: data.prizePool });
  }

  if (action === 'pendingPrizes' && address) {
    // Get pending prizes for address from logs
    const logs = getDistributionLogs();
    let totalPending = 0;
    
    logs.forEach(log => {
      log.distributions.forEach(dist => {
        if (dist.address.toLowerCase() === address.toLowerCase() && dist.status === 'pending') {
          totalPending += dist.amount;
        }
      });
    });

    return NextResponse.json({ pendingPrizes: totalPending });
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
    const { action, address, stats, username } = body;

    if (action === 'updateStats') {
      if (!address || !stats) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
      }

      // Get existing stats
      const existingStats = getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        maxStreak: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      const updatedStats = {
        ...existingStats,
        triggerPulls: stats.triggerPulls || existingStats.triggerPulls,
        deaths: stats.deaths || existingStats.deaths,
        maxStreak: stats.maxStreak !== undefined ? Math.max(existingStats.maxStreak || 0, stats.maxStreak) : (existingStats.maxStreak || 0),
        lastPlayed: Date.now(),
        isPaid: stats.isPaid !== undefined ? stats.isPaid : existingStats.isPaid,
        username: username || existingStats.username, // Save username if provided
      };

      // Save player stats
      await updatePlayerStats(address, updatedStats);

      // Update leaderboard
      await updateLeaderboardEntry(
        updatedStats.isPaid ? 'paid' : 'free',
        {
          address: updatedStats.address,
          username: updatedStats.username,
          triggerPulls: updatedStats.triggerPulls || 0,
          deaths: updatedStats.deaths || 0,
          maxStreak: updatedStats.maxStreak || 0,
          isPaid: updatedStats.isPaid || false,
          lastPlayed: updatedStats.lastPlayed || Date.now(),
        }
      );

      return NextResponse.json({ success: true, stats: updatedStats });
    }

    if (action === 'joinPrizePool') {
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }

      // Get current data
      const data = getData();

      // Update prize pool
      await updatePrizePool({
        totalAmount: data.prizePool.totalAmount + 1,
        participants: data.prizePool.participants + 1,
      });

      // Update player stats
      const existingStats = getPlayerStats(address) || {
        address,
        triggerPulls: 0,
        deaths: 0,
        lastPlayed: Date.now(),
        isPaid: false,
      };

      existingStats.isPaid = true;
      await updatePlayerStats(address, existingStats);

      return NextResponse.json({ 
        success: true, 
        prizePool: getData().prizePool 
      });
    }

    if (action === 'distributePrizes') {
      // Get current data
      const data = getData();
      
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

      return NextResponse.json({ 
        success: true, 
        distribution: distributionLog,
        prizePool: getData().prizePool 
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Old updateLeaderboard function removed - now using storage module


