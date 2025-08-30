import { z } from 'zod';

export const IdSchema = z.string().min(1).max(128);

export const AlignmentSchema = z.enum(['mafia', 'town', 'neutral']);

export const PhaseSchema = z.enum(['lobby', 'night', 'day_announcement', 'day_discussion', 'day_voting', 'ended']);

export const RoleIdSchema = z.enum(['mafia', 'detective', 'doctor', 'townsperson']);

export const ActionTypeSchema = z.enum(['KILL', 'PROTECT', 'INVESTIGATE', 'NONE']);

export const PlayerStatusSchema = z.enum(['alive', 'dead', 'disconnected']);

export const VictoryConditionSchema = z.enum(['mafia-victory', 'town-victory', 'none']);

export const ErrorCodeSchema = z.enum([
  'WRONG_PHASE',
  'DEAD_PLAYER', 
  'INVALID_TARGET',
  'ALREADY_SUBMITTED',
  'IDEMPOTENT_DUPLICATE',
  'ROOM_FULL',
  'ROOM_NOT_FOUND',
  'UNAUTHORIZED',
  'RATE_LIMITED'
]);

export const TimestampSchema = z.object({
  submittedAt: z.number().int().min(0),
  endsAt: z.number().int().min(0).optional(),
});

export const IdentifiableSchema = z.object({
  id: IdSchema,
});

export const VersionedSchema = z.object({
  protocolVersion: z.number().int().min(1),
});

export const PROTOCOL_VERSION = 1;