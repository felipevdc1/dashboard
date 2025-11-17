import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_CARTPANDA_API_URL || 'https://accounts.cartpanda.com/api/v3';
const API_TOKEN = process.env.CARTPANDA_API_TOKEN;
const STORE_NAME = process.env.CARTPANDA_STORE_NAME;

export async function GET() {
  try {
    const url = `${API_URL}/${STORE_NAME}/orders?per_page=5`;

    console.log('🔍 Debug - Attempting request to:', url);
    console.log('🔍 Debug - Token (first 10 chars):', API_TOKEN?.substring(0, 10));

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('🔍 Debug - Response status:', response.status);
    console.log('🔍 Debug - Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();

    console.log('🔍 Debug - Response data keys:', Object.keys(data));
    console.log('🔍 Debug - Full response:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      dataType: typeof data,
      isArray: Array.isArray(data),
      keys: typeof data === 'object' ? Object.keys(data) : null,
    });
  } catch (error) {
    console.error('🔍 Debug - Error:', error);

    return NextResponse.json(
      {
        error: 'Debug request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
