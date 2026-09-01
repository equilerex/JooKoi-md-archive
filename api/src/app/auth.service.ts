import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'jokoivi-auth-token';
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

const USERS = parseUsers(process.env.AUTH_USERS || 'user:pass');

interface AuthTokenPayload {
  sub: string;
  exp: number;
}

function parseUsers(usersString: string): Map<string, string> {
  const users = new Map<string, string>();
  usersString.split(',').forEach((pair) => {
    const [username, password] = pair.trim().split(':');
    if (username && password) {
      users.set(username, password);
    }
  });
  return users;
}

@Injectable()
export class AuthService {
  login(username: string, password: string) {
    const storedPassword = USERS.get(username);
    if (!storedPassword || !this.isValidCredential(password, storedPassword)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresAt = Date.now() + THIRTY_DAYS_MS;
    const token = this.signToken({ sub: username, exp: expiresAt });

    return {
      token,
      expiresAt,
      username,
    };
  }

  verifyToken(token: string): AuthTokenPayload {
    const [payloadPart, signaturePart] = token.split('.');
    if (!payloadPart || !signaturePart) {
      throw new UnauthorizedException('Invalid token');
    }

    const expectedSignature = this.sign(payloadPart);
    if (!this.safeEquals(signaturePart, expectedSignature)) {
      throw new UnauthorizedException('Invalid token');
    }

    let payload: AuthTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!USERS.has(payload.sub) || payload.exp <= Date.now()) {
      throw new UnauthorizedException('Token expired or invalid user');
    }

    return payload;
  }

  private signToken(payload: AuthTokenPayload): string {
    const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signaturePart = this.sign(payloadPart);
    return `${payloadPart}.${signaturePart}`;
  }

  private sign(value: string): string {
    return createHmac('sha256', TOKEN_SECRET).update(value).digest('base64url');
  }

  private isValidCredential(input: string, expected: string): boolean {
    return this.safeEquals(input, expected);
  }

  private safeEquals(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'utf8');
    const bBuffer = Buffer.from(b, 'utf8');
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
