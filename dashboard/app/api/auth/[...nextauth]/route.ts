import { NextResponse } from 'next/server'

// Stub: PortScale uses cookie/JWT-based auth, not next-auth.
// This route is kept to avoid 404s from any legacy references.
export async function GET() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
