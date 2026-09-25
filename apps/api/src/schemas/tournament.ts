import { z } from 'zod';

export const tournamentSchema = z.object({
  name: z.string().min(3, 'Tournament name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  venue: z.string().optional(),
  logoUrl: z.string().url('Logo must be a valid URL').optional().or(z.literal('')),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  format: z.enum(['KNOCKOUT', 'ROUND_ROBIN', 'GROUP_KNOCKOUT']).default('KNOCKOUT'),
  numberOfCourts: z.number().int().min(1, 'At least 1 court is required').default(1),
});

export const categorySchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  type: z.enum(['MENS_SINGLES', 'WOMENS_SINGLES', 'MENS_DOUBLES', 'WOMENS_DOUBLES', 'MIXED_DOUBLES', 'TEAM_EVENT']),
});

export const teamSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  logoUrl: z.string().optional(),
  organization: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const playerSchema = z.object({
  name: z.string().min(2, 'Player name must be at least 2 characters'),
  photoUrl: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  seed: z.number().int().positive().optional().nullable(),
  ranking: z.number().int().positive().optional().nullable(),
  teamId: z.string().optional(),
});

export const courtSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  name: z.string().min(2, 'Court name must be at least 2 characters'),
  location: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']).default('AVAILABLE'),
});
