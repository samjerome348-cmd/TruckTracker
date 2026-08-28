// ---------- Application State ----------
let trucks = [];
let repairs = [];
let revenues = [];
let activeTruckId = null;
let calDate = new Date();

// ---------- Helpers ----------
function formatRupees(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function openPhotoModal(src) {
  const modal = document.getElementById('modal-photo');
  const img = document.getElementById('modal-photo-img');
  if (img) img.src = src;
  if (modal) modal.classList.remove('hidden');
}

// ---------- Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initFormListeners();
  initSupabaseAuthListener();
});

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

function initFormListeners() {
  const formAddTruck = document.getElementById('form-add-truck');
  const formAddRepair = document.getElementById('form-add-repair');
  const formAddRevenue = document.getElementById('form-add-revenue');
  const searchInput = document.getElementById('search-plate');

  if (formAddTruck) formAddTruck.addEventListener('submit', handleAddTruck);
  if (formAddRepair) formAddRepair.addEventListener('submit', handleAddRepair);
  if (formAddRevenue) formAddRevenue.addEventListener('submit', handleAddRevenue);
  if (searchInput) searchInput.addEventListener('input', filterTrucks);
}

// ---------- Supabase Authentication Handling ----------
function initSupabaseAuthListener() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    console.error('Supabase client not initialized.');
    return;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    const authScreen = document.getElementById('auth-screen');
    const appLayout = document.getElementById('app-layout');
    const userEmailElem = document.getElementById('sidebar-user');

    if (session) {
      if (authScreen) authScreen.classList.add('hidden');
      if (appLayout) appLayout.classList.remove('hidden');
      if (userEmailElem) userEmailElem.innerText = session.user.email;
      loadSupabaseData();
    } else {
      if (authScreen) authScreen.classList.remove('hidden');
      if (appLayout) appLayout.classList.add('hidden');
    }
  });
}

async function handleLogout() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  window.location.reload();
}

// ---------- Data Fetching ----------
async function loadSupabaseData() {
  await Promise.all([fetchTrucks(), fetchRepairs(), fetchRevenues()]);
}

async function fetchTrucks() {
  const { data, error } = await supabaseClient
    .from('trucks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error fetching trucks: ' + error.message, 'error');
    return;
  }

  trucks = (data || []).map(t => ({
    id: t.id,
    plate: t.plate,
    model: t.model,
    year: t.year,
    ownerPhone: t.owner_phone,
    driverPhone: t.driver_phone
  }));

  renderTrucks(trucks);
  populateTruckDropdowns();
}

async function fetchRepairs() {
  const { data, error } = await supabaseClient
    .from('repairs')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    showToast('Error fetching repairs: ' + error.message, 'error');
    return;
  }

  repairs = (data || []).map(r => ({
    id: r.id,
    truckId: r.truck_id,
    date: r.date,
    description: r.description,
    materials: r.materials,
    cost: parseFloat(r.cost || 0),
    status: r.status,
    photoUrl: r.photo_url
  }));

  if (activeTruckId) fetchRepairsForTruck(activeTruckId);
  renderCalendar();
}

async function fetchRevenues() {
  const { data, error } = await supabaseClient
    .from('revenues')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    showToast('Error fetching revenues: ' + error.message, 'error');
    return;
  }

  revenues = (data || []).map(r => ({
    id: r.id,
    date: r.date,
    amount: parseFloat(r.amount || 0),
    truckId: r.truck_id,
    notes: r.notes
  }));

  renderCalendar();
}

// ---------- View & Dropdown Management ----------
function populateTruckDropdowns() {
  const select = document.getElementById('revenue-truck');
  if (!select) return;
  select.innerHTML = `<option value="">-- All Fleet / General --</option>` + 
    trucks.map(t => `<option value="${t.id}">${t.plate} (${t.model || 'Truck'})</option>`).join('');
}

