const grid = document.getElementById('catalog-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('app-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const statApps = document.getElementById('stat-apps');
const statDownloads = document.getElementById('stat-downloads');

let apps = [];

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso) {
  try {
    return new Date(iso + 'Z').toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function renderStats() {
  statApps.textContent = apps.length;
  statDownloads.textContent = apps.reduce((sum, a) => sum + a.download_count, 0).toLocaleString('en-US');
}

function cardHTML(app) {
  const icon = app.icon_url
    ? `<img class="app-card__icon" src="${app.icon_url}" alt="" />`
    : `<div class="app-card__icon app-card__icon--placeholder">${app.name[0]}</div>`;
  return `
    <article class="app-card" data-slug="${app.slug}" tabindex="0">
      <div class="app-card__top">
        ${icon}
        <div>
          <h3 class="app-card__name">${app.name}</h3>
          <span class="app-card__version">v${app.version}</span>
        </div>
      </div>
      <p class="app-card__desc">${app.description || 'لا يوجد وصف بعد.'}</p>
      <div class="app-card__meta">
        <span>${formatSize(app.size_bytes)} · ${formatDate(app.updated_at)}</span>
        <span class="app-card__downloads">⬇ ${app.download_count.toLocaleString('en-US')}</span>
      </div>
    </article>`;
}

function render(list) {
  if (!list.length) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  grid.innerHTML = list.map(cardHTML).join('');
  grid.querySelectorAll('.app-card').forEach((card) => {
    card.addEventListener('click', () => openModal(card.dataset.slug));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(card.dataset.slug); });
  });
}

async function loadApps() {
  try {
    const res = await fetch('/api/apps');
    apps = await res.json();
    renderStats();
    render(apps);
  } catch {
    grid.innerHTML = '<p style="color:var(--text-muted)">تعذّر تحميل التطبيقات، حاول لاحقًا.</p>';
  }
}

async function openModal(slug) {
  const res = await fetch(`/api/apps/${slug}`);
  if (!res.ok) return;
  const app = await res.json();

  const icon = app.icon_url
    ? `<img class="modal-icon" src="${app.icon_url}" alt="" />`
    : `<div class="modal-icon app-card__icon--placeholder" style="display:grid;place-items:center;font-size:1.6rem">${app.name[0]}</div>`;

  const shots = app.screenshots.length
    ? `<div class="modal-shots">${app.screenshots.map((s) => `<img src="${s}" alt="" loading="lazy" />`).join('')}</div>`
    : '';

  const changelog = app.changelog
    ? `<div class="modal-changelog">${app.changelog.replace(/</g, '&lt;')}</div>`
    : '';

  modalBody.innerHTML = `
    <div class="modal-header">
      ${icon}
      <div>
        <h2 class="modal-title">${app.name}</h2>
        <span class="app-card__version">v${app.version}</span>
      </div>
    </div>
    <p class="modal-desc">${app.description || ''}</p>
    <div class="modal-facts">
      <div class="modal-fact"><span>الحجم</span><strong>${formatSize(app.size_bytes)}</strong></div>
      <div class="modal-fact"><span>آخر تحديث</span><strong>${formatDate(app.updated_at)}</strong></div>
      <div class="modal-fact"><span>التنزيلات</span><strong>${app.download_count.toLocaleString('en-US')}</strong></div>
    </div>
    ${shots}
    ${changelog}
    <button class="btn-download" id="download-btn">⬇ تنزيل التطبيق</button>
  `;

  document.getElementById('download-btn').addEventListener('click', () => {
    window.location.href = `/api/apps/${app.slug}/download`;
    setTimeout(loadApps, 1200); // refresh the real counter shortly after
  });

  modal.hidden = false;
}

modalClose.addEventListener('click', () => (modal.hidden = true));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  render(apps.filter((a) => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q)));
});

loadApps();
