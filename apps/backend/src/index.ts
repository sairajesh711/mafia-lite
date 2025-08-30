import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { setupSocketHandlers } from './handlers/socket-handlers.js';
import { PROTOCOL_VERSION } from '@mafia/contracts';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Environment variables
const PORT = parseInt(process.env.PORT || '3001');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : true, // Allow all origins in development
      credentials: true,
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: Date.now(),
        protocolVersion: PROTOCOL_VERSION,
      };
    });

    // Redis clients for Socket.IO adapter and our services
    const redisClient = createClient({ url: REDIS_URL });
    const redisSubClient = redisClient.duplicate();

    await Promise.all([
      redisClient.connect(),
      redisSubClient.connect(),
    ]);

    fastify.log.info('Connected to Redis');

    // Create Socket.IO server
    const io = new SocketIOServer(fastify.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-frontend-domain.com'] 
          : '*',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Use Redis adapter for horizontal scaling
    io.adapter(createAdapter(redisClient, redisSubClient));

    // Set up socket event handlers
    setupSocketHandlers(io, redisClient);

    // Start the server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    fastify.log.info(`🚀 Server running on http://localhost:${PORT}`);
    fastify.log.info(`🎮 Mafia Night Backend v${PROTOCOL_VERSION}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  fastify.log.info('Received SIGINT, shutting down gracefully');
  fastify.close();
});

process.on('SIGTERM', () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully');
  fastify.close();
});

start();