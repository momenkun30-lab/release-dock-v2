const express = require('express');
const { getDb } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadBuffer, deleteByPublicId } = require('../services/storage');

const router = express.Router();
router.use(requireAdmin);

// GET /api/admin/branding — current uploaded assets, for prefilling the admin UI
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('settings').findOne({ _id: 'site' });
    res.json({
      hero_video_url: doc?.hero_video_url || null,
      logo_url: doc?.logo_url || null,
      logo2_url: doc?.logo2_url || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/branding — upload/replace video and/or logo and/or logo2 (multipart)
router.post(
  '/',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'logo2', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const db = getDb();
      const existing = (await db.collection('settings').findOne({ _id: 'site' })) || {};
      const videoFile = req.files?.video?.[0];
      const logoFile = req.files?.logo?.[0];
      const logo2File = req.files?.logo2?.[0];

      if (!videoFile && !logoFile && !logo2File) {
        return res.status(400).json({ error: 'أرفق ملفًا واحدًا على الأقل' });
      }

      const update = {};

      if (videoFile) {
        await deleteByPublicId(existing.hero_video_public_id);
        const up = await uploadBuffer(videoFile.buffer, {
          folder: 'branding',
          filename: videoFile.originalname,
          contentType: videoFile.mimetype,
        });
        update.hero_video_url = up.url;
        update.hero_video_public_id = up.publicId;
      }

      if (logoFile) {
        await deleteByPublicId(existing.logo_public_id);
        const up = await uploadBuffer(logoFile.buffer, {
          folder: 'branding',
          filename: logoFile.originalname,
          contentType: logoFile.mimetype,
        });
        update.logo_url = up.url;
        update.logo_public_id = up.publicId;
      }

      if (logo2File) {
        await deleteByPublicId(existing.logo2_public_id);
        const up = await uploadBuffer(logo2File.buffer, {
          folder: 'branding',
          filename: logo2File.originalname,
          contentType: logo2File.mimetype,
        });
        update.logo2_url = up.url;
        update.logo2_public_id = up.publicId;
      }

      update.updated_at = new Date();
      await db.collection('settings').updateOne({ _id: 'site' }, { $set: update }, { upsert: true });

      const doc = await db.collection('settings').findOne({ _id: 'site' });
      res.json({
        ok: true,
        hero_video_url: doc.hero_video_url || null,
        logo_url: doc.logo_url || null,
        logo2_url: doc.logo2_url || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/admin/branding/:type — remove one asset (type = "video" | "logo" | "logo2")
router.delete('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const fieldMap = {
      video: { publicIdField: 'hero_video_public_id', urlField: 'hero_video_url' },
      logo: { publicIdField: 'logo_public_id', urlField: 'logo_url' },
      logo2: { publicIdField: 'logo2_public_id', urlField: 'logo2_url' },
    };
    if (!fieldMap[type]) return res.status(400).json({ error: 'نوع غير صالح' });

    const db = getDb();
    const existing = (await db.collection('settings').findOne({ _id: 'site' })) || {};
    const { publicIdField, urlField } = fieldMap[type];

    await deleteByPublicId(existing[publicIdField]);
    await db
      .collection('settings')
      .updateOne(
        { _id: 'site' },
        { $unset: { [publicIdField]: '', [urlField]: '' }, $set: { updated_at: new Date() } },
        { upsert: true }
      );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
