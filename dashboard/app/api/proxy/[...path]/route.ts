import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params)
}

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  try {
    const apiPath = params.path.join('/')
    const searchParams = request.nextUrl.search
    const targetUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${apiPath}${searchParams}`
    
    // Copy headers from incoming request, but add auth from cookie
    const headers = new Headers()
    
    // Forward relevant headers
    const contentType = request.headers.get('content-type')
    if (contentType) headers.set('content-type', contentType)
    
    // Inject token if available in cookies
    const token = request.cookies.get('portscale_token')?.value
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    } else {
      // Also check if auth header was sent directly
      const authHeader = request.headers.get('authorization')
      if (authHeader) headers.set('authorization', authHeader)
    }

    const init: RequestInit = {
      method: request.method,
      headers,
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text()
      if (body) {
        init.body = body
      }
    }

    const response = await fetch(targetUrl, init)

    // Forward the response back
    const responseHeaders = new Headers(response.headers)
    responseHeaders.set('Access-Control-Allow-Origin', '*')

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('API Proxy error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
