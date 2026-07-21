const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

const router = express.Router();

// GET /api/setup/status — tells the frontend whether setup is still needed
router.get('/status', async (req, res) => {
  try {
    const db = getDb();
    const count = await db.collection('admins').countDocuments();
    res.json({ needsSetup: count === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/setup — creates the first admin account. Locked forever once one exists.
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const count = await db.collection('admins').countDocuments();
    if (count > 0) {
      return res.status(403).json({ error: 'تم إعداد حساب المدير مسبقًا. هذه الصفحة أُغلقت لأسباب أمنية.' });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة المرور' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const hash = bcrypt.hashSync(password, 12);
    await db.collection('admins').insertOne({ username, password_hash: hash, created_at: new Date() });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'اسم المستخدم هذا مستخدم بالفعل' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
