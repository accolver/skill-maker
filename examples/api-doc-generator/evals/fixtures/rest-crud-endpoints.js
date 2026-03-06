// routes/users.js - Express.js CRUD endpoints for User resource
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const User = require('../models/User');

/**
 * GET /api/users
 * List all users with pagination and optional role filter
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(['admin', 'user', 'editor']),
    query('search').optional().isString().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { page = 1, limit = 25, role, search } = req.query;
      const filter = {};
      if (role) filter.role = role;
      if (search) filter.name = { $regex: search, $options: 'i' };

      const users = await User.find(filter)
        .select('-password')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(filter);

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/users/:id
 * Get a single user by ID
 */
router.get('/:id',
  [param('id').isMongoId().withMessage('Invalid user ID format')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/users
 * Create a new user
 */
router.post('/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['admin', 'user', 'editor']).withMessage('Invalid role'),
    body('bio').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, name, password, role = 'user', bio } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const user = await User.create({ email, name, password, role, bio });
      const publicUser = user.toObject();
      delete publicUser.password;

      res.status(201).json({ user: publicUser });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update an existing user
 */
router.put('/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID format'),
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('role').optional().isIn(['admin', 'user', 'editor']),
    body('bio').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, name, role, bio } = req.body;
      const updates = {};
      if (email !== undefined) updates.email = email;
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (bio !== undefined) updates.bio = bio;

      if (email) {
        const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
        if (existing) {
          return res.status(409).json({ error: 'Email already in use by another account' });
        }
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete a user by ID
 */
router.delete('/:id',
  [param('id').isMongoId().withMessage('Invalid user ID format')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
