import { prisma } from '@badminton-live/database';

export type AuditActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'POINT_ADDED'
  | 'POINT_UNDONE'
  | 'MATCH_STARTED'
  | 'MATCH_PAUSED'
  | 'MATCH_RESUMED'
  | 'MATCH_COMPLETED'
  | 'FIXTURE_CHANGED'
  | 'TEAM_CREATED'
  | 'TEAM_EDITED'
  | 'PLAYER_CREATED'
  | 'PLAYER_EDITED'
  | 'ADMIN_ACTION';

export async function logAudit(params: {
  userId?: string | null;
  action: AuditActionType;
  entity?: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action as any,
        entity: params.entity || null,
        entityId: params.entityId || null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AuditLog Error]', error);
  }
}
