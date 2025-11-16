const pool = require('./database');

/**
 * Initialize database tables
 * Creates all necessary tables if they don't exist
 */
const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar_color VARCHAR(7) DEFAULT '#1976d2',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Channels table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Channel members table (many-to-many relationship)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channel_members (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(channel_id, user_id)
      );
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
      CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

module.exports = initDatabase;
