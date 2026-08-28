// Application State
let trucks = [];
let repairs = [];
let revenues = [];
let activeTruckId = null;

// Calendar Navigation State
let calDate = new Date();

// Helper: Format Currency in Indian Rupees (en-IN)
function formatRupees(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSupabaseSession();
});

// Theme Engine Toggle
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

// Supabase Connection & Data Bootstrapping
async function initSupabaseSession() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    document.getElementById('sidebar-user').innerText = 'Supabase Connected';
    await Promise.all([fetchTrucks(), fetchRepairs(), fetchRevenues()]);
  } else {
    console.warn('Supabase client not detected. Loading local demo data.');
    document.getElementById('sidebar-user').innerText = 'Demo Mode';
    loadDemoData();
  }
}

// Fallback Demo Data
function loadDemoData() {
  trucks = [
    { id: '1', plate: 'KA-04-MN-3001', model: 'Volvo FH16', year: 2023, ownerPhone: '+91 98765-43210', driverPhone: '+91 98765-12345' },
    { id: '2', plate: 'MH-12-PQ-8921', model: 'Tata Signa 5530', year: 2022, ownerPhone: '+91 98123-45678', driverPhone: '+91 98987-65432' }
  ];
  repairs = [
    { id: 'r1', truckId: '1', date: '2026-08-05', description: 'Engine Oil & Filter Service', materials: '15W-40 Synthetic Oil 10L, Oil Filter', cost: 12500.00, status: 'completed', photoUrl: '' },
    { id: 'r2', truckId: '1', date: '2026-08-15', description: 'Front Heavy Duty Brake Shoe', materials: '2x Brake Lining Set, Drum Servicing', cost: 28000.00, status: 'completed', photoUrl: '' },
    { id: 'r3', truckId: '2', date: '2026-08-20', description: 'Clutch Assembly Replacement', materials: 'Clutch Plate 395mm, Release Bearing', cost: 34500.00, status: 'in-progress', photoUrl: '' }
  ];
  revenues = [
    { id: 'rev1', date: '2026-08-05', amount: 85000.00, truckId: '1', notes: 'Bengaluru to Mumbai freight' },
    { id: 'rev2', date: '2026-08-15', amount: 42000.00, truckId: '1', notes: 'Local logistics haul' },
    { id: 'rev3', date: '2026-08-20', amount: 110000.00, truckId: '2', notes: 'Industrial machinery transport' }
  ];
  renderTrucks(trucks);
  renderCalendar();
  populateTruckDropdowns();
}

