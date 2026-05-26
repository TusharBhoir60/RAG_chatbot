import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth } from '@/auth';

const DEFAULT_ISSUER = 'rag-app';
const DEFAULT_AUDIENCE = 'rag-api';
const TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2 hours

/**
 * Mint an HS256 API JWT for FastAPI (same secret/iss/aud as PyJWT verification).
 * Requires an active NextAuth session (HttpOnly cookie).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { detail: 'Server misconfigured: AUTH_SECRET missing or too short' },
      { status: 500 }
    );
  }

  const issuer = process.env.AUTH_ISSUER ?? DEFAULT_ISSUER;
  const audience = process.env.AUTH_AUDIENCE ?? DEFAULT_AUDIENCE;

  const accessToken = jwt.sign(
    {
      sub: session.user.id,
      id: session.user.id,
      email: session.user.email ?? undefined,
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: TOKEN_TTL_SECONDS,
      issuer,
      audience,
    }
  );

  return NextResponse.json({
    accessToken,
    expiresIn: TOKEN_TTL_SECONDS,
    tokenType: 'Bearer',
  });
}
