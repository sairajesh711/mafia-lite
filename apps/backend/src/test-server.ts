#!/usr/bin/env node

/**
 * Simple test script to verify basic backend functionality
 * This can run without Redis by mocking the Redis client
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { PROTOCOL_VERSION } from '@mafia/contracts';

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

async function startTestServer() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: Date.now(),
        protocolVersion: PROTOCOL_VERSION,
        mode: 'test',
      };
    });

    // Test endpoint to verify game engine integration
    fastify.get('/test/roles', async () => {
      const { ROLE_REGISTRY, getDefaultRoleDistribution } = await import('@mafia/engine');
      
      return {
        availableRoles: Object.keys(ROLE_REGISTRY),
        sampleDistribution: {
          5: getDefaultRoleDistribution(5),
          7: getDefaultRoleDistribution(7),
          10: getDefaultRoleDistribution(10),
        }
      };
    });

    // Create basic Socket.IO server (without Redis)
    const io = new SocketIOServer(fastify.server, {
      cors: {
        origin: '*',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      console.log(`Test client connected: ${socket.id}`);
      
      socket.on('ping', () => {
        console.log(`Ping from ${socket.id}`);
        socket.emit('pong', { timestamp: Date.now() });
      });

      socket.on('disconnect', () => {
        console.log(`Test client disconnected: ${socket.id}`);
      });
    });

    // Start the server
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`🧪 Test server running on http://localhost:${port}`);
    console.log(`🎮 Mafia Night Backend Test v${PROTOCOL_VERSION}`);
    console.log(`\nTest endpoints:`);
    console.log(`  GET  /health      - Health check`);
    console.log(`  GET  /test/roles  - Game engine test`);
    console.log(`  WS   /socket.io   - Socket.IO test\n`);

  } catch (err) {
    console.error('Test server failed to start:', err);
    process.exit(1);
  }
}

startTestServer();