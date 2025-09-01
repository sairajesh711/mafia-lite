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

// Handle uncaught Redis errors
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('NOAUTH')) {
    fastify.log.error('Redis authentication error caught: ' + err.message);
    return; // Don't crash on Redis auth errors
  }
  fastify.log.fatal('Uncaught exception: ' + String(err));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object' && 'message' in reason && 
      typeof reason.message === 'string' && reason.message.includes('NOAUTH')) {
    fastify.log.error('Redis authentication rejection caught: ' + reason.message);
    return; // Don't crash on Redis auth errors
  }
  fastify.log.error('Unhandled rejection: ' + String(reason));
});

// Environment variables
const PORT = parseInt(process.env.PORT || '3001');
const REDIS_URL = process.env.REDIS_URL; // Don't default to localhost

// Only attempt Redis if URL is explicitly provided
if (REDIS_URL) {
  fastify.log.info('Redis URL provided - will attempt connection');
} else {
  fastify.log.info('No Redis URL - using in-memory mode');
}

// Redis clients for Socket.IO adapter and our services
let redisClient: any = null, redisSubClient: any = null;

async function start() {
  try {
    // Register CORS - Comprehensive configuration for all browser scenarios
    await fastify.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? [
            // Exact production URLs (will be updated with real URLs)
            process.env.CORS_ORIGIN || 'https://your-app.vercel.app',
            // Pattern for all Vercel preview deployments
            /^https:\/\/.*\.vercel\.app$/,
            // Pattern for custom domains
            /^https:\/\/.*\.your-domain\.com$/,
            // Localhost for local development testing
            'http://localhost:3000',
            'http://localhost:5173',
          ]
        : true, // Allow all origins in development
      credentials: true, // Support cookies and auth headers
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicit method support
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Common headers
      preflightContinue: false,
      optionsSuccessStatus: 204, // Some browsers need 204 for OPTIONS
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: Date.now(),
        protocolVersion: PROTOCOL_VERSION,
      };
    });

    // Redis ping endpoint for testing connectivity
    fastify.get('/redis-ping', async () => {
      if (!redisClient) {
        return { 
          status: 'redis-disabled', 
          message: 'Redis client not available - using in-memory mode',
          timestamp: Date.now()
        };
      }
      
      try {
        const start = Date.now();
        const result = await redisClient.ping();
        const duration = Date.now() - start;
        
        return { 
          status: 'redis-connected', 
          ping: result, 
          latency_ms: duration,
          timestamp: Date.now()
        };
      } catch (error) {
        return { 
          status: 'redis-error', 
          error: String(error),
          timestamp: Date.now()
        };
      }
    });

    // Only attempt Redis connection if URL is provided
    if (REDIS_URL) {
      try {
        redisClient = createClient({ url: REDIS_URL });
        redisSubClient = redisClient.duplicate();

        // Add error handlers to prevent uncaught exceptions
        redisClient.on('error', (err: any) => {
          fastify.log.error('Redis client error: ' + String(err));
        });
        redisSubClient.on('error', (err: any) => {
          fastify.log.error('Redis sub client error: ' + String(err));
        });

        await Promise.all([
          redisClient.connect(),
          redisSubClient.connect(),
        ]);

        fastify.log.info('Connected to Redis');
      } catch (err) {
        fastify.log.error('Redis connection failed: ' + String(err));
        fastify.log.warn('Starting without Redis - sessions will not persist');
        
        // Clean up failed clients
        if (redisClient) {
          try { await redisClient.disconnect(); } catch {}
        }
        if (redisSubClient) {
          try { await redisSubClient.disconnect(); } catch {}
        }
        
        redisClient = null;
        redisSubClient = null;
      }
    } else {
      fastify.log.info('No Redis URL provided - starting in memory-only mode');
    }

    // Create Socket.IO server
    const io = new SocketIOServer(fastify.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [
              'https://your-app-name.vercel.app',
              'https://your-custom-domain.com',
              /^https:\/\/.*\.vercel\.app$/
            ]
          : '*',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Use Redis adapter for horizontal scaling (if available)
    if (redisClient && redisSubClient) {
      io.adapter(createAdapter(redisClient, redisSubClient));
      fastify.log.info('Socket.IO using Redis adapter');
    } else {
      fastify.log.warn('Socket.IO using default in-memory adapter');
    }

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