import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Summarize test route working' });
}

export async function POST() {
  return NextResponse.json({ message: 'POST to summarize test route working' });
}