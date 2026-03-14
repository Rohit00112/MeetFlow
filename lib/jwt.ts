import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

export interface JwtUserPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  name: string;
}

export function signJWT(payload: JwtUserPayload, options?: jwt.SignOptions): string {
  console.log('Signing new JWT token with payload:', {
    id: payload.id,
    name: payload.name,
    email: payload.email
  });

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options,
  });

  console.log('JWT token signed successfully');
  return token;
}

export function verifyJWT<T>(token: string): T | null {
  try {
    console.log('Verifying JWT token');
    // Add more detailed logging for debugging
    const decoded = jwt.verify(token, JWT_SECRET) as T;
    console.log('JWT token verified successfully');
    return decoded;
  } catch (error) {
    // Log the specific error for debugging
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT Error:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.error('JWT Expired:', error.message, error.expiredAt);
    } else if (error instanceof jwt.NotBeforeError) {
      console.error('JWT Not Before:', error.message, error.date);
    } else {
      console.error('Unknown JWT Error:', error);
    }
    return null;
  }
}
