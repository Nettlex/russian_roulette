/**
 * Simple persistent storage for leaderboard data
 * For Vercel deployment, we'll use a combination of:
 * 1. Client-side localStorage for immediate updates
 * 2. Server-side file storage for persistence (falls back to in-memory if file system unavailable)
 * 3. Periodic sync between client and server
 */

import { promises as fs } from 'fs';
import path from 'path';

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
}

// In-memory fallback
let memoryStore: StorageData = {
  leaderboard: {
    free: [],
    paid: [],
  },
  prizePool: {
    totalAmount: 0,
    participants: 0,
    lastUpdated: Date.now(),
  },
  playerStats: {},
};

// Try to use /tmp directory (available on Vercel)
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp/game-data.json';

/**
 * Load data from persistent storage
 */
export async function loadData(): Promise<StorageData> {
  try {
    // Try reading from file first
    const data = await fs.readFile(STORAGE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Update memory store
    memoryStore = parsed;
    
    console.log('📂 Loaded data from persistent storage');
    return parsed;
  } catch (error) {
    // File doesn't exist or can't be read - use memory store
    console.log('⚠️ Using in-memory storage (no persistent file available)');
    return memoryStore;
  }
}

/**
 * Save data to persistent storage
 */
export async function saveData(data: StorageData): Promise<void> {
  // Always update memory store
  memoryStore = data;
  
  try {
    // Try to save to file
    await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log('💾 Saved data to persistent storage');
  } catch (error) {
    // If file write fails, just keep in memory
    console.log('⚠️ Could not save to file, keeping in memory only');
  }
}

/**
 * Get current data (from memory)
 */
export function getData(): StorageData {
  return memoryStore;
}

/**
 * Update leaderboard entry
 */
export async function updateLeaderboardEntry(
  mode: 'free' | 'paid',
  entry: LeaderboardEntry
): Promise<void> {
  const data = getData();
  const board = data.leaderboard[mode];
  
  // Remove existing entry
  const index = board.findIndex(
    (e) => e.address.toLowerCase() === entry.address.toLowerCase()
  );
  if (index >= 0) {
    board.splice(index, 1);
  }
  
  // Add new entry
  board.push(entry);
  
  // Sort by maxStreak (desc), then trigger pulls (desc), then deaths (asc)
  board.sort((a, b) => {
    if (b.maxStreak !== a.maxStreak) {
      return b.maxStreak - a.maxStreak;
    }
    if (b.triggerPulls !== a.triggerPulls) {
      return b.triggerPulls - a.triggerPulls;
    }
    return a.deaths - b.deaths;
  });
  
  // Update ranks
  board.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });
  
  await saveData(data);
}

/**
 * Update player stats
 */
export async function updatePlayerStats(
  address: string,
  stats: any
): Promise<void> {
  const data = getData();
  data.playerStats[address] = {
    ...data.playerStats[address],
    ...stats,
    lastUpdated: Date.now(),
  };
  
  await saveData(data);
}

/**
 * Get player stats
 */
export function getPlayerStats(address: string): any {
  const data = getData();
  return data.playerStats[address] || null;
}

/**
 * Update prize pool
 */
export async function updatePrizePool(update: {
  totalAmount?: number;
  participants?: number;
}): Promise<void> {
  const data = getData();
  data.prizePool = {
    ...data.prizePool,
    ...update,
    lastUpdated: Date.now(),
  };
  
  await saveData(data);
}

/**
 * Initialize storage (call on server startup)
 */
export async function initStorage(): Promise<void> {
  await loadData();
}

