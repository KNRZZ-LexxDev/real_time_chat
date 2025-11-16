const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { searchUsers, getAllUsers } = require('../controllers/userController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users/search
 * @desc    Search users by username
 * @access  Private
 */
router.get('/search', searchUsers);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private
 */
router.get('/', getAllUsers);

module.exports = router;
