import { createClient } from 'redis';
import type { RoomState, Id } from '@mafia/contracts';

export interface DomainEvent {
  type: string;
  payload: any;
  timestamp: number;
  roomId: string;
  eventId: string;
}

export class SnapshotService {
  constructor(private redis: ReturnType<typeof createClient>) {}

  /**
   * Save a room state snapshot (simplified without compression for now)
   */
  async saveSnapshot(roomState: RoomState): Promise<void> {
    const key = `snapshot:room:${roomState.id}`;
    
    const stateData = JSON.stringify(roomState);
    await this.redis.set(key, stateData, { EX: 86400 }); // Expire in 24 hours
    
    console.log(`💾 Saved snapshot for room ${roomState.id} (${stateData.length} chars)`);
  }

  /**
   * Load a room state snapshot
   */
  async loadSnapshot(roomId: Id): Promise<RoomState | null> {
    const key = `snapshot:room:${roomId}`;
    
    try {
      const stateData = await this.redis.get(key);
      if (!stateData) return null;
      
      const roomState = JSON.parse(stateData) as RoomState;
      
      console.log(`💾 Loaded snapshot for room ${roomId}`);
      return roomState;
    } catch (error) {
      console.error(`Failed to load snapshot for room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Add a domain event to the event stream
   */
  async addEvent(roomId: Id, event: Omit<DomainEvent, 'eventId' | 'timestamp' | 'roomId'>): Promise<string> {
    const streamKey = `room:${roomId}:events`;
    const eventId = await this.redis.xAdd(streamKey, '*', {
      type: event.type,
      payload: JSON.stringify(event.payload),
      timestamp: Date.now().toString(),
      roomId,
    });

    // Trim stream to keep only last 50 events  
    await this.redis.xTrim(streamKey, 'MAXLEN', 50);
    
    return eventId;
  }

  /**
   * Get events from the stream since a given ID
   */
  async getEventsSince(roomId: Id, sinceId: string = '0'): Promise<DomainEvent[]> {
    const streamKey = `room:${roomId}:events`;
    
    try {
      const result = await this.redis.xRange(streamKey, sinceId, '+', { COUNT: 100 });
      
      const events: DomainEvent[] = result.map((entry) => ({
        eventId: entry.id,
        type: entry.message.type as string,
        payload: JSON.parse(entry.message.payload as string),
        timestamp: parseInt(entry.message.timestamp as string),
        roomId: entry.message.roomId as string,
      }));
      
      return events;
    } catch (error) {
      console.error(`Failed to get events for room ${roomId}:`, error);
      return [];
    }
  }

  /**
   * Get all events from the stream
   */
  async getAllEvents(roomId: Id): Promise<DomainEvent[]> {
    return this.getEventsSince(roomId, '0');
  }

  /**
   * Clear old events and snapshots for a room
   */
  async cleanup(roomId: Id): Promise<void> {
    const snapshotKey = `snapshot:room:${roomId}`;
    const streamKey = `room:${roomId}:events`;
    
    await Promise.all([
      this.redis.del(snapshotKey),
      this.redis.del(streamKey),
    ]);
    
    console.log(`🧹 Cleaned up snapshot and events for room ${roomId}`);
  }

  /**
   * Create a recovery checkpoint (snapshot + current event stream position)
   */
  async createCheckpoint(roomState: RoomState): Promise<string> {
    // Save snapshot
    await this.saveSnapshot(roomState);
    
    // Get latest event ID from stream
    const streamKey = `room:${roomState.id}:events`;
    const latest = await this.redis.xRevRange(streamKey, '+', '-', { COUNT: 1 });
    
    const latestEventId = latest.length > 0 ? latest[0]!.id : '0';
    
    // Store checkpoint metadata
    const checkpointKey = `checkpoint:room:${roomState.id}`;
    await this.redis.hSet(checkpointKey, {
      snapshotTimestamp: roomState.lastSnapshot.toString(),
      latestEventId,
      phase: roomState.phase,
      createdAt: Date.now().toString(),
    });
    
    await this.redis.expire(checkpointKey, 86400); // Expire in 24 hours
    
    console.log(`📍 Created checkpoint for room ${roomState.id} at event ${latestEventId}`);
    return latestEventId;
  }

  /**
   * Recover room state from checkpoint + replay events
   */
  async recoverFromCheckpoint(roomId: Id): Promise<RoomState | null> {
    console.log(`🔄 Starting recovery for room ${roomId}`);
    
    // Load base snapshot
    const snapshot = await this.loadSnapshot(roomId);
    if (!snapshot) {
      console.log(`❌ No snapshot found for room ${roomId}`);
      return null;
    }
    
    // Get checkpoint info
    const checkpointKey = `checkpoint:room:${roomId}`;
    const checkpointData = await this.redis.hGetAll(checkpointKey);
    
    if (!checkpointData.latestEventId) {
      console.log(`✅ Using snapshot without replay for room ${roomId}`);
      return snapshot;
    }
    
    // Get events since checkpoint
    const events = await this.getEventsSince(roomId, checkpointData.latestEventId);
    
    console.log(`🔄 Replaying ${events.length} events for room ${roomId}`);
    
    // In a real implementation, we would apply these events to reconstruct state
    // For now, just return the snapshot - the event replay logic would go here
    return snapshot;
  }
}