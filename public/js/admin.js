const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const adminUsername = document.getElementById('admin-username');

const dashStats = document.getElementById('dash-stats');
const appsTbody = document.getElementById('apps-tbody');
const newAppBtn = document.getElementById('new-app-btn');

const formModal = document.getElementById('app-form-modal');
const formModalClose = document.getElementById('form-modal-close');
const appForm = document.getElementById('app-form');
const formTitle = document.getElementById('form-title');
const formError = document.getElementById('form-error');

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, { credentials: 'same-origin', ...options });
  if (res.status === 401) {
    showLogin();
    throw new Error('unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden = true;
}
function showDashboard(username) {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  adminUsername.textContent = `مرحبًا، ${username}`;
  loadStats();
  loadApps();
}

async function checkSession() {
  try {
    const me = await api('/me');
    showDashboard(me.username);
  } catch {
    showLogin();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const fd = new FormData(loginForm);
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDashboard(data.username);
  } catch (err) {
    loginError.textContent = err.message || 'تعذر تسجيل الدخول';
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

async function loadStats() {
  try {
    const stats = await api('/stats');
    dashStats.innerHTML = `
      <div class="dash-stat"><span>إجمالي التطبيقات</span><strong>${stats.totals.apps}</strong></div>
      <div class="dash-stat"><span>إجمالي التنزيلات</span><strong>${stats.totals.downloads.toLocaleString('en-US')}</strong></div>
      <div class="dash-stat"><span>الأكثر تنزيلًا</span><strong style="font-size:1rem">${stats.topApps[0]?.name || '—'}</strong></div>
    `;
  } catch {}
}

let appsCache = [];

async function loadApps() {
  try {
    appsCache = await api('/apps');
    renderTable();
  } catch {}
}

function renderTable() {
  if (!appsCache.length) {
    appsTbody.innerHTML = `<tr><td colspan="7" style="color:var(--text-dim);padding:24px;text-align:center;">لا توجد تطبيقات بعد</td></tr>`;
    return;
  }
  appsTbody.innerHTML = appsCache.map((app) => `
    <tr>
      <td>${app.icon_url ? `<img class="thumb" src="${app.icon_url}" alt="" />` : ''}</td>
      <td>${app.name}</td>
      <td style="font-family:var(--font-mono)">v${app.version}</td>
      <td>${formatSize(app.size_bytes)}</td>
      <td><span class="badge ${app.published ? 'badge--live' : 'badge--draft'}">${app.published ? 'منشور' : 'مسودة'}</span></td>
      <td style="font-family:var(--font-mono)">${(app.download_count || 0).toLocaleString('en-US')}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-edit="${app._id}">تعديل</button>
          <button class="icon-btn icon-btn--danger" data-delete="${app._id}">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');

  appsTbody.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openForm(appsCache.find((a) => a._id === btn.dataset.edit)))
  );
  appsTbody.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deleteApp(btn.dataset.delete))
  );
}

async function deleteApp(id) {
  if (!confirm('هل تريد حذف هذا التطبيق نهائيًا؟')) return;
  try {
    await api(`/apps/${id}`, { method: 'DELETE' });
    loadApps();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

function openForm(app = null) {
  appForm.reset();
  formError.hidden = true;
  formTitle.textContent = app ? `تعديل: ${app.name}` : 'تطبيق جديد';
  appForm.elements.id.value = app?.id || '';
  if (app) {
    appForm.elements.name.value = app.name;
    appForm.elements.description.value = app.description || '';
    appForm.elements.version.value = app.version || '';
    appForm.elements.changelog.value = app.changelog || '';
    appForm.elements.published.checked = !!app.published;
  }
  formModal.hidden = false;
}

newAppBtn.addEventListener('click', () => openForm());
formModalClose.addEventListener('click', () => (formModal.hidden = true));
formModal.addEventListener('click', (e) => { if (e.target === formModal) formModal.hidden = true; });

appForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const id = appForm.elements.id.value;
  const fd = new FormData(appForm);
  fd.set('published', appForm.elements.published.checked ? 'true' : 'false');

  const submitBtn = document.getElementById('form-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جارٍ الحفظ…';

  try {
    await api(id ? `/apps/${id}` : '/apps', {
      method: id ? 'PUT' : 'POST',
      body: fd,
    });
    formModal.hidden = true;
    loadApps();
    loadStats();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'حفظ التطبيق';
  }
});

checkSession();
