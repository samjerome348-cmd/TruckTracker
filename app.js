// ============================================================
// State
// ============================================================
let currentUser = null;
let allTrucks = [];
let currentTruckId = null;

// ============================================================
// Boot
// ============================================================
(async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;
  
  const userEl = document.getElementById('sidebar-user');
  if (userEl) userEl.textContent = currentUser.email;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) window.location.href = 'index.html';
  });

  await loadTrucks();
  wireUpUI();
})();

// ============================================================
// Toast & UI Helpers
// ============================================================
function toast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'msg show ' + (type === 'error' ? 'msg-error' : 'msg-success');
}

function openModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden'); 
}

function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden'); 
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ============================================================
// Load & Render Trucks
// ============================================================
async function loadTrucks() {
  const { data, error } = await supabaseClient
    .from('trucks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { toast('Could not load trucks: ' + error.message, 'error'); return; }
  allTrucks = data || [];
  renderTrucks(allTrucks);
}

function renderTrucks(trucks) {
  const grid = document.getElementById('trucks-grid');
  const empty = document.getElementById('trucks-empty');
  if (!grid || !empty) return;
  
  grid.innerHTML = '';

  if (trucks.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  trucks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'truck-card';
    card.innerHTML = `
      <span class="plate">${escapeHtml(t.plate_number)}</span>
      <div class="meta">
        <div><b>Owner:</b> ${escapeHtml(t.owner_name || '—')} ${t.owner_phone ? '· ' + escapeHtml(t.owner_phone) : ''}</div>
        <div><b>Driver:</b> ${escapeHtml(t.driver_name || '—')} ${t.driver_phone ? '· ' + escapeHtml(t.driver_phone) : ''}</div>
      </div>
    `;
    card.addEventListener('click', () => openTruckDetail(t.id));
    grid.appendChild(card);
  });
}

// ============================================================
// Truck Detail View
// ============================================================
async function openTruckDetail(truckId) {
  currentTruckId = truckId;
  const truck = allTrucks.find(t => t.id === truckId);
  if (!truck) return;

  document.getElementById('detail-plate').textContent = truck.plate_number;
  document.getElementById('detail-owner-name').textContent = truck.owner_name || '—';
  document.getElementById('detail-owner-phone').textContent = truck.owner_phone || '';
  document.getElementById('detail-driver-name').textContent = truck.driver_name || '—';
  document.getElementById('detail-driver-phone').textContent = truck.driver_phone || '';

  document.getElementById('view-trucks').classList.add('hidden');
  document.getElementById('view-truck-detail').classList.remove('hidden');

  await loadRepairs(truckId);
}

function backToTrucks() {
  currentTruckId = null;
  document.getElementById('view-truck-detail').classList.add('hidden');
  document.getElementById('view-trucks').classList.remove('hidden');
  loadTrucks();
}

