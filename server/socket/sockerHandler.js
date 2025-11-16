const pool = require('../config/database');
const jwt = require('jsonwebtoken');

/**
 * Socket.IO event handlers with proper authorization checks
 */
const setupSocketHandlers = (io) => {
  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Invalid token'));
      }
      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.userId})`);

    /**
     * Join a channel room
     */
    socket.on('join_channel', async (channelId) => {
      try {
        // Verify user is a member of the channel
        const memberCheck = await pool.query(
          'SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2',
          [channelId, socket.userId]
        );

        if (memberCheck.rows.length === 0) {
          console.log(`❌ User ${socket.username} is not a member of channel ${channelId}`);
          socket.emit('error', { message: 'Not a member of this channel' });
          socket.emit('force_leave_channel', { channelId });
          return;
        }

        socket.join(`channel_${channelId}`);
        console.log(`✅ User ${socket.username} joined channel ${channelId}`);

        // Notify others in the channel
        socket.to(`channel_${channelId}`).emit('user_joined', {
          userId: socket.userId,
          username: socket.username,
          channelId
        });

        // Send current online users count
        const roomSize = io.sockets.adapter.rooms.get(`channel_${channelId}`)?.size || 0;
        io.to(`channel_${channelId}`).emit('room_info', {
          channelId,
          onlineCount: roomSize
        });
      } catch (error) {
        console.error('Join channel error:', error);
        socket.emit('error', { message: 'Error joining channel' });
      }
    });

    /**
     * Leave a channel room
     */
    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel_${channelId}`);
      console.log(`❌ User ${socket.username} left channel ${channelId}`);

      socket.to(`channel_${channelId}`).emit('user_left', {
        userId: socket.userId,
        username: socket.username,
        channelId
      });
    });

    /**
     * Send a message to a channel
     */
    socket.on('send_message', async ({ channelId, content }) => {
      try {
        console.log(`📨 Message from ${socket.username} in channel ${channelId}`);

        // CRITICAL: Verify user is still a member before allowing message
        const memberCheck = await pool.query(
          'SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2',
          [channelId, socket.userId]
        );

        if (memberCheck.rows.length === 0) {
          console.log(`🚫 Blocked message from non-member ${socket.username} in channel ${channelId}`);
          socket.emit('error', { message: 'You are not a member of this channel' });
          socket.emit('force_leave_channel', { channelId });
          return;
        }

        // Save message to database
        const result = await pool.query(
          `INSERT INTO messages (channel_id, user_id, content) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [channelId, socket.userId, content]
        );

        const message = result.rows[0];

        // Get user info
        const userResult = await pool.query(
          'SELECT username, avatar_color FROM users WHERE id = $1',
          [socket.userId]
        );

        const messageData = {
          ...message,
          username: userResult.rows[0].username,
          avatar_color: userResult.rows[0].avatar_color
        };

        console.log(`✅ Broadcasting message to channel_${channelId}`);
        
        // Broadcast message to all users in the channel
        io.to(`channel_${channelId}`).emit('new_message', messageData);
      } catch (error) {
        console.error('❌ Send message error:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    /**
     * User is typing indicator
     */
    socket.on('typing', async ({ channelId, isTyping }) => {
      try {
        // Verify membership
        const memberCheck = await pool.query(
          'SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2',
          [channelId, socket.userId]
        );

        if (memberCheck.rows.length === 0) {
          return;
        }

        socket.to(`channel_${channelId}`).emit('user_typing', {
          userId: socket.userId,
          username: socket.username,
          channelId,
          isTyping
        });
      } catch (error) {
        console.error('Typing error:', error);
      }
    });

    /**
     * Handle user kicked from channel (called by creator)
     */
    socket.on('kick_user_from_channel', async ({ channelId, kickedUserId }) => {
      try {
        console.log(`🚫 Kicking user ${kickedUserId} from channel ${channelId} by ${socket.username}`);

        // Verify the requester is the channel creator
        const channelResult = await pool.query(
          'SELECT creator_id FROM channels WHERE id = $1',
          [channelId]
        );

        if (channelResult.rows.length === 0) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }

        if (channelResult.rows[0].creator_id !== socket.userId) {
          socket.emit('error', { message: 'Only channel creator can remove members' });
          return;
        }

        // Notify the kicked user to leave immediately
        io.to(`channel_${channelId}`).emit('user_kicked', {
          channelId,
          userId: kickedUserId
        });

        // Force disconnect kicked user from the room
        const sockets = await io.in(`channel_${channelId}`).fetchSockets();
        for (const s of sockets) {
          if (s.userId === kickedUserId) {
            s.leave(`channel_${channelId}`);
            s.emit('force_leave_channel', { channelId });
            console.log(`✅ Forced user ${kickedUserId} to leave channel ${channelId}`);
          }
        }

        // Notify remaining members
        io.to(`channel_${channelId}`).emit('member_removed_notification', {
          channelId,
          userId: kickedUserId
        });

      } catch (error) {
        console.error('Kick user error:', error);
        socket.emit('error', { message: 'Error kicking user' });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username}`);
    });
  });
};

module.exports = setupSocketHandlers;
