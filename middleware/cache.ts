import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCustomCacheControl } from '@/lib/cache-config'

export function withCache(handler: Function, type: 'COURSES' | 'USER_DATA' | 'STATIC_CONTENT') {
  return async function(req: NextRequest) {
    const response = await handler(req)
    
    if (response instanceof NextResponse) {
      response.headers.set('Cache-Control', getCustomCacheControl(type))
    }
    
    return response
  }
} 