const express = require('express');
const router = express.Router();
const accountService = require('../services/account.service');

// 创建账户
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // 验证必要字段
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password and username are required' });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const result = await accountService.createAccount(email, password, username);
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Email already exists') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 添加新用户到账户
router.post('/:accountId/users', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { introduction } = req.body;

    if (!introduction) {
      return res.status(400).json({ error: 'Introduction is required' });
    }

    const user = await accountService.addUserToAccount(accountId, introduction);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'Account not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 获取账户下的所有用户
router.get('/:accountId/users', async (req, res) => {
  try {
    const { accountId } = req.params;
    const users = await accountService.getAccountUsers(accountId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 登录验证
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const account = await accountService.verifyAccount(email, password);
    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 