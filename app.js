// Application State
let trucks = [];
let repairs = [];
let revenues = [];
let activeTruckId = null;

// Calendar Navigation State
let calDate = new Date();

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupAuthListener();
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

// Firebase Auth / Data Initialization Handshake
function setupAuthListener() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        document.getElementById('sidebar-user').innerText = user.email || 'Logged In';
        fetchTrucks();
        fetchRepairs();
        fetchRevenues();
      } else {
        document.getElementById('sidebar-user').innerText = 'Demo Mode';
        loadDemoData();
      }
    });
  } else {
    console.warn('Firebase SDK not detected. Operating in local mode.');
    loadDemoData();
  }
}

// Fallback Demo Data
function loadDemoData() {
  trucks = [
    { id: '1', plate: 'TX-8921', model: 'Volvo FH16', year: 2021, ownerPhone: '+1 555-0192', driverPhone: '+1 555-0144' },
    { id: '2', plate: 'KA-04-MN-3001', model: 'Scania R500', year: 2023, ownerPhone: '+91 98765-43210', driverPhone: '+91 98765-12345' }
  ];
  repairs = [
    { id: 'r1', truckId: '1', date: '2026-08-05', description: 'Oil & Filter Change', materials: 'Synthetic 15W-40 Oil 10L, Oil Filter element', cost: 350.00, status: 'completed', photoUrl: '' },
    { id: 'r2', truckId: '1', date: '2026-08-15', description: 'Front Brake Replacement', materials: '2x Heavy Duty Brake Pads, 1x Front Rotor', cost: 1200.00, status: 'completed', photoUrl: '' },
    { id: 'r3', truckId: '2', date: '2026-08-20', description: 'Transmission Diagnostic', materials: 'Sensor wiring kit, Transmission Fluid', cost: 450.00, status: 'in-progress', photoUrl: '' }
  ];
  revenues = [
    { id: 'rev1', date: '2026-08-05', amount: 1800.00, truckId: '1', notes: 'Interstate Cargo Route' },
    { id: 'rev2', date: '2026-08-15', amount: 950.00, truckId: '1', notes: 'Local Logistics Hub' },
    { id: 'rev3', date: '2026-08-20', amount: 2400.00, truckId: '2', notes: 'Heavy Equipment Transport' },
    { id: 'rev4', date: '2026-08-22', amount: 1500.00, truckId: '2', notes: 'Port Container Dispatch' }
  ];
  renderTrucks(trucks);
  renderCalendar();
  populateTruckDropdowns();
}

// Fetch Data from Firestore
function fetchTrucks() {
  if (typeof db === 'undefined') return;
  db.collection('trucks').onSnapshot((snapshot) => {
    trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTrucks(trucks);
    populateTruckDropdowns();
  }, () => loadDemoData());
}

function fetchRepairs() {
  if (typeof db === 'undefined') return;
  db.collection('repairs').onSnapshot((snapshot) => {
    repairs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (activeTruckId) fetchRepairsForTruck(activeTruckId);
    renderCalendar();
  });
}

