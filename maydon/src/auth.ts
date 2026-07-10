/**
 * Auth Middleware — Telegram initData HMAC verification
 */

import { Hono } from 'hono';
import { getAdmin } from './kv.ts';

export interface AuthState {
  userId: number;
  userName?: string;
  isAdmin: boolean;
}

async function verifyInitData(initData: string): Promise<{
  valid: boolean;
  userId?: number;
  userName?: string;
  error?: string;
}> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    return { valid: false, error: 'BOT_TOKEN not set' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    return { valid: false, error: 'No hash' };
  }

  // Remove hash from params
  params.delete('hash');

  // Sort and build data check string
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Create secret key
  const encoder = new TextEncoder();
  const keyData = encoder.encode('WebAppData');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const key = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: keyData, iterations: 100000 },
    keyMaterial,
    256,
  );
  const finalKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign
  const signature = await crypto.subtle.sign(
    'HMAC',
    finalKey,
    encoder.encode(sorted),
  );
  const computedHash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedHash !== hash) {
    return { valid: false, error: 'Invalid hash' };
  }

  // Extract user info
  const userParam = params.get('user');
  if (!userParam) {
    return { valid: false, error: 'No user' };
  }

  try {
    const user = JSON.parse(userParam);
    return { valid: true, userId: user.id, userName: user.first_name };
  } catch {
    return { valid: false, error: 'Invalid user data' };
  }
}

export function authMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      c.json({ error: 'Unauthorized' }, 401);
      return;
    }

    const initData = authHeader.slice(7);
    const result = await verifyInitData(initData);

    if (!result.valid) {
      c.json({ error: result.error }, 401);
      return;
    }

    // Check admin status
    const admin = await getAdmin(result.userId!);

    c.set('auth', {
      userId: result.userId,
      userName: result.userName,
      isAdmin: !!admin,
    });

    await next();
  };
}

export function requireAdmin() {
  return async (c: any, next: () => Promise<void>) => {
    const auth = c.get('auth') as AuthState | undefined;
    if (!auth?.isAdmin) {
      c.json({ error: 'Forbidden' }, 403);
      return;
    }
    await next();
  };
}
