import { z } from 'zod';

export const tournamentBaseSchema = z.object({
  name: z.string().trim().min(3, 'Tournament name must be at least 3 characters').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .trim()
    .min(3, 'Slug must be at least 3 characters')
    .max(60, 'Slug must be 60 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().trim().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
  venue: z.string().trim().max(200, 'Venue must be 200 characters or less').optional().nullable(),
  logoUrl: z.string().trim().url('Logo must be a valid URL').optional().or(z.literal('')).nullable(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  format: z.enum(['KNOCKOUT', 'ROUND_ROBIN', 'GROUP_KNOCKOUT']).default('KNOCKOUT'),
  numberOfCourts: z.number().int().min(1, 'At least 1 court is required').max(64, 'Maximum 64 courts allowed').default(1),
});

export const tournamentSchema = tournamentBaseSchema.refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
);

export const tournamentUpdateSchema = tournamentBaseSchema.partial();

export const categorySchema = z.object({
  tournamentId: z.string().trim().min(1, 'Tournament ID is required'),
  type: z.enum(['MENS_SINGLES', 'WOMENS_SINGLES', 'MENS_DOUBLES', 'WOMENS_DOUBLES', 'MIXED_DOUBLES', 'TEAM_EVENT']),
  qualificationRule: z.enum(['TOP_1', 'TOP_2', 'TOP_3', 'TOP_4']).optional().default('TOP_2'),
});

export const teamSchema = z.object({
  tournamentId: z.string().trim().min(1, 'Tournament ID is required'),
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(100, 'Team name must be 100 characters or less'),
  logoUrl: z.string().trim().optional().nullable(),
  organization: z.string().trim().max(100, 'Organization must be 100 characters or less').optional().nullable(),
  contactName: z.string().trim().max(100, 'Contact name must be 100 characters or less').optional().nullable(),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export const playerSchema = z.object({
  name: z.string().trim().min(2, 'Player name must be at least 2 characters').max(100, 'Player name must be 100 characters or less'),
  photoUrl: z.string().trim().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  seed: z.number().int().min(1, 'Seed must be positive').max(256).optional().nullable(),
  ranking: z.number().int().min(1, 'Ranking must be positive').max(10000).optional().nullable(),
  teamId: z.string().trim().optional().nullable(),
});

export const courtSchema = z.object({
  tournamentId: z.string().trim().min(1, 'Tournament ID is required'),
  name: z.string().trim().min(2, 'Court name must be at least 2 characters').max(50, 'Court name must be 50 characters or less'),
  location: z.string().trim().max(100, 'Location must be 100 characters or less').optional().nullable(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']).default('AVAILABLE'),
});

