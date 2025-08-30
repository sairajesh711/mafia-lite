import { z } from 'zod';
import { 
  IdSchema, 
  PhaseSchema, 
  ErrorCodeSchema, 
  VersionedSchema, 
  ActionTypeSchema 
} from './base.js';

// Client to Server Event Schemas

export const RoomJoinPayloadSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
  playerName: z.string().min(1).max(50).trim(),
  sessionId: IdSchema.optional(),
});

export const SessionResumePayloadSchema = z.object({
  roomId: IdSchema,
  sessionId: IdSchema,
  jwt: z.string().min(1),
});

export const ActionSubmitPayloadSchema = z.object({
  actionId: IdSchema,
  type: ActionTypeSchema,
  targetId: IdSchema,
});

export const VoteCastPayloadSchema = z.object({
  actionId: IdSchema,
  targetId: IdSchema.nullable(),
});

export const ChatMessagePayloadSchema = z.object({
  messageId: IdSchema,
  channel: z.enum(['day', 'nightMafia', 'dead', 'lobby']),
  content: z.string().min(1).max(1000).trim(),
});

export const HostActionPayloadSchema = z.object({
  action: z.enum(['kick', 'mute', 'nudge', 'start']),
  targetId: IdSchema.optional(),
});

// Server to Client Event Schemas

export const PhaseTimerSchema = z.object({
  phase: PhaseSchema,
  endsAt: z.number().int().min(0),
  submittedAt: z.number().int().min(0),
});

export const PhaseChangeEventSchema = VersionedSchema.extend({
  event: z.literal('phase.change'),
  phase: PhaseSchema,
  timer: PhaseTimerSchema.nullable(),
  night: z.boolean().optional(),
});

export const ActionAckEventSchema = VersionedSchema.extend({
  event: z.literal('action.ack'),
  actionId: IdSchema,
  type: z.string(),
  targetId: IdSchema,
});

export const VoteUpdateEventSchema = VersionedSchema.extend({
  event: z.literal('vote.update'),
  playerId: IdSchema,
  targetId: IdSchema.nullable(),
  tallies: z.record(IdSchema, z.number().int().min(0)).optional(),
});

export const NightPublicResultEventSchema = VersionedSchema.extend({
  event: z.literal('night.publicResult'),
  death: IdSchema.optional(),
  narrative: z.string(),
});

export const LynchResultEventSchema = VersionedSchema.extend({
  event: z.literal('lynch.result'),
  targetId: IdSchema.nullable(),
  narrative: z.string(),
});

export const PlayerStatusEventSchema = VersionedSchema.extend({
  event: z.literal('player.status'),
  playerId: IdSchema,
  connected: z.boolean(),
  alive: z.boolean(),
});

export const ChatMessageEventSchema = VersionedSchema.extend({
  event: z.literal('chat.message'),
  messageId: IdSchema,
  playerId: IdSchema,
  playerName: z.string(),
  channel: z.string(),
  content: z.string(),
  timestamp: z.number().int().min(0),
});

export const ErrorEventSchema = VersionedSchema.extend({
  event: z.literal('error'),
  code: ErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  context: z.record(z.unknown()).optional(),
});

// Union schemas for complete validation

export const ClientToServerEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('room.join'), payload: RoomJoinPayloadSchema }),
  z.object({ event: z.literal('session.resume'), payload: SessionResumePayloadSchema }),
  z.object({ event: z.literal('action.submit'), payload: ActionSubmitPayloadSchema }),
  z.object({ event: z.literal('vote.cast'), payload: VoteCastPayloadSchema }),
  z.object({ event: z.literal('chat.message'), payload: ChatMessagePayloadSchema }),
  z.object({ event: z.literal('host.action'), payload: HostActionPayloadSchema }),
]);

export const ServerToClientEventSchema = z.discriminatedUnion('event', [
  PhaseChangeEventSchema,
  ActionAckEventSchema,
  VoteUpdateEventSchema,
  NightPublicResultEventSchema,
  LynchResultEventSchema,
  PlayerStatusEventSchema,
  ChatMessageEventSchema,
  ErrorEventSchema,
]);