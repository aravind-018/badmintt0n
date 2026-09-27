import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').max(100, 'Email must be 100 characters or less'),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(128, 'Password must be 128 characters or less'),
});

export const registerOfficerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or less'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address').max(100, 'Email must be 100 characters or less'),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(128, 'Password must be 128 characters or less'),
  role: z.enum(['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'SCORER', 'VIEWER']).default('SCORER'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterOfficerInput = z.infer<typeof registerOfficerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

