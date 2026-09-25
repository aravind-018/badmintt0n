import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { broadcastMatchEvent } from '../socket';
import { z } from 'zod';

export const announcementRouter = Router();

const announcementSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  publishedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

// GET /api/v1/announcements — List announcements
announcementRouter.get('/', async (req, res) => {
  try {
    const { tournamentId, publishedOnly } = req.query;

    const where: any = {};
    if (tournamentId) where.tournamentId = String(tournamentId);
    if (publishedOnly === 'true') {
      where.publishedAt = { not: null };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        tournament: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ announcements });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch announcements' });
  }
});

// POST /api/v1/announcements — Create announcement (Admin)
announcementRouter.post(
  '/',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const result = announcementSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: 'Validation error', details: result.error.errors.map((e) => e.message) });
        return;
      }

      const { tournamentId, title, body, publishedAt, expiresAt } = result.data;
      const createdById = req.user!.id;

      const announcement = await prisma.announcement.create({
        data: {
          tournamentId,
          title,
          body,
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(), // Auto-publish by default
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdById,
        },
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logAudit({
        userId: createdById,
        action: 'ADMIN_ACTION',
        entity: 'Announcement',
        entityId: announcement.id,
        metadata: { action: 'CREATE_ANNOUNCEMENT', title, tournamentId },
      });

      broadcastMatchEvent('announcement:created', announcement.id, { announcement });

      res.status(201).json({ message: 'Announcement created', announcement });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create announcement' });
    }
  }
);

// PUT /api/v1/announcements/:id — Update announcement (Admin)
announcementRouter.put(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, body, publishedAt, expiresAt } = req.body;

      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          title,
          body,
          publishedAt: publishedAt ? new Date(publishedAt) : publishedAt === null ? null : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : expiresAt === null ? null : undefined,
        },
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logAudit({
        userId: req.user!.id,
        action: 'ADMIN_ACTION',
        entity: 'Announcement',
        entityId: id,
        metadata: { action: 'UPDATE_ANNOUNCEMENT', title },
      });

      res.json({ message: 'Announcement updated', announcement: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update announcement' });
    }
  }
);

// PATCH /api/v1/announcements/:id/publish — Publish announcement (Admin)
announcementRouter.patch(
  '/:id/publish',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const updated = await prisma.announcement.update({
        where: { id },
        data: { publishedAt: new Date() },
      });

      await logAudit({
        userId: req.user!.id,
        action: 'ADMIN_ACTION',
        entity: 'Announcement',
        entityId: id,
        metadata: { action: 'PUBLISH_ANNOUNCEMENT', title: updated.title },
      });

      res.json({ message: 'Announcement published', announcement: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to publish announcement' });
    }
  }
);

// PATCH /api/v1/announcements/:id/unpublish — Unpublish announcement (Admin)
announcementRouter.patch(
  '/:id/unpublish',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const updated = await prisma.announcement.update({
        where: { id },
        data: { publishedAt: null },
      });

      await logAudit({
        userId: req.user!.id,
        action: 'ADMIN_ACTION',
        entity: 'Announcement',
        entityId: id,
        metadata: { action: 'UNPUBLISH_ANNOUNCEMENT', title: updated.title },
      });

      res.json({ message: 'Announcement unpublished', announcement: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to unpublish announcement' });
    }
  }
);

// DELETE /api/v1/announcements/:id — Delete announcement (Admin)
announcementRouter.delete(
  '/:id',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const deleted = await prisma.announcement.delete({
        where: { id },
      });

      await logAudit({
        userId: req.user!.id,
        action: 'ADMIN_ACTION',
        entity: 'Announcement',
        entityId: id,
        metadata: { action: 'DELETE_ANNOUNCEMENT', title: deleted.title },
      });

      res.json({ message: 'Announcement deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete announcement' });
    }
  }
);
