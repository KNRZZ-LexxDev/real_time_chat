const pool = require('../config/database');

/**
 * Create a new channel
 */
const createChannel = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, description } = req.body;
    const creatorId = req.user.id;

    await client.query('BEGIN');

    // Create channel
    const channelResult = await client.query(
      `INSERT INTO channels (name, description, creator_id) 
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, creatorId]
    );

    const channel = channelResult.rows[0];

    // Add creator as member
    await client.query(
      'INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2)',
      [channel.id, creatorId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Channel created successfully',
      channel
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Server error creating channel' });
  } finally {
    client.release();
  }
};

/**
 * Get all channels with member count
 */
const getAllChannels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        u.username as creator_name,
        COUNT(DISTINCT cm.user_id) as member_count,
        CASE WHEN cm_user.user_id IS NOT NULL THEN true ELSE false END as is_member
      FROM channels c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN channel_members cm ON c.id = cm.channel_id
      LEFT JOIN channel_members cm_user ON c.id = cm_user.channel_id AND cm_user.user_id = $1
      GROUP BY c.id, u.username, cm_user.user_id
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Server error fetching channels' });
  }
};

/**
 * Get user's channels
 */
const getUserChannels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username as creator_name
      FROM channels c
      INNER JOIN channel_members cm ON c.id = cm.channel_id
      LEFT JOIN users u ON c.creator_id = u.id
      WHERE cm.user_id = $1
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Get user channels error:', error);
    res.status(500).json({ error: 'Server error fetching user channels' });
  }
};

/**
 * Join a channel
 */
const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    // Check if already a member
    const existingMember = await pool.query(
      'SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this channel' });
    }

    // Add user to channel
    await pool.query(
      'INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2)',
      [channelId, userId]
    );

    res.json({ message: 'Successfully joined channel' });
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({ error: 'Server error joining channel' });
  }
};

/**
 * Get channel members
 */
const getChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;

    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar_color, cm.joined_at,
             c.creator_id = u.id as is_creator
      FROM users u
      INNER JOIN channel_members cm ON u.id = cm.user_id
      INNER JOIN channels c ON cm.channel_id = c.id
      WHERE cm.channel_id = $1
      ORDER BY is_creator DESC, cm.joined_at ASC
    `, [channelId]);

    res.json({ members: result.rows });
  } catch (error) {
    console.error('Get channel members error:', error);
    res.status(500).json({ error: 'Server error fetching members' });
  }
};

/**
 * Remove user from channel (creator only)
 */
const removeUserFromChannel = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const requesterId = req.user.id;

    // Check if requester is the channel creator
    const channelResult = await pool.query(
      'SELECT creator_id FROM channels WHERE id = $1',
      [channelId]
    );

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channelResult.rows[0].creator_id !== requesterId) {
      return res.status(403).json({ error: 'Only channel creator can remove members' });
    }

    // Can't remove creator
    if (parseInt(userId) === requesterId) {
      return res.status(400).json({ error: 'Creator cannot be removed from channel' });
    }

    // Remove user
    await pool.query(
      'DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );

    res.json({ message: 'User removed from channel successfully' });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Server error removing user' });
  }
};

/**
 * Get channel messages
 */
const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(`
      SELECT m.*, u.username, u.avatar_color
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [channelId, limit, offset]);

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
};

module.exports = {
  createChannel,
  getAllChannels,
  getUserChannels,
  joinChannel,
  getChannelMembers,
  removeUserFromChannel,
  getChannelMessages
};