// Fetch Data Functions from Supabase
async function fetchTrucks() {
  if (typeof supabaseClient === 'undefined') return;
  const { data, error } = await supabaseClient.from('trucks').select('*').order('created_at', { ascending: false });
  if (!error && data) {
    trucks = data.map(t => ({
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
}

async function fetchRepairs() {
  if (typeof supabaseClient === 'undefined') return;
  const { data, error } = await supabaseClient.from('repairs').select('*').order('date', { ascending: false });
  if (!error && data) {
    repairs = data.map(r => ({
      id: r.id,
      truckId: r.truck_id,
      date: r.date,
      description: r.description,
      materials: r.materials,
      cost: parseFloat(r.cost),
      status: r.status,
      photoUrl: r.photo_url
    }));
    if (activeTruckId) fetchRepairsForTruck(activeTruckId);
    renderCalendar();
  }
}

async function fetchRevenues() {
  if (typeof supabaseClient === 'undefined') return;
  const { data, error } = await supabaseClient.from('revenues').select('*').order('date', { ascending: false });
  if (!error && data) {
    revenues = data.map(r => ({
      id: r.id,
      date: r.date,
      amount: parseFloat(r.amount),
      truckId: r.truck_id,
      notes: r.notes
    }));
    renderCalendar();
  }
}

// Populate Select Truck Dropdowns
function populateTruckDropdowns() {
  const select = document.getElementById('revenue-truck');
  if (!select) return;
  select.innerHTML = `<option value="">-- All Fleet / General --</option>` + 
    trucks.map(t => `<option value="${t.id}">${t.plate} (${t.model || 'Truck'})</option>`).join('');
}

// Render Fleet Grid
function renderTrucks(data) {
  const container = document.getElementById('trucks-container');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `<div class="empty-state">No trucks registered. Click "+ Add Truck" to get started.</div>`;
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

// Filter Search
function filterTrucks() {
  const query = document.getElementById('search-plate').value.toLowerCase();
  const filtered = trucks.filter(t => 
    t.plate.toLowerCase().includes(query) || 
    (t.model && t.model.toLowerCase().includes(query)) ||
    (t.ownerPhone && t.ownerPhone.toLowerCase().includes(query)) ||
    (t.driverPhone && t.driverPhone.toLowerCase().includes(query))
  );
  renderTrucks(filtered);
}

// View Switching Logic
function switchView(viewName) {
  document.getElementById('view-fleet').classList.add('hidden');
  document.getElementById('view-truck-detail').classList.add('hidden');
  document.getElementById('view-calendar').classList.add('hidden');
  document.getElementById('view-analytics').classList.add('hidden');

  document.getElementById('nav-fleet').classList.remove('active');
  document.getElementById('nav-calendar').classList.remove('active');
  document.getElementById('nav-analytics').classList.remove('active');

  if (viewName === 'fleet') {
    document.getElementById('view-fleet').classList.remove('hidden');
    document.getElementById('nav-fleet').classList.add('active');
  } else if (viewName === 'calendar') {
    document.getElementById('view-calendar').classList.remove('hidden');
    document.getElementById('nav-calendar').classList.add('active');
    renderCalendar();
  } else if (viewName === 'analytics') {
    document.getElementById('view-analytics').classList.remove('hidden');
    document.getElementById('nav-analytics').classList.add('active');
  } else if (viewName === 'detail') {
    document.getElementById('view-truck-detail').classList.remove('hidden');
  }
}

// Truck Detail & Repairs View
function openTruckDetail(truckId) {
  activeTruckId = truckId;
  const truck = trucks.find(t => t.id === truckId);
  if (!truck) return;

  document.getElementById('detail-plate').innerText = truck.plate;
  document.getElementById('detail-meta').innerHTML = `Model: ${truck.model || 'N/A'} | Year: ${truck.year || 'N/A'}`;
  
  document.getElementById('detail-contacts').innerHTML = `
    ${truck.ownerPhone ? `<span class="chip">👑 Owner: ${truck.ownerPhone}</span>` : ''}
    ${truck.driverPhone ? `<span class="chip">🚚 Driver: ${truck.driverPhone}</span>` : ''}
  `;

  fetchRepairsForTruck(truckId);
  switchView('detail');
}

function editCurrentTruck() {
  if (activeTruckId) openAddTruckModal(activeTruckId);
}

// Filter Repairs for Selected Truck
function fetchRepairsForTruck(truckId) {
  const filtered = repairs.filter(r => r.truckId === truckId);
  renderRepairsTree(filtered);
}

// Render Repair History Cards
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

// Modal Operations
function openAddTruckModal(truckId = null) {
  const modal = document.getElementById('modal-add-truck');
  const title = document.getElementById('modal-truck-title');
  const editId = document.getElementById('truck-edit-id');
  
  if (truckId) {
    const truck = trucks.find(t => t.id === truckId);
    if (truck) {
      title.innerText = "Edit Truck";
      editId.value = truck.id;
      document.getElementById('truck-plate').value = truck.plate;
      document.getElementById('truck-model').value = truck.model || '';
      document.getElementById('truck-year').value = truck.year || '';
      document.getElementById('truck-owner-phone').value = truck.ownerPhone || '';
      document.getElementById('truck-driver-phone').value = truck.driverPhone || '';
    }
  } else {
    title.innerText = "Add New Truck";
    editId.value = "";
    document.getElementById('form-add-truck').reset();
  }
  modal.classList.remove('hidden');
}

function openAddRepairModal(repairId = null) {
  const modal = document.getElementById('modal-add-repair');
  const title = document.getElementById('modal-repair-title');
  const editId = document.getElementById('repair-edit-id');

  if (repairId) {
    const rep = repairs.find(r => r.id === repairId);
    if (rep) {
      title.innerText = "Edit Repair Job";
      editId.value = rep.id;
      document.getElementById('repair-date').value = rep.date;
      document.getElementById('repair-desc').value = rep.description;
      document.getElementById('repair-materials').value = rep.materials || '';
      document.getElementById('repair-cost').value = rep.cost;
      document.getElementById('repair-status').value = rep.status;
    }
  } else {
    title.innerText = "Log Repair Job";
    editId.value = "";
    document.getElementById('form-add-repair').reset();
    document.getElementById('repair-date').value = new Date().toISOString().split('T')[0];
  }
  modal.classList.remove('hidden');
}

function openAddRevenueModal(dateStr = null, revenueId = null) {
  const modal = document.getElementById('modal-add-revenue');
  const title = document.getElementById('modal-revenue-title');
  const editId = document.getElementById('revenue-edit-id');

  if (revenueId) {
    const rev = revenues.find(r => r.id === revenueId);
    if (rev) {
      title.innerText = "Edit Daily Revenue";
      editId.value = rev.id;
      document.getElementById('revenue-date').value = rev.date;
      document.getElementById('revenue-amount').value = rev.amount;
      document.getElementById('revenue-truck').value = rev.truckId || '';
      document.getElementById('revenue-notes').value = rev.notes || '';
    }
  } else {
    title.innerText = "Log Daily Revenue";
    editId.value = "";
    document.getElementById('form-add-revenue').reset();
    document.getElementById('revenue-date').value = dateStr || new Date().toISOString().split('T')[0];
  }
  modal.classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function openPhotoModal(src) {
  document.getElementById('modal-photo-img').src = src;
  document.getElementById('modal-photo').classList.remove('hidden');
}

// Truck CRUD
async function handleAddTruck(e) {
  e.preventDefault();
  const id = document.getElementById('truck-edit-id').value || Date.now().toString();
  const payload = {
    id,
    plate: document.getElementById('truck-plate').value.trim(),
    model: document.getElementById('truck-model').value.trim() || null,
    year: document.getElementById('truck-year').value ? parseInt(document.getElementById('truck-year').value) : null,
    owner_phone: document.getElementById('truck-owner-phone').value.trim() || null,
    driver_phone: document.getElementById('truck-driver-phone').value.trim() || null
  };

  if (typeof supabaseClient !== 'undefined') {
    const { error } = await supabaseClient.from('trucks').upsert([payload]);
    if (error) {
      showToast('Failed to save truck: ' + error.message, 'error');
      return;
    }
    await fetchTrucks();
  } else {
    const idx = trucks.findIndex(t => t.id === id);
    const formatted = {
      id,
      plate: payload.plate,
      model: payload.model,
      year: payload.year,
      ownerPhone: payload.owner_phone,
      driverPhone: payload.driver_phone
    };
    if (idx !== -1) trucks[idx] = formatted;
    else trucks.unshift(formatted);
    renderTrucks(trucks);
    populateTruckDropdowns();
  }

  showToast('Truck saved successfully!', 'success');
  closeModal('modal-add-truck');
  if (activeTruckId === id) openTruckDetail(activeTruckId);
}

async function deleteTruck(truckId) {
  if (!confirm('Are you sure you want to delete this truck and its history?')) return;
  if (typeof supabaseClient !== 'undefined') {
    const { error } = await supabaseClient.from('trucks').delete().eq('id', truckId);
    if (error) {
      showToast('Failed to delete truck: ' + error.message, 'error');
      return;
    }
    await fetchTrucks();
  } else {
    trucks = trucks.filter(t => t.id !== truckId);
    repairs = repairs.filter(r => r.truckId !== truckId);
    renderTrucks(trucks);
    populateTruckDropdowns();
  }
  if (activeTruckId === truckId) switchView('fleet');
  showToast('Truck deleted.', 'error');
}

// Repair CRUD
async function handleAddRepair(e) {
  e.preventDefault();
  const id = document.getElementById('repair-edit-id').value || Date.now().toString();
  const date = document.getElementById('repair-date').value;
  const description = document.getElementById('repair-desc').value.trim();
  const materials = document.getElementById('repair-materials').value.trim() || null;
  const cost = parseFloat(document.getElementById('repair-cost').value);
  const status = document.getElementById('repair-status').value;
  const fileInput = document.getElementById('repair-photo');

  const saveRepairPayload = async (photoBase64 = '') => {
    const payload = {
      id,
      truck_id: activeTruckId,
      date,
      description,
      materials,
      cost,
      status
    };
    if (photoBase64) payload.photo_url = photoBase64;

    if (typeof supabaseClient !== 'undefined') {
      const { error } = await supabaseClient.from('repairs').upsert([payload]);
      if (error) {
        showToast('Failed to save repair: ' + error.message, 'error');
        return;
      }
      await fetchRepairs();
    } else {
      const idx = repairs.findIndex(r => r.id === id);
      const repObj = { id, truckId: activeTruckId, date, description, materials, cost, status, photoUrl: photoBase64 || (repairs[idx]?.photoUrl || '') };
      if (idx !== -1) repairs[idx] = repObj;
      else repairs.unshift(repObj);
      fetchRepairsForTruck(activeTruckId);
      renderCalendar();
    }

    showToast('Repair job logged!', 'success');
    closeModal('modal-add-repair');
  };

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      saveRepairPayload(evt.target.result);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    const existing = repairs.find(r => r.id === id);
    saveRepairPayload(existing ? existing.photoUrl : '');
  }
}

async function deleteRepair(repairId) {
  if (!confirm('Are you sure you want to delete this repair record?')) return;
  if (typeof supabaseClient !== 'undefined') {
    const { error } = await supabaseClient.from('repairs').delete().eq('id', repairId);
    if (error) {
      showToast('Failed to delete repair: ' + error.message, 'error');
      return;
    }
    await fetchRepairs();
  } else {
    repairs = repairs.filter(r => r.id !== repairId);
    fetchRepairsForTruck(activeTruckId);
    renderCalendar();
  }
  showToast('Repair entry deleted.', 'error');
}

// Revenue CRUD
async function handleAddRevenue(e) {
  e.preventDefault();
  const id = document.getElementById('revenue-edit-id').value || Date.now().toString();
  const date = document.getElementById('revenue-date').value;
  const amount = parseFloat(document.getElementById('revenue-amount').value);
  const truckId = document.getElementById('revenue-truck').value || null;
  const notes = document.getElementById('revenue-notes').value.trim() || null;

  const payload = { id, date, amount, truck_id: truckId, notes };

  if (typeof supabaseClient !== 'undefined') {
    const { error } = await supabaseClient.from('revenues').upsert([payload]);
    if (error) {
      showToast('Failed to save revenue: ' + error.message, 'error');
      return;
    }
    await fetchRevenues();
  } else {
    const idx = revenues.findIndex(r => r.id === id);
    const revObj = { id, date, amount, truckId, notes };
    if (idx !== -1) revenues[idx] = revObj;
    else revenues.unshift(revObj);
    renderCalendar();
  }

  showToast('Revenue record updated!', 'success');
  closeModal('modal-add-revenue');
}

async function deleteRevenue(revenueId) {
  if (!confirm('Delete this revenue entry?')) return;
  if (typeof supabaseClient !== 'undefined') {
    const { error } = await supabaseClient.from('revenues').delete().eq('id', revenueId);
    if (error) {
      showToast('Failed to delete revenue: ' + error.message, 'error');
      return;
    }
    await fetchRevenues();
  } else {
    revenues = revenues.filter(r => r.id !== revenueId);
    renderCalendar();
  }
  showToast('Revenue deleted.', 'error');
}

// Calendar Engine & Profit/Loss Calculation
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

  // Empty cells before start of month
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    container.appendChild(emptyCell);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateFormatted = `${year}-${monthStr}-${dayStr}`;

    // Filter day data
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

    const cell = document.createElement('div');
    cell.className = `calendar-day ${pnlClass}`;
    cell.innerHTML = `
      <div class="day-head">
        <span class="day-num">${day}</span>
        <button class="btn-add-day" onclick="openAddRevenueModal('${dateFormatted}')" title="Log Income">+</button>
      </div>
      <div class="day-body">
        ${dayRevTotal > 0 ? `<div class="day-stat rev">+₹${dayRevTotal.toLocaleString('en-IN')}</div>` : ''}
        ${dayExpTotal > 0 ? `<div class="day-stat exp">-₹${dayExpTotal.toLocaleString('en-IN')}</div>` : ''}
        ${(dayRevTotal > 0 || dayExpTotal > 0) ? `
          <div class="day-stat net ${dayNet >= 0 ? 'text-green' : 'text-red'}">
            ${dayNet >= 0 ? '+' : ''}₹${Math.abs(dayNet).toLocaleString('en-IN')}
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(cell);
  }

  // Update Summary Banners
  const netPnL = mTotalRevenue - mTotalExpenses;
  document.getElementById('month-total-revenue').innerText = formatRupees(mTotalRevenue);
  document.getElementById('month-total-expenses').innerText = formatRupees(mTotalExpenses);
  
  const netElem = document.getElementById('month-net-pnl');
  netElem.innerText = `${netPnL >= 0 ? '+' : '-'}${formatRupees(Math.abs(netPnL))}`;
  netElem.className = `val ${netPnL >= 0 ? 'text-green' : 'text-red'}`;
}

// Toast Notifications Utility
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Sign out handler
async function handleLogout() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
    await supabaseClient.auth.signOut();
    location.reload();
  } else {
    showToast('Signed out demo mode.', 'success');
  }
}
