const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  createChannel,
  getAllChannels,
  getUserChannels,
  joinChannel,
  getChannelMembers,
  removeUserFromChannel,
  getChannelMessages
} = require('../controllers/channelsController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/channels
 * @desc    Create a new channel
 * @access  Private
 */
router.post('/', createChannel);

/**
 * @route   GET /api/channels
 * @desc    Get all channels
 * @access  Private
 */
router.get('/', getAllChannels);

/**
 * @route   GET /api/channels/my
 * @desc    Get user's joined channels
 * @access  Private
 */
router.get('/my', getUserChannels);

/**
 * @route   POST /api/channels/:channelId/join
 * @desc    Join a channel
 * @access  Private
 */
router.post('/:channelId/join', joinChannel);

/**
 * @route   GET /api/channels/:channelId/members
 * @desc    Get channel members
 * @access  Private
 */
router.get('/:channelId/members', getChannelMembers);

/**
 * @route   DELETE /api/channels/:channelId/members/:userId
 * @desc    Remove user from channel (creator only)
 * @access  Private
 */
router.delete('/:channelId/members/:userId', removeUserFromChannel);

/**
 * @route   GET /api/channels/:channelId/messages
 * @desc    Get channel messages
 * @access  Private
 */
router.get('/:channelId/messages', getChannelMessages);

module.exports = router;
