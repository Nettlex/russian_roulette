import { NextRequest, NextResponse } from 'next/server';

/**
 * Initialize Edge Config with empty game data
 * Run this once to set up the initial structure
 */
export async function POST(request: NextRequest) {
  try {
    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const vercelToken = process.env.VERCEL_TOKEN;
    
    if (!edgeConfigId || !vercelToken) {
      return NextResponse.json({ 
        error: 'Missing EDGE_CONFIG_ID or VERCEL_TOKEN',
        missing: {
          edgeConfigId: !edgeConfigId,
          vercelToken: !vercelToken
        }
      }, { status: 500 });
    }
    
    // Initial data structure
    const initialData = {
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
    
    console.log('🔄 Initializing Edge Config with game-data key...');
    
    // Create the game-data key in Edge Config
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
              value: initialData,
            },
          ],
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to initialize Edge Config:', error);
      return NextResponse.json({ 
        error: 'Failed to initialize',
        status: response.status,
        details: error 
      }, { status: 500 });
    }
    
    const result = await response.json();
    console.log('✅ Edge Config initialized successfully!');
    
    return NextResponse.json({ 
      success: true,
      message: 'Edge Config initialized with game-data key',
      initialData,
      result
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
  return NextResponse.json({
    message: 'Send a POST request to initialize Edge Config',
    endpoint: '/api/init-edge-config',
    method: 'POST'
  });
}

