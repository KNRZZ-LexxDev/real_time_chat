const pool = require('../config/database');

/**
 * Search users by username
 */
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const result = await pool.query(`
      SELECT id, username, avatar_color
      FROM users
      WHERE username ILIKE $1 AND id != $2
      LIMIT 20
    `, [`%${query}%`, req.user.id]);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Server error searching users' });
  }
};

/**
 * Get all users (for admin purposes or user list)
 */
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, avatar_color, created_at
      FROM users
      WHERE id != $1
      ORDER BY username ASC
    `, [req.user.id]);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

module.exports = { searchUsers, getAllUsers };
