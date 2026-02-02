/**
 * CORS Helper for Agent API Endpoints
 * Ensures all responses include proper CORS headers
 */

import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Create JSON response with CORS headers
 */
export function jsonWithCors(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * Create OPTIONS response with CORS headers
 */
export function optionsWithCors() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}