// ============================================================
// Repairs, Materials, Labour
// ============================================================
async function loadRepairs(truckId) {
  const list = document.getElementById('repairs-list');
  const empty = document.getElementById('repairs-empty');
  if (!list || !empty) return;

  list.innerHTML = '<p style="color:var(--ink-soft);font-size:0.85rem;">Loading...</p>';

  const { data: repairs, error } = await supabaseClient
    .from('repairs')
    .select('*')
    .eq('truck_id', truckId)
    .order('repair_date', { ascending: false });

  if (error) { toast('Could not load repairs: ' + error.message, 'error'); list.innerHTML = ''; return; }

  if (!repairs || repairs.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const repairIds = repairs.map(r => r.id);

  const [{ data: materials }, { data: labourRows }] = await Promise.all([
    supabaseClient.from('materials').select('*').in('repair_id', repairIds),
    supabaseClient.from('labour').select('*').in('repair_id', repairIds),
  ]);

  list.innerHTML = '';
  for (const r of repairs) {
    const mats = (materials || []).filter(m => m.repair_id === r.id);
    const labs = (labourRows || []).filter(l => l.repair_id === r.id);
    const matTotal = mats.reduce((s, m) => s + (Number(m.cost) || 0), 0);
    const labTotal = labs.reduce((s, l) => s + (Number(l.charge) || 0), 0);
    const grand = matTotal + labTotal;

    const row = document.createElement('div');
    row.className = 'job-row';

    let lineItemsHtml = '';
    for (const m of mats) {
      let imgTag = '';
      if (m.photo_path) {
        const { data: signed } = await supabaseClient.storage
          .from('material-photos')
          .createSignedUrl(m.photo_path, 3600);
        if (signed?.signedUrl) {
          imgTag = `<img src="${signed.signedUrl}" data-full="${signed.signedUrl}" class="view-photo">`;
        }
      }
      lineItemsHtml += `
        <div class="line-item">
          ${imgTag || '<span style="width:40px;"></span>'}
          <span class="name">${escapeHtml(m.name)} <span style="color:var(--ink-soft);">(material)</span></span>
          <span class="amt">₹${(Number(m.cost) || 0).toFixed(2)}</span>
        </div>`;
    }
    for (const l of labs) {
      lineItemsHtml += `
        <div class="line-item">
          <span style="width:40px;"></span>
          <span class="name">${escapeHtml(l.description || 'Labour')} <span style="color:var(--ink-soft);">(labour)</span></span>
          <span class="amt">₹${(Number(l.charge) || 0).toFixed(2)}</span>
        </div>`;
    }

    row.innerHTML = `
      <div class="job-row-head">
        <div>
          <b>${escapeHtml(r.description || 'Repair job')}</b><br>
          <span style="color:var(--ink-soft);font-size:0.82rem;">${escapeHtml(r.repair_date || '')}</span>
        </div>
        <div class="job-total">₹${grand.toFixed(2)}</div>
      </div>
      ${lineItemsHtml}
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm add-material-btn" data-repair="${r.id}">+ Material</button>
        <button class="btn btn-ghost btn-sm add-labour-btn" data-repair="${r.id}">+ Labour</button>
        <button class="btn btn-ghost btn-sm delete-repair-btn" data-repair="${r.id}" style="color:var(--red);border-color:var(--red);margin-left:auto;">Delete job</button>
      </div>
    `;
    list.appendChild(row);
  }

  // Wire per-row events
  list.querySelectorAll('.add-material-btn').forEach(b => b.addEventListener('click', () => {
    document.getElementById('f-material-repair-id').value = b.dataset.repair;
    document.getElementById('form-material').reset();
    document.getElementById('modal-material-msg').textContent = '';
    openModal('modal-material');
  }));

  list.querySelectorAll('.add-labour-btn').forEach(b => b.addEventListener('click', () => {
    document.getElementById('f-labour-repair-id').value = b.dataset.repair;
    document.getElementById('form-labour').reset();
    document.getElementById('modal-labour-msg').textContent = '';
    openModal('modal-labour');
  }));

  list.querySelectorAll('.delete-repair-btn').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this repair job and all its materials/labour entries?')) return;
    const { error } = await supabaseClient.from('repairs').delete().eq('id', b.dataset.repair);
    if (error) toast('Delete failed: ' + error.message, 'error');
    else { toast('Repair job deleted', 'success'); loadRepairs(currentTruckId); }
  }));

  list.querySelectorAll('.view-photo').forEach(img => img.addEventListener('click', () => {
    const photoViewer = document.getElementById('photo-viewer-img');
    if (photoViewer) photoViewer.src = img.dataset.full;
    openModal('modal-photo');
  }));
}

