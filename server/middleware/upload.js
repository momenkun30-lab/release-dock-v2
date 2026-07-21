const multer = require('multer');

const ALLOWED_IMAGE = /\.(png|jpe?g|webp|gif|svg)$/i;
const ALLOWED_PACKAGE = /\.(apk|exe|msi|dmg|zip|pkg|deb|appimage|ipa)$/i;

function fileFilter(req, file, cb) {
  if ((file.fieldname === 'icon' || file.fieldname === 'screenshots') && !ALLOWED_IMAGE.test(file.originalname)) {
    return cb(new Error('صيغة الصورة غير مدعومة'));
  }
  if (file.fieldname === 'file' && !ALLOWED_PACKAGE.test(file.originalname)) {
    return cb(new Error('صيغة ملف التطبيق غير مدعومة'));
  }
  cb(null, true);
}

// files stay in memory only long enough to be forwarded to Supabase Storage — nothing touches local disk
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 49 * 1024 * 1024 }, // ~49MB — stays under Supabase's free-tier default per-file cap
});

module.exports = { upload };