function fetchRevenues() {
  if (typeof db === 'undefined') return;
  db.collection('revenues').onSnapshot((snapshot) => {
    revenues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCalendar();
  });
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

// Fetch Repair History for Selected Vehicle
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
          <div class="job-total">$${parseFloat(item.cost).toFixed(2)}</div>
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

// Modal Toggle Controllers
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

// Handlers for Truck CRUD
function handleAddTruck(e) {
  e.preventDefault();
  const id = document.getElementById('truck-edit-id').value;
  const plate = document.getElementById('truck-plate').value.trim();
  const model = document.getElementById('truck-model').value.trim();
  const year = document.getElementById('truck-year').value.trim();
  const ownerPhone = document.getElementById('truck-owner-phone').value.trim();
  const driverPhone = document.getElementById('truck-driver-phone').value.trim();

  const data = { plate, model, year, ownerPhone, driverPhone };

  if (id) {
    if (typeof db !== 'undefined') {
      db.collection('trucks').doc(id).update(data);
    } else {
      const idx = trucks.findIndex(t => t.id === id);
      if (idx !== -1) trucks[idx] = { id, ...data };
    }
    showToast('Truck profile updated!', 'success');
  } else {
    const newId = Date.now().toString();
    if (typeof db !== 'undefined') {
      db.collection('trucks').add({ id: newId, ...data });
    } else {
      trucks.push({ id: newId, ...data });
    }
    showToast('Truck added successfully!', 'success');
  }
  
  renderTrucks(trucks);
  populateTruckDropdowns();
  closeModal('modal-add-truck');
  if (activeTruckId) openTruckDetail(activeTruckId);
}

function deleteTruck(truckId) {
  if (!confirm('Are you sure you want to delete this truck and its history?')) return;
  if (typeof db !== 'undefined') {
    db.collection('trucks').doc(truckId).delete();
  } else {
    trucks = trucks.filter(t => t.id !== truckId);
    repairs = repairs.filter(r => r.truckId !== truckId);
  }
  renderTrucks(trucks);
  populateTruckDropdowns();
  if (activeTruckId === truckId) switchView('fleet');
  showToast('Truck deleted.', 'error');
}

// Handlers for Repair CRUD with Image File Converter
function handleAddRepair(e) {
  e.preventDefault();
  const id = document.getElementById('repair-edit-id').value;
  const date = document.getElementById('repair-date').value;
  const description = document.getElementById('repair-desc').value.trim();
  const materials = document.getElementById('repair-materials').value.trim();
  const cost = parseFloat(document.getElementById('repair-cost').value);
  const status = document.getElementById('repair-status').value;
  const fileInput = document.getElementById('repair-photo');

  const saveRepairData = (photoBase64 = '') => {
    const repData = {
      truckId: activeTruckId,
      date,
      description,
      materials,
      cost,
      status
    };
    if (photoBase64) repData.photoUrl = photoBase64;

    if (id) {
      if (typeof db !== 'undefined') {
        db.collection('repairs').doc(id).update(repData);
      } else {
        const idx = repairs.findIndex(r => r.id === id);
        if (idx !== -1) repairs[idx] = { ...repairs[idx], ...repData };
      }
      showToast('Repair job updated!', 'success');
    } else {
      const newId = Date.now().toString();
      if (typeof db !== 'undefined') {
        db.collection('repairs').add({ id: newId, ...repData });
      } else {
        repairs.push({ id: newId, photoUrl: photoBase64, ...repData });
      }
      showToast('Repair job logged!', 'success');
    }

    fetchRepairsForTruck(activeTruckId);
    renderCalendar();
    closeModal('modal-add-repair');
  };

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      saveRepairData(evt.target.result);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    const existing = repairs.find(r => r.id === id);
    saveRepairData(existing ? existing.photoUrl : '');
  }
}

function deleteRepair(repairId) {
  if (!confirm('Are you sure you want to delete this repair record?')) return;
  if (typeof db !== 'undefined') {
    db.collection('repairs').doc(repairId).delete();
  } else {
    repairs = repairs.filter(r => r.id !== repairId);
  }
  fetchRepairsForTruck(activeTruckId);
  renderCalendar();
  showToast('Repair entry deleted.', 'error');
}

// Handlers for Revenue CRUD
function handleAddRevenue(e) {
  e.preventDefault();
  const id = document.getElementById('revenue-edit-id').value;
  const date = document.getElementById('revenue-date').value;
  const amount = parseFloat(document.getElementById('revenue-amount').value);
  const truckId = document.getElementById('revenue-truck').value;
  const notes = document.getElementById('revenue-notes').value.trim();

  const revData = { date, amount, truckId, notes };

  if (id) {
    if (typeof db !== 'undefined') {
      db.collection('revenues').doc(id).update(revData);
    } else {
      const idx = revenues.findIndex(r => r.id === id);
      if (idx !== -1) revenues[idx] = { id, ...revData };
    }
    showToast('Revenue record updated!', 'success');
  } else {
    const newId = Date.now().toString();
    if (typeof db !== 'undefined') {
      db.collection('revenues').add({ id: newId, ...revData });
    } else {
      revenues.push({ id: newId, ...revData });
    }
    showToast('Revenue logged!', 'success');
  }

  renderCalendar();
  closeModal('modal-add-revenue');
}

function deleteRevenue(revenueId) {
  if (!confirm('Delete this revenue entry?')) return;
  if (typeof db !== 'undefined') {
    db.collection('revenues').doc(revenueId).delete();
  } else {
    revenues = revenues.filter(r => r.id !== revenueId);
  }
  renderCalendar();
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
        ${dayRevTotal > 0 ? `<div class="day-stat rev">+${dayRevTotal.toFixed(0)}</div>` : ''}
        ${dayExpTotal > 0 ? `<div class="day-stat exp">-${dayExpTotal.toFixed(0)}</div>` : ''}
        ${(dayRevTotal > 0 || dayExpTotal > 0) ? `
          <div class="day-stat net ${dayNet >= 0 ? 'text-green' : 'text-red'}">
            ${dayNet >= 0 ? '+' : ''}${dayNet.toFixed(0)}
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(cell);
  }

  // Update Summary Banners
  const netPnL = mTotalRevenue - mTotalExpenses;
  document.getElementById('month-total-revenue').innerText = `$${mTotalRevenue.toFixed(2)}`;
  document.getElementById('month-total-expenses').innerText = `$${mTotalExpenses.toFixed(2)}`;
  
  const netElem = document.getElementById('month-net-pnl');
  netElem.innerText = `${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}`;
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

// Logout Placeholder
function handleLogout() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut().then(() => location.reload());
  } else {
    showToast('Signed out demo mode.', 'success');
  }
}
