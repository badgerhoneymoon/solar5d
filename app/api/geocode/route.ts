import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  importance?: number;
}

// Rate limiting: simple in-memory store (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

// Simple cache for search results (5 minute TTL)
const searchCache = new Map<string, { data: NominatimResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  record.count++;
  return false;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = searchParams.get('limit') || '8';
  const acceptLanguage = searchParams.get('accept-language') || 'en';
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  const rateLimitKey = getRateLimitKey(request);
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  
  const cacheKey = `${query}-${limit}-${acceptLanguage}`;
  const cached = searchCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }
  
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', limit);
    url.searchParams.set('dedupe', '1');
    url.searchParams.set('accept-language', acceptLanguage);
    
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Solar5D-CesiumApp/1.0 (contact@solar5d.app)' },
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data: NominatimResult[] = await response.json();
    const sortedData = data.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    searchCache.set(cacheKey, { data: sortedData, timestamp: now });
    return NextResponse.json(sortedData);

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding service temporarily unavailable' },
      { status: 503 }
    );
  }
} 