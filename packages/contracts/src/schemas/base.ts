import { z } from 'zod';
// Import PhaseTimerSchema from events to avoid duplication
import { PhaseTimerSchema } from './events.js';

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
  'RATE_LIMITED',
  'INVALID_NAME',
  'INTERNAL_ERROR'
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

// Player Schema
export const PlayerSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  roleId: RoleIdSchema,
  alignment: AlignmentSchema,
  status: PlayerStatusSchema,
  connected: z.boolean(),
  afkStrikes: z.number().int().min(0),
});

// Room Settings Schema
export const RoomSettingsSchema = z.object({
  nightDurationMs: z.number().int().min(0),
  dayDurationMs: z.number().int().min(0),
  voteDurationMs: z.number().int().min(0),
  revealRolesOnDeath: z.boolean(),
  anonymousVoting: z.boolean(),
  votingMode: z.enum(['majority', 'plurality']),
  minPlayers: z.number().int().min(3),
  maxPlayers: z.number().int().min(3),
});

// Night Action Schema (match existing NightAction interface)
export const NightActionSchema = z.object({
  id: IdSchema,
  actionId: IdSchema,
  playerId: IdSchema,
  type: ActionTypeSchema,
  targetId: IdSchema,
  submittedAt: z.number().int().min(0),
  priority: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});

// Vote Schema (match existing Vote interface)
export const VoteSchema = z.object({
  id: IdSchema,
  actionId: IdSchema,
  playerId: IdSchema,
  targetId: IdSchema.nullable(),
  submittedAt: z.number().int().min(0),
});

// Investigation Result Schema (match existing interface)
export const InvestigationResultSchema = z.object({
  investigatorId: IdSchema,
  targetId: IdSchema,
  isMafia: z.boolean(),
});

// THE CRITICAL SCHEMA: RoomState with REQUIRED hostId
export const RoomStateSchema = z.object({
  id: IdSchema,
  code: z.string().length(6),
  hostId: IdSchema,                                    // <-- REQUIRED (this fixes the bug)
  phase: PhaseSchema,
  timer: PhaseTimerSchema.nullable(),
  settings: RoomSettingsSchema,
  players: z.record(IdSchema, PlayerSchema),
  nightActions: z.record(IdSchema, NightActionSchema),
  votes: z.record(IdSchema, VoteSchema),
  investigationResults: z.array(InvestigationResultSchema),
  publicNarrative: z.array(z.string()),
  victoryCondition: VictoryConditionSchema,
  protocolVersion: z.number().int().min(1),
  lastSnapshot: z.number().int().min(0),
}).strict();  // strict prevents unknown fields, but hostId is now included