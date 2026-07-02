import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 ngày — FR-006

export interface SessionPayload {
    sub: string;
    email: string;
    role: string;
}

function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
}

export function signSession(payload: SessionPayload): string {
    return jwt.sign(payload, getSecret(), { algorithm: 'HS256', expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySession(token: string): SessionPayload {
    return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as SessionPayload;
}
