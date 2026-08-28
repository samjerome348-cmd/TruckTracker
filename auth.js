// Application State
let trucks = [];
let repairs = [];
let revenues = [];
let activeTruckId = null;
let calDate = new Date();

function formatRupees(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
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

// Supabase Authentication Handling
function initSupabaseAuthListener() {
  if (typeof supabaseClient === 'undefined') {
    alert('Supabase client not loaded. Please check supabase-config.js');
    return;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('app-layout').classList.remove('hidden');
      document.getElementById('sidebar-user').innerText = session.user.email;
      loadSupabaseData();
    } else {
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('app-layout').classList.add('hidden');
    }
  });
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorDiv = document.getElementById('auth-error');
  errorDiv.innerText = '';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) errorDiv.innerText = error.message;
}

async function handleSignUp() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorDiv = document.getElementById('auth-error');
  errorDiv.innerText = '';

  if (!email || !password) {
    errorDiv.innerText = 'Please enter an email and password to sign up.';
    return;
  }

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    errorDiv.innerText = error.message;
  } else {
    showToast('Account created! If confirmation is required, check your email.', 'success');
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// Fetch Real Data from Supabase
async function loadSupabaseData() {
  await Promise.all([fetchTrucks(), fetchRepairs(), fetchRevenues()]);
}

async function fetchTrucks() {
  const { data, error } = await supabaseClient.from('trucks').select('*').order('created_at', { ascending: false });
  if (error) {
    showToast('Error fetching trucks: ' + error.message, 'error');
    return;
  }
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

async function fetchRepairs() {
  const { data, error } = await supabaseClient.from('repairs').select('*').order('date', { ascending: false });
  if (error) {
    showToast('Error fetching repairs: ' + error.message, 'error');
    return;
  }
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

async function fetchRevenues() {
  const { data, error } = await supabaseClient.from('revenues').select('*').order('date', { ascending: false });
  if (error) {
    showToast('Error fetching revenues: ' + error.message, 'error');
    return;
  }
  revenues = data.map(r => ({
    id: r.id,
    date: r.date,
    amount: parseFloat(r.amount),
    truckId: r.truck_id,
    notes: r.notes
  }));
  renderCalendar();
}

function populateTruckDropdowns() {
  const select = document.getElementById('revenue-truck');
  if (!select) return;
  select.innerHTML = `<option value="">-- All Fleet / General --</option>` + 
    trucks.map(t => `<option value="${t.id}">${t.plate} (${t.model || 'Truck'})</option>`).join('');
}

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
  const query = document.getElementById('search-plate').value.toLowerCase();
  const filtered = trucks.filter(t => 
    t.plate.toLowerCase().includes(query) || 
    (t.model && t.model.toLowerCase().includes(query)) ||
    (t.ownerPhone && t.ownerPhone.toLowerCase().includes(query)) ||
    (t.driverPhone && t.driverPhone.toLowerCase().includes(query))
  );
  renderTrucks(filtered);
}

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
  const deleteBtn = document.getElementById('btn-delete-revenue');

  if (revenueId) {
    const rev = revenues.find(r => r.id === revenueId);
    if (rev) {
      title.innerText = "Edit / Delete Revenue Entry";
      editId.value = rev.id;
      document.getElementById('revenue-date').value = rev.date;
      document.getElementById('revenue-amount').value = rev.amount;
      document.getElementById('revenue-truck').value = rev.truckId || '';
      document.getElementById('revenue-notes').value = rev.notes || '';
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    }
  } else {
    title.innerText = "Log Daily Revenue";
    editId.value = "";
    document.getElementById('form-add-revenue').reset();
    document.getElementById('revenue-date').value = dateStr || new Date().toISOString().split('T')[0];
    if (deleteBtn) deleteBtn.classList.add('hidden');
  }
  modal.classList.remove('hidden');
}

function handleDeleteRevenueFromModal() {
  const id = document.getElementById('revenue-edit-id').value;
  if (id) {
    deleteRevenue(id);
    closeModal('modal-add-revenue');
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function openPhotoModal(src) {
  document.getElementById('modal-photo-img').src = src;
  document.getElementById('modal-photo').classList.remove('hidden');
}

async function handleAddTruck(e) {
  e.preventDefault();
  const id = document.getElementById('truck-edit-id').value || crypto.randomUUID();
  const payload = {
    id,
    plate: document.getElementById('truck-plate').value.trim(),
    model: document.getElementById('truck-model').value.trim() || null,
    year: document.getElementById('truck-year').value ? parseInt(document.getElementById('truck-year').value) : null,
    owner_phone: document.getElementById('truck-owner-phone').value.trim() || null,
    driver_phone: document.getElementById('truck-driver-phone').value.trim() || null
  };

  const { error } = await supabaseClient.from('trucks').upsert([payload]);
  if (error) {
    showToast('Failed to save truck: ' + error.message, 'error');
    return;
  }
  await fetchTrucks();
  showToast('Truck saved to database!', 'success');
  closeModal('modal-add-truck');
  if (activeTruckId === id) openTruckDetail(activeTruckId);
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
  showToast('Truck deleted.', 'error');
}

async function handleAddRepair(e) {
  e.preventDefault();
  const id = document.getElementById('repair-edit-id').value || crypto.randomUUID();
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

    const { error } = await supabaseClient.from('repairs').upsert([payload]);
    if (error) {
      showToast('Failed to save repair: ' + error.message, 'error');
      return;
    }
    await fetchRepairs();
    showToast('Repair job saved to database!', 'success');
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
  if (!confirm('Delete this repair record from database?')) return;
  const { error } = await supabaseClient.from('repairs').delete().eq('id', repairId);
  if (error) {
    showToast('Failed to delete repair: ' + error.message, 'error');
    return;
  }
  await fetchRepairs();
  showToast('Repair entry deleted.', 'error');
}

async function handleAddRevenue(e) {
  e.preventDefault();
  const id = document.getElementById('revenue-edit-id').value || crypto.randomUUID();
  const date = document.getElementById('revenue-date').value;
  const amount = parseFloat(document.getElementById('revenue-amount').value);
  const truckId = document.getElementById('revenue-truck').value || null;
  const notes = document.getElementById('revenue-notes').value.trim() || null;

  const payload = { id, date, amount, truck_id: truckId, notes };

  const { error } = await supabaseClient.from('revenues').upsert([payload]);
  if (error) {
    showToast('Failed to save revenue: ' + error.message, 'error');
    return;
  }
  await fetchRevenues();
  showToast('Revenue updated in database!', 'success');
  closeModal('modal-add-revenue');
}

async function deleteRevenue(revenueId) {
  if (!confirm('Delete this revenue entry from Supabase?')) return;
  const { error } = await supabaseClient.from('revenues').delete().eq('id', revenueId);
  if (error) {
    showToast('Failed to delete revenue: ' + error.message, 'error');
    return;
  }
  await fetchRevenues();
  showToast('Revenue deleted.', 'error');
}

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
  document.getElementById('month-total-revenue').innerText = formatRupees(mTotalRevenue);
  document.getElementById('month-total-expenses').innerText = formatRupees(mTotalExpenses);
  
  const netElem = document.getElementById('month-net-pnl');
  netElem.innerText = `${netPnL >= 0 ? '+' : '-'}${formatRupees(Math.abs(netPnL))}`;
  netElem.className = `val ${netPnL >= 0 ? 'text-green' : 'text-red'}`;
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
