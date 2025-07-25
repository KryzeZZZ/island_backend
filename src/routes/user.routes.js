const express = require('express');
const router = express.Router();
const neo4jService = require('../services/neo4j.service');

// Create a new user
router.post('/', async (req, res) => {
  try {
    const user = await neo4jService.createNode('User', req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await neo4jService.findNodes('User');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const users = await neo4jService.findNodes('User', { id: req.params.id });
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create friendship relationship between users
router.post('/:userId/friends/:friendId', async (req, res) => {
  try {
    const result = await neo4jService.createRelationship(
      'User',
      { id: req.params.userId },
      'User',
      { id: req.params.friendId },
      'FRIENDS_WITH'
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 