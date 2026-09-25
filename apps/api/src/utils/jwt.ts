import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@badminton-live/database';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export function signAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): UserTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as UserTokenPayload;
}

export function verifyRefreshToken(token: string): UserTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as UserTokenPayload;
}
