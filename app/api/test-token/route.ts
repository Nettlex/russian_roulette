import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Test Vercel API Token permissions
 * GET /api/test-token
 */
export async function GET(request: NextRequest) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const vercelToken = process.env.VERCEL_TOKEN;
  const edgeConfigUrl = process.env.EDGE_CONFIG;

  if (!edgeConfigId || !vercelToken) {
    return NextResponse.json({
      error: 'Missing environment variables',
      missing: {
        EDGE_CONFIG_ID: !edgeConfigId,
        VERCEL_TOKEN: !vercelToken,
      }
    }, { status: 500 });
  }

  const results: any = {
    config: {
      EDGE_CONFIG_ID: edgeConfigId,
      VERCEL_TOKEN_PREFIX: vercelToken.substring(0, 10) + '...',
      EDGE_CONFIG_URL_PREFIX: edgeConfigUrl?.substring(0, 50) + '...',
    },
    tests: {}
  };

  // Test 1: Get Edge Config details
  try {
    console.log('🧪 Test 1: Getting Edge Config details...');
    const detailsResponse = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      }
    );

    results.tests.getDetails = {
      status: detailsResponse.status,
      statusText: detailsResponse.statusText,
      ok: detailsResponse.ok,
    };

    if (detailsResponse.ok) {
      const details = await detailsResponse.json();
      results.tests.getDetails.data = {
        id: details.id,
        slug: details.slug,
        createdAt: details.createdAt,
        ownerId: details.ownerId,
      };
      console.log('✅ Test 1 passed: Can read Edge Config details');
    } else {
      const error = await detailsResponse.text();
      results.tests.getDetails.error = error;
      console.error('❌ Test 1 failed:', error);
    }
  } catch (error) {
    results.tests.getDetails = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.error('❌ Test 1 exception:', error);
  }

  // Test 2: Try to read items
  try {
    console.log('🧪 Test 2: Reading Edge Config items...');
    const itemsResponse = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      }
    );

    results.tests.getItems = {
      status: itemsResponse.status,
      statusText: itemsResponse.statusText,
      ok: itemsResponse.ok,
    };

    if (itemsResponse.ok) {
      const items = await itemsResponse.json();
      results.tests.getItems.itemCount = items.length || 0;
      results.tests.getItems.itemKeys = items.map((item: any) => item.key);
      console.log('✅ Test 2 passed: Can read items');
    } else {
      const error = await itemsResponse.text();
      results.tests.getItems.error = error;
      console.error('❌ Test 2 failed:', error);
    }
  } catch (error) {
    results.tests.getItems = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.error('❌ Test 2 exception:', error);
  }

  // Test 3: Try a test write (upsert a test key)
  try {
    console.log('🧪 Test 3: Testing write permissions with test key...');
    const writeResponse = await fetch(
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
              key: 'test-token-permissions',
              value: { timestamp: Date.now(), test: true },
            },
          ],
        }),
      }
    );

    results.tests.testWrite = {
      status: writeResponse.status,
      statusText: writeResponse.statusText,
      ok: writeResponse.ok,
    };

    if (writeResponse.ok) {
      const writeResult = await writeResponse.json();
      results.tests.testWrite.result = writeResult;
      console.log('✅ Test 3 passed: Can write to Edge Config');
    } else {
      const error = await writeResponse.text();
      results.tests.testWrite.error = error;
      console.error('❌ Test 3 failed:', error);
    }
  } catch (error) {
    results.tests.testWrite = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.error('❌ Test 3 exception:', error);
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}