function switchView(viewName) {
  const views = ['fleet', 'truck-detail', 'calendar', 'analytics'];
  const navs = ['fleet', 'calendar', 'analytics'];

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });

  navs.forEach(n => {
    const el = document.getElementById(`nav-${n}`);
    if (el) el.classList.remove('active');
  });

  if (viewName === 'fleet') {
    document.getElementById('view-fleet')?.classList.remove('hidden');
    document.getElementById('nav-fleet')?.classList.add('active');
  } else if (viewName === 'calendar') {
    document.getElementById('view-calendar')?.classList.remove('hidden');
    document.getElementById('nav-calendar')?.classList.add('active');
    renderCalendar();
  } else if (viewName === 'analytics') {
    document.getElementById('view-analytics')?.classList.remove('hidden');
    document.getElementById('nav-analytics')?.classList.add('active');
  } else if (viewName === 'detail') {
    document.getElementById('view-truck-detail')?.classList.remove('hidden');
  }
}

// ---------- Truck Management ----------
function renderTrucks(data) {
  const container = document.getElementById('trucks-container');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `<div class="empty-state">No trucks registered in your database. Click "+ Add Truck".</div>`;
    return;
  }

  container.innerHTML = data.map(truck => `
    <div class="truck-card">
      <div class="truck-card-header">
        <span class="plate">${truck.plate}</span>
        <div class="card-actions">
          <button class="btn-icon" onclick="openAddTruckModal('${truck.id}')" title="Edit Truck">✏️</button>
          <button class="btn-icon text-red" onclick="deleteTruck('${truck.id}')" title="Delete Truck">🗑️</button>
        </div>
      </div>
      <div class="meta" onclick="openTruckDetail('${truck.id}')">
        <strong>Model:</strong> ${truck.model || 'N/A'}<br>
        <strong>Year:</strong> ${truck.year || 'N/A'}
      </div>
      <div class="contact-chips" onclick="openTruckDetail('${truck.id}')">
        ${truck.ownerPhone ? `<span class="chip">👑 Owner: ${truck.ownerPhone}</span>` : ''}
        ${truck.driverPhone ? `<span class="chip">🚚 Driver: ${truck.driverPhone}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function filterTrucks() {
  const input = document.getElementById('search-plate');
  if (!input) return;
  const query = input.value.toLowerCase();
  const filtered = trucks.filter(t => 
    t.plate.toLowerCase().includes(query) || 
    (t.model && t.model.toLowerCase().includes(query)) ||
    (t.ownerPhone && t.ownerPhone.toLowerCase().includes(query)) ||
    (t.driverPhone && t.driverPhone.toLowerCase().includes(query))
  );
  renderTrucks(filtered);
}

function openTruckDetail(truckId) {
  activeTruckId = truckId;
  const truck = trucks.find(t => t.id === truckId);
  if (!truck) return;

  const detailPlate = document.getElementById('detail-plate');
  const detailMeta = document.getElementById('detail-meta');
  const detailContacts = document.getElementById('detail-contacts');

  if (detailPlate) detailPlate.innerText = truck.plate;
  if (detailMeta) detailMeta.innerHTML = `Model: ${truck.model || 'N/A'} | Year: ${truck.year || 'N/A'}`;
  if (detailContacts) {
    detailContacts.innerHTML = `
      ${truck.ownerPhone ? `<span class="chip">👑 Owner: ${truck.ownerPhone}</span>` : ''}
      ${truck.driverPhone ? `<span class="chip">🚚 Driver: ${truck.driverPhone}</span>` : ''}
    `;
  }

  fetchRepairsForTruck(truckId);
  switchView('detail');
}

function editCurrentTruck() {
  if (activeTruckId) openAddTruckModal(activeTruckId);
}

function openAddTruckModal(truckId = null) {
  const modal = document.getElementById('modal-add-truck');
  const title = document.getElementById('modal-truck-title');
  const editId = document.getElementById('truck-edit-id');
  const form = document.getElementById('form-add-truck');
  
  if (truckId) {
    const truck = trucks.find(t => t.id === truckId);
    if (truck) {
      if (title) title.innerText = "Edit Truck";
      if (editId) editId.value = truck.id;
      document.getElementById('truck-plate').value = truck.plate;
      document.getElementById('truck-model').value = truck.model || '';
      document.getElementById('truck-year').value = truck.year || '';
      document.getElementById('truck-owner-phone').value = truck.ownerPhone || '';
      document.getElementById('truck-driver-phone').value = truck.driverPhone || '';
    }
  } else {
    if (title) title.innerText = "Add New Truck";
    if (editId) editId.value = "";
    if (form) form.reset();
  }
  if (modal) modal.classList.remove('hidden');
}

async function handleAddTruck(e) {
  e.preventDefault();
  const editId = document.getElementById('truck-edit-id').value;
  
  const payload = {
    plate: document.getElementById('truck-plate').value.trim(),
    model: document.getElementById('truck-model').value.trim() || null,
    year: document.getElementById('truck-year').value ? parseInt(document.getElementById('truck-year').value) : null,
    owner_phone: document.getElementById('truck-owner-phone').value.trim() || null,
    driver_phone: document.getElementById('truck-driver-phone').value.trim() || null
  };

  if (editId) payload.id = editId;

  const { error } = await supabaseClient.from('trucks').upsert([payload]);
  if (error) {
    showToast('Failed to save truck: ' + error.message, 'error');
    return;
  }
  await fetchTrucks();
  showToast('Truck saved to database!', 'success');
  closeModal('modal-add-truck');
  if (activeTruckId && activeTruckId === editId) openTruckDetail(activeTruckId);
}

async function deleteTruck(truckId) {
  if (!confirm('Are you sure you want to delete this truck from your database?')) return;
  const { error } = await supabaseClient.from('trucks').delete().eq('id', truckId);
  if (error) {
    showToast('Failed to delete truck: ' + error.message, 'error');
    return;
  }
  await fetchTrucks();
  if (activeTruckId === truckId) switchView('fleet');
  showToast('Truck deleted.', 'success');
}

// ---------- Repair Management ----------
function fetchRepairsForTruck(truckId) {
  const filtered = repairs.filter(r => r.truckId === truckId);
  renderRepairsTree(filtered);
}

function renderRepairsTree(repairList) {
  const container = document.getElementById('repairs-tree-container');
  if (!container) return;

  if (repairList.length === 0) {
    container.innerHTML = `<div class="empty-state">No repair records logged for this vehicle.</div>`;
    return;
  }

  repairList.sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = repairList.map(item => `
    <div class="job-row">
      <div class="job-row-head">
        <div>
          <strong>${item.description}</strong>
          <div class="meta-info">${item.date}</div>
        </div>
        <div class="job-right-side">
          <div class="job-total">${formatRupees(item.cost)}</div>
          <button class="btn-icon" onclick="openAddRepairModal('${item.id}')" title="Edit Repair">✏️</button>
          <button class="btn-icon text-red" onclick="deleteRepair('${item.id}')" title="Delete Repair">🗑️</button>
        </div>
      </div>
      ${item.materials ? `
        <div class="materials-box">
          <strong>🛠️ Materials / Parts:</strong> ${item.materials}
        </div>
      ` : ''}
      <div class="job-row-footer">
        <span class="badge badge-${item.status}">${item.status}</span>
        ${item.photoUrl ? `
          <button class="btn btn-ghost btn-sm" onclick="openPhotoModal('${item.photoUrl}')">📷 View Receipt/Photo</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function openAddRepairModal(repairId = null) {
  const modal = document.getElementById('modal-add-repair');
  const title = document.getElementById('modal-repair-title');
  const editId = document.getElementById('repair-edit-id');
  const form = document.getElementById('form-add-repair');

  if (repairId) {
    const rep = repairs.find(r => r.id === repairId);
    if (rep) {
      if (title) title.innerText = "Edit Repair Job";
      if (editId) editId.value = rep.id;
      document.getElementById('repair-date').value = rep.date;
      document.getElementById('repair-desc').value = rep.description;
      document.getElementById('repair-materials').value = rep.materials || '';
      document.getElementById('repair-cost').value = rep.cost;
      document.getElementById('repair-status').value = rep.status;
    }
  } else {
    if (title) title.innerText = "Log Repair Job";
    if (editId) editId.value = "";
    if (form) form.reset();
    document.getElementById('repair-date').value = new Date().toISOString().split('T')[0];
  }
  if (modal) modal.classList.remove('hidden');
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

async function handleAddRepair(e) {
  e.preventDefault();
  const editId = document.getElementById('repair-edit-id').value;
  const date = document.getElementById('repair-date').value;
  const description = document.getElementById('repair-desc').value.trim();
  const materials = document.getElementById('repair-materials').value.trim() || null;
  const cost = parseFloat(document.getElementById('repair-cost').value);
  const status = document.getElementById('repair-status').value;
  const fileInput = document.getElementById('repair-photo');

  let photoBase64 = '';
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      photoBase64 = await readFileAsBase64(fileInput.files[0]);
    } catch (err) {
      showToast('Error reading image file', 'error');
      return;
    }
  } else if (editId) {
    const existing = repairs.find(r => r.id === editId);
    if (existing) photoBase64 = existing.photoUrl;
  }

  const payload = {
    truck_id: activeTruckId,
    date,
    description,
    materials,
    cost,
    status
  };

  if (editId) payload.id = editId;
  if (photoBase64) payload.photo_url = photoBase64;

  const { error } = await supabaseClient.from('repairs').upsert([payload]);
  if (error) {
    showToast('Failed to save repair: ' + error.message, 'error');
    return;
  }
  await fetchRepairs();
  showToast('Repair job saved to database!', 'success');
  closeModal('modal-add-repair');
}

async function deleteRepair(repairId) {
  if (!confirm('Delete this repair record from database?')) return;
  const { error } = await supabaseClient.from('repairs').delete().eq('id', repairId);
  if (error) {
    showToast('Failed to delete repair: ' + error.message, 'error');
    return;
  }
  await fetchRepairs();
  showToast('Repair entry deleted.', 'success');
}

// ---------- Revenue Management ----------
function openAddRevenueModal(dateStr = null, revenueId = null) {
  const modal = document.getElementById('modal-add-revenue');
  const title = document.getElementById('modal-revenue-title');
  const editId = document.getElementById('revenue-edit-id');
  const deleteBtn = document.getElementById('btn-delete-revenue');
  const form = document.getElementById('form-add-revenue');

  if (revenueId) {
    const rev = revenues.find(r => r.id === revenueId);
    if (rev) {
      if (title) title.innerText = "Edit / Delete Revenue Entry";
      if (editId) editId.value = rev.id;
      document.getElementById('revenue-date').value = rev.date;
      document.getElementById('revenue-amount').value = rev.amount;
      document.getElementById('revenue-truck').value = rev.truckId || '';
      document.getElementById('revenue-notes').value = rev.notes || '';
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    }
  } else {
    if (title) title.innerText = "Log Daily Revenue";
    if (editId) editId.value = "";
    if (form) form.reset();
    document.getElementById('revenue-date').value = dateStr || new Date().toISOString().split('T')[0];
    if (deleteBtn) deleteBtn.classList.add('hidden');
  }
  if (modal) modal.classList.remove('hidden');
}

async function handleAddRevenue(e) {
  e.preventDefault();
  const editId = document.getElementById('revenue-edit-id').value;
  const date = document.getElementById('revenue-date').value;
  const amount = parseFloat(document.getElementById('revenue-amount').value);
  const truckId = document.getElementById('revenue-truck').value || null;
  const notes = document.getElementById('revenue-notes').value.trim() || null;

  const payload = { date, amount, truck_id: truckId, notes };
  if (editId) payload.id = editId;

  const { error } = await supabaseClient.from('revenues').upsert([payload]);
  if (error) {
    showToast('Failed to save revenue: ' + error.message, 'error');
    return;
  }
  await fetchRevenues();
  showToast('Revenue updated in database!', 'success');
  closeModal('modal-add-revenue');
}

function handleDeleteRevenueFromModal() {
  const id = document.getElementById('revenue-edit-id').value;
  if (id) {
    deleteRevenue(id);
    closeModal('modal-add-revenue');
  }
}

async function deleteRevenue(revenueId) {
  if (!confirm('Delete this revenue entry from Supabase?')) return;
  const { error } = await supabaseClient.from('revenues').delete().eq('id', revenueId);
  if (error) {
    showToast('Failed to delete revenue: ' + error.message, 'error');
    return;
  }
  await fetchRevenues();
  showToast('Revenue deleted.', 'success');
}

// ---------- Calendar & Financial Summary ----------
function changeMonth(delta) {
  calDate.setMonth(calDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendar-grid');
  const monthTitle = document.getElementById('calendar-month-title');
  if (!container || !monthTitle) return;

  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthTitle.innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  container.innerHTML = '';

  let mTotalRevenue = 0;
  let mTotalExpenses = 0;

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    container.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateFormatted = `${year}-${monthStr}-${dayStr}`;

    const dayRevenues = revenues.filter(r => r.date === dateFormatted);
    const dayRepairs = repairs.filter(r => r.date === dateFormatted);

    const dayRevTotal = dayRevenues.reduce((acc, r) => acc + Number(r.amount), 0);
    const dayExpTotal = dayRepairs.reduce((acc, r) => acc + Number(r.cost), 0);
    const dayNet = dayRevTotal - dayExpTotal;

    mTotalRevenue += dayRevTotal;
    mTotalExpenses += dayExpTotal;

    let pnlClass = '';
    if (dayRevTotal > 0 || dayExpTotal > 0) {
      pnlClass = dayNet >= 0 ? 'status-profit' : 'status-loss';
    }

    let statsHtml = '';

    dayRevenues.forEach(r => {
      statsHtml += `
        <div class="day-stat rev" style="cursor: pointer;" onclick="openAddRevenueModal('${dateFormatted}', '${r.id}')" title="Click to edit/delete revenue">
          +₹${Number(r.amount).toLocaleString('en-IN')} ✏️
        </div>
      `;
    });

    if (dayExpTotal > 0) {
      statsHtml += `<div class="day-stat exp">-₹${dayExpTotal.toLocaleString('en-IN')}</div>`;
    }

    if (dayRevTotal > 0 && dayExpTotal > 0) {
      statsHtml += `<div class="day-stat net ${dayNet >= 0 ? 'text-green' : 'text-red'}">Net ${dayNet >= 0 ? '+' : ''}₹${Math.abs(dayNet).toLocaleString('en-IN')}</div>`;
    }

    const cell = document.createElement('div');
    cell.className = `calendar-day ${pnlClass}`;
    cell.innerHTML = `
      <div class="day-head">
        <span class="day-num">${day}</span>
        <button class="btn-add-day" onclick="openAddRevenueModal('${dateFormatted}')" title="Log Income">+</button>
      </div>
      <div class="day-body">
        ${statsHtml}
      </div>
    `;

    container.appendChild(cell);
  }

  const netPnL = mTotalRevenue - mTotalExpenses;
  const revElem = document.getElementById('month-total-revenue');
  const expElem = document.getElementById('month-total-expenses');
  const netElem = document.getElementById('month-net-pnl');

  if (revElem) revElem.innerText = formatRupees(mTotalRevenue);
  if (expElem) expElem.innerText = formatRupees(mTotalExpenses);
  
  if (netElem) {
    netElem.innerText = `${netPnL >= 0 ? '+' : '-'}${formatRupees(Math.abs(netPnL))}`;
    netElem.className = `val ${netPnL >= 0 ? 'text-green' : 'text-red'}`;
  }
}
