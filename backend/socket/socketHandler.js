const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');

let ioInstance = null;

/**
 * Set up Socket.IO event handling.
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
const setupSocket = (io) => {
  ioInstance = io;

  // Authenticate socket connections using JWT from handshake auth
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.jwt.secret);
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`[Socket] User connected: ${user.name} (${user.id})`);

    // Join user-specific room for direct notifications
    socket.join(`user:${user.id}`);

    // Auto-join user to all their community rooms
    try {
      const result = await query(
        `SELECT community_id FROM community_members
         WHERE user_id = $1 AND status = 'approved'`,
        [user.id]
      );

      for (const row of result.rows) {
        socket.join(`community:${row.community_id}`);
      }

      console.log(`[Socket] User ${user.name} joined ${result.rows.length} community room(s)`);
    } catch (err) {
      console.error(`[Socket] Failed to auto-join community rooms for ${user.id}:`, err.message);
    }

    // Handle manual community room join
    socket.on('joinCommunity', (communityId) => {
      socket.join(`community:${communityId}`);
      console.log(`[Socket] User ${user.name} joined community:${communityId}`);
    });

    // Handle manual community room leave
    socket.on('leaveCommunity', (communityId) => {
      socket.leave(`community:${communityId}`);
      console.log(`[Socket] User ${user.name} left community:${communityId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user.name} (${reason})`);
    });

    // Handle errors
    socket.on('error', (err) => {
      console.error(`[Socket] Error for user ${user.name}:`, err.message);
    });
  });

  console.log('[Socket] Socket.IO handler initialized');
};

/**
 * Emit an event to a specific room.
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {string} room - Room name (e.g., 'community:uuid' or 'user:uuid')
 * @param {string} event - Event name
 * @param {*} data - Data to emit
 */
const emitToRoom = (io, room, event, data) => {
  io.to(room).emit(event, data);
};

/**
 * Get the current Socket.IO instance.
 * Used by services/workers to emit real-time events.
 *
 * @returns {import('socket.io').Server|null}
 */
const getIO = () => ioInstance;

module.exports = { setupSocket, emitToRoom, getIO };
