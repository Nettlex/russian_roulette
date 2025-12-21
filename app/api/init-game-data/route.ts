import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

// ✅ Force Node.js runtime
export const runtime = 'nodejs';

/**
 * PRODUCTION-SAFE Edge Config Initialization
 * 
 * CRITICAL RULES:
 * 1. ONLY creates game-data if it doesn't exist
 * 2. NEVER overwrites existing data
 * 3. Uses EXACT TypeScript interfaces from our codebase
 */

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

interface PlayerBalance {
  balance: number;
  pendingPrizes: number;
  totalDeposited: number;
  totalWithdrawn: number;
  lastUpdated: number;
}

interface StorageData {
  leaderboard: {
    free: LeaderboardEntry[];
    paid: LeaderboardEntry[];
  };
  prizePool: {
    totalAmount: number;
    participants: number;
    lastUpdated: number;
  };
  playerStats: Record<string, any>;
  playerBalances: Record<string, PlayerBalance>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Checking if game-data key exists in Edge Config...');
    
    // ✅ STEP 1: Check if game-data already exists
    const existingData = await get<StorageData>('game-data');
    
    if (existingData) {
      console.log('✅ game-data already exists - SKIPPING initialization to preserve data');
      console.log('📊 Current state:', {
        freeLeaderboard: existingData.leaderboard?.free?.length || 0,
        paidLeaderboard: existingData.leaderboard?.paid?.length || 0,
        playerStats: Object.keys(existingData.playerStats || {}).length,
        playerBalances: Object.keys(existingData.playerBalances || {}).length,
        prizePool: existingData.prizePool
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'game-data already exists (data preserved)',
        action: 'skipped',
        currentData: {
          freeLeaderboard: existingData.leaderboard?.free?.length || 0,
          paidLeaderboard: existingData.leaderboard?.paid?.length || 0,
          playerStats: Object.keys(existingData.playerStats || {}).length,
          playerBalances: Object.keys(existingData.playerBalances || {}).length,
          prizePoolAmount: existingData.prizePool?.totalAmount || 0,
          prizePoolParticipants: existingData.prizePool?.participants || 0
        }
      });
    }
    
    // ✅ STEP 2: game-data doesn't exist - create it safely
    console.log('⚠️ game-data does NOT exist - initializing with empty structure...');
    
    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const vercelToken = process.env.VERCEL_TOKEN;
    
    if (!edgeConfigId || !vercelToken) {
      console.error('❌ Missing EDGE_CONFIG_ID or VERCEL_TOKEN');
      return NextResponse.json({ 
        error: 'Server misconfiguration',
        details: 'Missing environment variables',
        missing: {
          edgeConfigId: !edgeConfigId,
          vercelToken: !vercelToken
        }
      }, { status: 500 });
    }
    
    // ✅ EXACT initial data structure matching our TypeScript interfaces
    const initialData: StorageData = {
      leaderboard: {
        free: [],
        paid: []
      },
      prizePool: {
        totalAmount: 0,
        participants: 0,
        lastUpdated: Date.now()
      },
      playerStats: {},
      playerBalances: {}
    };
    
    console.log('🔄 Creating game-data key in Edge Config...');
    
    // ✅ STEP 3: Create game-data key via Vercel API
    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'upsert',
              key: 'game-data',
              value: initialData
            }
          ]
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to create game-data:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      return NextResponse.json({ 
        error: 'Failed to initialize Edge Config',
        status: response.status,
        details: error 
      }, { status: 500 });
    }
    
    const result = await response.json();
    console.log('✅ game-data key created successfully!');
    console.log('📊 Initial structure:', initialData);
    
    return NextResponse.json({ 
      success: true,
      message: 'game-data initialized successfully',
      action: 'created',
      initialData,
      vercelResponse: result
    });
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // ✅ Safe read - check current state
    const existingData = await get<StorageData>('game-data');
    
    if (existingData) {
      return NextResponse.json({
        exists: true,
        message: 'game-data key exists',
        data: {
          freeLeaderboard: existingData.leaderboard?.free?.length || 0,
          paidLeaderboard: existingData.leaderboard?.paid?.length || 0,
          playerStats: Object.keys(existingData.playerStats || {}).length,
          playerBalances: Object.keys(existingData.playerBalances || {}).length,
          prizePool: existingData.prizePool
        }
      });
    } else {
      return NextResponse.json({
        exists: false,
        message: 'game-data key does NOT exist - call POST to initialize',
        instruction: 'POST to /api/init-game-data to create'
      });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check game-data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



