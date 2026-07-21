const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'app-files';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('خطأ: SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY غير معرّفين في متغيرات البيئة.');
}

// service_role key bypasses Row Level Security — this client only ever runs
// on the server, never sent to the browser.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Uploads a Buffer to the Supabase Storage bucket.
 * @param {Buffer} buffer
 * @param {{ folder: string, filename?: string, contentType?: string }} opts
 * @returns {Promise<{url: string, publicId: string}>} publicId is the storage path, used later for deletion
 */
async function uploadBuffer(buffer, { folder, filename, contentType }) {
  const ext = filename ? filename.split('.').pop() : 'bin';
  const path = `${folder}/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`فشل رفع الملف إلى Supabase Storage: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, publicId: path };
}

/** Deletes a previously-uploaded file by its storage path. Fails silently. */
async function deleteByPublicId(publicId) {
  if (!publicId) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([publicId]);
    if (error) console.error('تعذر حذف الملف من Supabase Storage:', error.message);
  } catch (err) {
    console.error('تعذر حذف الملف من Supabase Storage:', err.message);
  }
}

module.exports = { uploadBuffer, deleteByPublicId };
