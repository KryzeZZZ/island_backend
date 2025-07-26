const express = require("express");
const router = express.Router();
const accountService = require("../services/account.service");
const requireAuth = require("../middleware/auth");

router.post("/register", requireAuth, async (req, res) => {
  try {
    const { username, email: emailInBody } = req.body;
    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }
    const { sub: clerkUserId } = req.auth || {};
    const email = emailInBody;
    const result = await accountService.createAccount(
      clerkUserId,
      email,
      username
    );
    res.status(201).json(result);
  } catch (error) {
    if (
      error.message === "Email already exists" ||
      error.message === "Account already exists"
    ) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/:accountId/users", async (req, res) => {
  try {
    const { accountId } = req.params;
    const { introduction } = req.body;

    if (!introduction) {
      return res.status(400).json({ error: "Introduction is required" });
    }

    const user = await accountService.addUserToAccount(accountId, introduction);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === "Account not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

router.get("/:accountId/users", async (req, res) => {
  try {
    const { accountId } = req.params;
    const users = await accountService.getAccountUsers(accountId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  res.status(410).json({ error: "Deprecated endpoint" });
});

module.exports = router;
