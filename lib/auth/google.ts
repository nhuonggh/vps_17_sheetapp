import { OAuth2Client } from 'google-auth-library';

let cachedClient: OAuth2Client | null = null;

function getClient(): OAuth2Client {
    if (!cachedClient) {
        cachedClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    return cachedClient;
}

export interface GoogleIdentity {
    email: string;
    emailVerified: boolean;
    name: string;
    picture: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
    const ticket = await getClient().verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new Error('invalid_google_token');
    }

    return {
        email: payload.email,
        emailVerified: payload.email_verified === true,
        name: payload.name ?? '',
        picture: payload.picture ?? '',
    };
}