// ============================================================
// Wire UI Events
// ============================================================
function wireUpUI() {
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  document.getElementById('btn-back').addEventListener('click', backToTrucks);
  document.getElementById('nav-trucks').addEventListener('click', backToTrucks);

  document.getElementById('search-plate').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? allTrucks.filter(t => t.plate_number.toLowerCase().includes(q))
      : allTrucks;
    renderTrucks(filtered);
  });

  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.add('hidden'); });
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Add / Edit Truck
  document.getElementById('btn-add-truck').addEventListener('click', () => {
    document.getElementById('modal-truck-title').textContent = 'Add truck';
    document.getElementById('form-truck').reset();
    document.getElementById('form-truck').dataset.mode = 'create';
    document.getElementById('modal-truck-msg').textContent = '';
    openModal('modal-truck');
  });

  document.getElementById('btn-edit-truck').addEventListener('click', () => {
    const truck = allTrucks.find(t => t.id === currentTruckId);
    if (!truck) return;
    document.getElementById('modal-truck-title').textContent = 'Edit truck';
    document.getElementById('f-plate').value = truck.plate_number || '';
    document.getElementById('f-owner-name').value = truck.owner_name || '';
    document.getElementById('f-owner-phone').value = truck.owner_phone || '';
    document.getElementById('f-driver-name').value = truck.driver_name || '';
    document.getElementById('f-driver-phone').value = truck.driver_phone || '';
    document.getElementById('form-truck').dataset.mode = 'edit';
    document.getElementById('modal-truck-msg').textContent = '';
    openModal('modal-truck');
  });

  document.getElementById('btn-delete-truck').addEventListener('click', async () => {
    if (!confirm('Delete this truck and its entire repair history? This cannot be undone.')) return;
    const { error } = await supabaseClient.from('trucks').delete().eq('id', currentTruckId);
    if (error) { toast('Delete failed: ' + error.message, 'error'); return; }
    toast('Truck deleted', 'success');
    backToTrucks();
  });

  document.getElementById('form-truck').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('modal-truck-msg');
    const mode = e.target.dataset.mode;
    const payload = {
      plate_number: document.getElementById('f-plate').value.trim().toUpperCase(),
      owner_name: document.getElementById('f-owner-name').value.trim(),
      owner_phone: document.getElementById('f-owner-phone').value.trim(),
      driver_name: document.getElementById('f-driver-name').value.trim(),
      driver_phone: document.getElementById('f-driver-phone').value.trim(),
    };

    let error;
    if (mode === 'edit') {
      ({ error } = await supabaseClient.from('trucks').update(payload).eq('id', currentTruckId));
    } else {
      ({ error } = await supabaseClient.from('trucks').insert(payload));
    }

    if (error) { showMsg(msg, error.message, 'error'); return; }
    closeModal('modal-truck');
    toast(mode === 'edit' ? 'Truck updated' : 'Truck added', 'success');
    await loadTrucks();
    if (mode === 'edit') openTruckDetail(currentTruckId);
  });

  // Repair Job
  document.getElementById('btn-add-repair').addEventListener('click', () => {
    document.getElementById('form-repair').reset();
    document.getElementById('f-repair-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('modal-repair-msg').textContent = '';
    openModal('modal-repair');
  });

  document.getElementById('form-repair').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('modal-repair-msg');
    const payload = {
      truck_id: currentTruckId,
      repair_date: document.getElementById('f-repair-date').value,
      description: document.getElementById('f-repair-desc').value.trim(),
    };
    const { error } = await supabaseClient.from('repairs').insert(payload);
    if (error) { showMsg(msg, error.message, 'error'); return; }
    closeModal('modal-repair');
    toast('Repair job created', 'success');
    loadRepairs(currentTruckId);
  });

  // Material Upload
  document.getElementById('form-material').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('modal-material-msg');
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = 'Saving...';

    const repairId = document.getElementById('f-material-repair-id').value;
    const name = document.getElementById('f-material-name').value.trim();
    const costInput = document.getElementById('f-material-cost').value;
    const cost = parseFloat(costInput) || 0;
    const fileInput = document.getElementById('f-material-photo');
    const file = fileInput.files ? fileInput.files[0] : null;

    let photo_path = null;
    if (file) {
      const path = `${currentUser.id}/${repairId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('material-photos')
        .upload(path, file);
      if (uploadError) {
        showMsg(msg, 'Photo upload failed: ' + uploadError.message, 'error');
        btn.disabled = false; btn.textContent = 'Add material';
        return;
      }
      photo_path = path;
    }

    const { error } = await supabaseClient.from('materials').insert({
      repair_id: repairId, name, cost, photo_path
    });

    btn.disabled = false; btn.textContent = 'Add material';
    if (error) { showMsg(msg, error.message, 'error'); return; }
    closeModal('modal-material');
    toast('Material added', 'success');
    loadRepairs(currentTruckId);
  });

  // Labour Charge
  document.getElementById('form-labour').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('modal-labour-msg');
    const repairId = document.getElementById('f-labour-repair-id').value;
    const description = document.getElementById('f-labour-desc').value.trim();
    const charge = parseFloat(document.getElementById('f-labour-charge').value) || 0;

    const { error } = await supabaseClient.from('labour').insert({ repair_id: repairId, description, charge });
    if (error) { showMsg(msg, error.message, 'error'); return; }
    closeModal('modal-labour');
    toast('Labour charge added', 'success');
    loadRepairs(currentTruckId);
  });
}
