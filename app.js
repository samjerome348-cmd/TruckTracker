// Application State
let trucks = [];
let repairs = [];
let activeTruckId = null;

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
      } else {
        // Fallback demo data if unauthenticated to avoid infinite buffering
        document.getElementById('sidebar-user').innerText = 'Demo Mode';
        loadDemoData();
      }
    });
  } else {
    // If Firebase configuration is missing or local
    console.warn('Firebase SDK not detected. Operating in local mode.');
    loadDemoData();
  }
}

// Fallback Data Loader (Prevents Infinite Spinners)
function loadDemoData() {
  trucks = [
    { id: '1', plate: 'TX-8921', model: 'Volvo FH16', year: 2021 },
    { id: '2', plate: 'KA-04-MN-3001', model: 'Scania R500', year: 2023 }
  ];
  repairs = [
    { id: 'r1', truckId: '1', date: '2026-03-15', description: 'Oil & Filter Change', cost: 350.00, status: 'completed' },
    { id: 'r2', truckId: '1', date: '2026-04-10', description: 'Front Brake Replacement', cost: 1200.00, status: 'completed' },
    { id: 'r3', truckId: '2', date: '2026-05-02', description: 'Transmission Diagnostic', cost: 450.00, status: 'in-progress' }
  ];
  renderTrucks(trucks);
}

// Fetch Trucks from Firestore
function fetchTrucks() {
  if (typeof db === 'undefined') return loadDemoData();

  db.collection('trucks').onSnapshot((snapshot) => {
    trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTrucks(trucks);
  }, (error) => {
    console.error("Firestore error:", error);
    showToast("Failed to load trucks from database", "error");
    loadDemoData();
  });
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
    <div class="truck-card" onclick="openTruckDetail('${truck.id}')">
      <span class="plate">${truck.plate}</span>
      <div class="meta">
        <strong>Model:</strong> ${truck.model || 'N/A'}<br>
        <strong>Year:</strong> ${truck.year || 'N/A'}
      </div>
    </div>
  `).join('');
}

// Filter Trucks Search
function filterTrucks() {
  const query = document.getElementById('search-plate').value.toLowerCase();
  const filtered = trucks.filter(t => t.plate.toLowerCase().includes(query) || (t.model && t.model.toLowerCase().includes(query)));
  renderTrucks(filtered);
}

// View Switching Logic
function switchView(viewName) {
  document.getElementById('view-fleet').classList.add('hidden');
  document.getElementById('view-truck-detail').classList.add('hidden');
  document.getElementById('view-analytics').classList.add('hidden');

  document.getElementById('nav-fleet').classList.remove('active');
  document.getElementById('nav-analytics').classList.remove('active');

  if (viewName === 'fleet') {
    document.getElementById('view-fleet').classList.remove('hidden');
    document.getElementById('nav-fleet').classList.add('active');
  } else if (viewName === 'analytics') {
    document.getElementById('view-analytics').classList.remove('hidden');
    document.getElementById('nav-analytics').classList.add('active');
  } else if (viewName === 'detail') {
    document.getElementById('view-truck-detail').classList.remove('hidden');
  }
}

// Truck Detail & Repairs Tree View
function openTruckDetail(truckId) {
  activeTruckId = truckId;
  const truck = trucks.find(t => t.id === truckId);
  if (!truck) return;

  document.getElementById('detail-plate').innerText = truck.plate;
  document.getElementById('detail-meta').innerHTML = `Model: ${truck.model || 'N/A'} | Year: ${truck.year || 'N/A'}`;

  fetchRepairsForTruck(truckId);
  switchView('detail');
}

// Fetch Repair History
function fetchRepairsForTruck(truckId) {
  if (typeof db !== 'undefined') {
    db.collection('repairs').where('truckId', '==', truckId).get()
      .then((snapshot) => {
        const truckRepairs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRepairsTree(truckRepairs);
      })
      .catch((err) => {
        console.error(err);
        const filtered = repairs.filter(r => r.truckId === truckId);
        renderRepairsTree(filtered);
      });
  } else {
    const filtered = repairs.filter(r => r.truckId === truckId);
    renderRepairsTree(filtered);
  }
}

// Group Repairs by Year & Month
function renderRepairsTree(repairList) {
  const container = document.getElementById('repairs-tree-container');
  if (!container) return;

  if (repairList.length === 0) {
    container.innerHTML = `<div class="empty-state">No repair records logged for this vehicle.</div>`;
    return;
  }

  // Sort by date descending
  repairList.sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = repairList.map(item => `
    <div class="job-row">
      <div class="job-row-head">
        <div>
          <strong>${item.description}</strong>
          <div class="meta-info">${item.date}</div>
        </div>
        <div class="job-total">$${parseFloat(item.cost).toFixed(2)}</div>
      </div>
      <div>
        <span class="badge badge-${item.status}">${item.status}</span>
      </div>
    </div>
  `).join('');
}

// Modal Toggle Controllers
function openAddTruckModal() { document.getElementById('modal-add-truck').classList.remove('hidden'); }
function openAddRepairModal() { document.getElementById('modal-add-repair').classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

// Handlers for Add Form Actions
function handleAddTruck(e) {
  e.preventDefault();
  const plate = document.getElementById('truck-plate').value.trim();
  const model = document.getElementById('truck-model').value.trim();
  const year = document.getElementById('truck-year').value.trim();

  const newTruck = { id: Date.now().toString(), plate, model, year };

  if (typeof db !== 'undefined') {
    db.collection('trucks').add(newTruck).then(() => {
      closeModal('modal-add-truck');
      showToast('Truck added successfully!', 'success');
    });
  } else {
    trucks.push(newTruck);
    renderTrucks(trucks);
    closeModal('modal-add-truck');
    showToast('Truck added to local view!', 'success');
  }
}

function handleAddRepair(e) {
  e.preventDefault();
  const date = document.getElementById('repair-date').value;
  const description = document.getElementById('repair-desc').value.trim();
  const cost = parseFloat(document.getElementById('repair-cost').value);
  const status = document.getElementById('repair-status').value;

  const newRepair = { id: Date.now().toString(), truckId: activeTruckId, date, description, cost, status };

  if (typeof db !== 'undefined') {
    db.collection('repairs').add(newRepair).then(() => {
      closeModal('modal-add-repair');
      fetchRepairsForTruck(activeTruckId);
      showToast('Repair job logged!', 'success');
    });
  } else {
    repairs.push(newRepair);
    fetchRepairsForTruck(activeTruckId);
    closeModal('modal-add-repair');
    showToast('Repair job logged locally!', 'success');
  }
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
