/* ═══════════════════════════════════════════════════════════════
   BarberPro — app.js
   Sistema completo: auth, turnos, barberos, servicios, contabilidad
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────────────────
// ESTADO GLOBAL (persiste en localStorage)
// ──────────────────────────────────────────────────────────────
const DB_KEY = 'barberpro_db';

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}

// Base de datos inicial (demo)
const defaultDB = {
  users: [
    { user: 'admin',    pass: 'admin123', role: 'admin',  name: 'Administrador' },
    { user: 'lucas',    pass: 'barber1',  role: 'barber', name: 'Lucas Gómez',    barberUser: 'lucas' },
    { user: 'martin',   pass: 'barber2',  role: 'barber', name: 'Martín Ruiz',    barberUser: 'martin' },
    { user: 'cliente1', pass: '1234',     role: 'client', name: 'Carlos Pérez',   phone: '91112345678' },
  ],
  barbers: [
    {
      user: 'lucas',
      name: 'Lucas Gómez',
      ig: '@lucasgomez_barber',
      especialidad: 'Fade y degradados',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      works: [
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
        'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80',
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80',
      ],
      days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      active: true,
    },
    {
      user: 'martin',
      name: 'Martín Ruiz',
      ig: '@martin_cuts',
      especialidad: 'Cortes clásicos y barba',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
      works: [
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80',
        'https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=400&q=80',
      ],
      days: ['Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      active: true,
    },
  ],
  services: [
    { id: 's1', name: 'Corte clásico',   price: 3500, pct: 50 },
    { id: 's2', name: 'Corte + barba',   price: 5000, pct: 50 },
    { id: 's3', name: 'Fade completo',   price: 4500, pct: 55 },
    { id: 's4', name: 'Cejas',           price: 1500, pct: 40 },
  ],
  turnos: [
    {
      id: 't1',
      fecha: todayStr(),
      hora: '10:00',
      clienteNombre: 'Carlos Pérez',
      clienteTel: '91112345678',
      barberUser: 'lucas',
      barberName: 'Lucas Gómez',
      serviceId: 's1',
      serviceName: 'Corte clásico',
      price: 3500,
      pct: 50,
      estado: 'completado',
    },
    {
      id: 't2',
      fecha: todayStr(),
      hora: '11:30',
      clienteNombre: 'Mario López',
      clienteTel: '91187654321',
      barberUser: 'martin',
      barberName: 'Martín Ruiz',
      serviceId: 's2',
      serviceName: 'Corte + barba',
      price: 5000,
      pct: 50,
      estado: 'pendiente',
    },
  ],
};

// Cargamos o inicializamos la DB
let DB = loadDB() || JSON.parse(JSON.stringify(defaultDB));

// Sesión activa
let currentUser = null;  // { user, role, name, barberUser? }

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('es-AR');
}

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ──────────────────────────────────────────────────────────────
// NAVEGACIÓN DE PANTALLAS
// ──────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  // Renderizados al mostrar pantalla
  if (id === 'screen-admin')       renderAdminAll();
  if (id === 'screen-barber')      renderBarberPanel();
  if (id === 'screen-client-home') renderClientHome();
  if (id === 'screen-home')        renderBarbersStrip();
}

// ──────────────────────────────────────────────────────────────
// AUTENTICACIÓN
// ──────────────────────────────────────────────────────────────
function getBarbersData() {
  return DB.barbers;
}

function isLoggedIn() {
  return currentUser !== null;
}

function loginUnified(user, pass) {
  const found = DB.users.find(u => u.user === user && u.pass === pass);
  if (!found) return false;

  currentUser = { ...found };

  if (found.role === 'admin') {
    showScreen('screen-admin');
  } else if (found.role === 'barber') {
    showScreen('screen-barber');
  } else {
    showScreen('screen-client-home');
  }
  showToast('👋 Bienvenido, ' + found.name, 'success');
  return true;
}

function logout() {
  currentUser = null;
  showScreen('screen-home');
  showToast('Sesión cerrada');
}

// Registro de cliente
function registerClient() {
  const name     = document.getElementById('reg-name').value.trim();
  const lastname = document.getElementById('reg-lastname').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  const user     = document.getElementById('reg-user').value.trim();
  const pass     = document.getElementById('reg-pass').value;
  const errEl    = document.getElementById('reg-error');

  errEl.classList.add('hidden');

  if (!name || !lastname || !phone || !user || !pass) {
    errEl.textContent = 'Completá todos los campos';
    errEl.classList.remove('hidden');
    return;
  }
  if (DB.users.find(u => u.user === user)) {
    errEl.textContent = 'Ese usuario ya está en uso';
    errEl.classList.remove('hidden');
    return;
  }

  const newUser = {
    user, pass,
    role: 'client',
    name: name + ' ' + lastname,
    phone,
  };
  DB.users.push(newUser);
  saveDB();

  currentUser = { ...newUser };
  showToast('✅ Cuenta creada con éxito', 'success');
  showScreen('screen-client-home');
}

// ──────────────────────────────────────────────────────────────
// NAVEGACIÓN INTERNA — ADMIN
// ──────────────────────────────────────────────────────────────
function adminNav(btn) {
  const panelId = btn.getAttribute('data-panel');
  document.querySelectorAll('#screen-admin .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#screen-admin .admin-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}

// ──────────────────────────────────────────────────────────────
// NAVEGACIÓN INTERNA — BARBERO
// ──────────────────────────────────────────────────────────────
function barberNav(btn) {
  const panelId = btn.getAttribute('data-panel');
  document.querySelectorAll('#screen-barber .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#screen-barber .admin-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}

// ──────────────────────────────────────────────────────────────
// MODALES GENÉRICOS
// ──────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function closeModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// ──────────────────────────────────────────────────────────────
// PANEL ADMIN — RENDER COMPLETO
// ──────────────────────────────────────────────────────────────
function renderAdminAll() {
  renderDashboard();
  renderBarbersList();
  renderAllTurnos();
  renderServices();
  renderContabilidad();
}

// Dashboard
function renderDashboard() {
  const today = todayStr();
  const turnosHoy = DB.turnos.filter(t => t.fecha === today);
  const completados = turnosHoy.filter(t => t.estado === 'completado');
  const recaudado = completados.reduce((s, t) => s + t.price, 0);
  const barbActivos = DB.barbers.filter(b => b.active).length;

  setEl('stat-turnos', turnosHoy.length);
  setEl('stat-recaudado', fmtMoney(recaudado));
  setEl('stat-barberos-activos', barbActivos);
  setEl('stat-clientes', DB.users.filter(u => u.role === 'client').length);

  const tbody = document.getElementById('tbody-last-turnos');
  if (!tbody) return;
  const recent = [...DB.turnos].reverse().slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin turnos aún</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(t => `
    <tr>
      <td>${escHtml(t.clienteNombre)}</td>
      <td>${escHtml(t.barberName)}</td>
      <td>${escHtml(t.serviceName)}</td>
      <td>${fmtMoney(t.price)}</td>
      <td><span class="badge badge-${t.estado}">${t.estado}</span></td>
    </tr>
  `).join('');
}

// Lista de barberos
function renderBarbersList() {
  const el = document.getElementById('barbers-list');
  if (!el) return;
  if (!DB.barbers.length) {
    el.innerHTML = '<p style="color:var(--gray-light);margin-top:1rem">No hay barberos registrados.</p>';
    return;
  }
  el.innerHTML = DB.barbers.map(b => `
    <div class="barber-row">
      <div class="barber-row-avatar">
        ${b.avatar ? `<img src="${b.avatar}" alt="${b.name}" />` : '✂'}
      </div>
      <div class="barber-row-info">
        <strong>${escHtml(b.name)}</strong>
        <span>${escHtml(b.ig || '')} · ${escHtml(b.especialidad || '')}</span>
        <small>Días: ${(b.days || []).join(', ')}</small>
      </div>
      <div class="barber-row-actions">
        <button class="btn-ghost small" onclick="editBarber('${b.user}')">Editar</button>
        <button class="btn-danger small" onclick="deleteBarber('${b.user}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// Todos los turnos
function renderAllTurnos() {
  const tbody = document.getElementById('tbody-all-turnos');
  if (!tbody) return;
  if (!DB.turnos.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Sin turnos registrados</td></tr>';
    return;
  }
  tbody.innerHTML = [...DB.turnos].reverse().map(t => `
    <tr>
      <td>${t.fecha}</td>
      <td>${t.hora}</td>
      <td>${escHtml(t.clienteNombre)}</td>
      <td>${escHtml(t.barberName)}</td>
      <td>${escHtml(t.serviceName)}</td>
      <td><span class="badge badge-${t.estado}">${t.estado}</span></td>
      <td>
        ${t.estado === 'pendiente' ? `<button class="btn-ghost small" onclick="completeTurno('${t.id}')">✓ Completar</button>` : ''}
        <button class="btn-danger small" onclick="deleteTurno('${t.id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

// Servicios
function renderServices() {
  const tbody = document.getElementById('tbody-services');
  if (!tbody) return;
  if (!DB.services.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Sin servicios</td></tr>';
    return;
  }
  tbody.innerHTML = DB.services.map(s => `
    <tr>
      <td>${escHtml(s.name)}</td>
      <td>${fmtMoney(s.price)}</td>
      <td>${s.pct}%</td>
      <td>
        <button class="btn-danger small" onclick="deleteService('${s.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// Contabilidad
function renderContabilidad() {
  const completados = DB.turnos.filter(t => t.estado === 'completado');
  const total    = completados.reduce((s, t) => s + t.price, 0);
  const pagBarberos = completados.reduce((s, t) => s + Math.round(t.price * (t.pct / 100)), 0);
  const neto = total - pagBarberos;
  setEl('cont-total',    fmtMoney(total));
  setEl('cont-barberos', fmtMoney(pagBarberos));
  setEl('cont-neto',     fmtMoney(neto));
}

// ──────────────────────────────────────────────────────────────
// ADMIN — ACCIONES
// ──────────────────────────────────────────────────────────────

// Crear barbero
function createBarber() {
  const name = document.getElementById('nb-name').value.trim();
  const user = document.getElementById('nb-user').value.trim().toLowerCase();
  const pass = document.getElementById('nb-pass').value;
  const errEl = document.getElementById('nb-error');
  errEl.classList.add('hidden');

  if (!name || !user || !pass) {
    errEl.textContent = 'Completá todos los campos';
    errEl.classList.remove('hidden');
    return;
  }
  if (DB.users.find(u => u.user === user)) {
    errEl.textContent = 'El usuario ya existe';
    errEl.classList.remove('hidden');
    return;
  }

  DB.users.push({ user, pass, role: 'barber', name, barberUser: user });
  DB.barbers.push({
    user, name, ig: '', especialidad: '',
    avatar: '', works: [], days: [], active: true,
  });
  saveDB();
  closeModals();
  renderBarbersList();
  renderBarbersStrip();
  showToast('✅ Barbero creado', 'success');

  // Limpiar form
  ['nb-name','nb-user','nb-pass'].forEach(id => { document.getElementById(id).value = ''; });
}

// Editar barbero (abre modal reutilizando el de nuevo barbero con datos cargados)
function editBarber(barberUser) {
  const b = DB.barbers.find(x => x.user === barberUser);
  if (!b) return;
  // Simple prompt inline para demo (reemplazable por modal dedicado)
  const newName = prompt('Nombre completo:', b.name);
  if (newName === null) return;
  const newIg   = prompt('Instagram:', b.ig || '');
  const newEsp  = prompt('Especialidad:', b.especialidad || '');

  b.name = newName.trim() || b.name;
  b.ig   = newIg || b.ig;
  b.especialidad = newEsp || b.especialidad;

  // Actualizar también en users
  const u = DB.users.find(x => x.user === barberUser);
  if (u) u.name = b.name;

  saveDB();
  renderBarbersList();
  renderBarbersStrip();
  showToast('✅ Barbero actualizado', 'success');
}

// Eliminar barbero
function deleteBarber(barberUser) {
  if (!confirm('¿Eliminar este barbero? Esta acción no se puede deshacer.')) return;
  DB.barbers = DB.barbers.filter(b => b.user !== barberUser);
  DB.users   = DB.users.filter(u => u.user !== barberUser);
  saveDB();
  renderBarbersList();
  renderBarbersStrip();
  showToast('Barbero eliminado');
}

// Crear servicio
function createService() {
  const name  = document.getElementById('ns-name').value.trim();
  const price = parseInt(document.getElementById('ns-price').value);
  const pct   = parseInt(document.getElementById('ns-pct').value);
  const errEl = document.getElementById('ns-error');
  errEl.classList.add('hidden');

  if (!name || isNaN(price) || isNaN(pct)) {
    errEl.textContent = 'Completá todos los campos';
    errEl.classList.remove('hidden');
    return;
  }

  DB.services.push({ id: uid(), name, price, pct });
  saveDB();
  closeModals();
  renderServices();
  showToast('✅ Servicio guardado', 'success');

  ['ns-name','ns-price','ns-pct'].forEach(id => { document.getElementById(id).value = ''; });
}

// Eliminar servicio
function deleteService(serviceId) {
  if (!confirm('¿Eliminar este servicio?')) return;
  DB.services = DB.services.filter(s => s.id !== serviceId);
  saveDB();
  renderServices();
  showToast('Servicio eliminado');
}

// Completar turno
function completeTurno(turnoId) {
  const t = DB.turnos.find(x => x.id === turnoId);
  if (t) { t.estado = 'completado'; saveDB(); renderAllTurnos(); renderDashboard(); renderContabilidad(); }
}

// Eliminar turno
function deleteTurno(turnoId) {
  if (!confirm('¿Eliminar este turno?')) return;
  DB.turnos = DB.turnos.filter(t => t.id !== turnoId);
  saveDB();
  renderAllTurnos();
  renderDashboard();
  renderContabilidad();
  showToast('Turno eliminado');
}

// ──────────────────────────────────────────────────────────────
// PANEL BARBERO — RENDER Y ACCIONES
// ──────────────────────────────────────────────────────────────
function renderBarberPanel() {
  if (!currentUser || currentUser.role !== 'barber') return;
  const barberUser = currentUser.barberUser || currentUser.user;
  const b = DB.barbers.find(x => x.user === barberUser);
  if (!b) return;

  // Perfil
  setEl('barber-display-name', b.name);
  setEl('barber-display-ig', b.ig || '');
  setVal('bp-name', b.name);
  setVal('bp-ig', b.ig || '');
  setVal('bp-esp', b.especialidad || '');

  const avatar = document.getElementById('barber-avatar-preview');
  if (avatar) avatar.innerHTML = b.avatar ? `<img src="${b.avatar}" alt="${b.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '✂';

  // Días
  document.querySelectorAll('#bp-perfil .days-check input').forEach(cb => {
    cb.checked = (b.days || []).includes(cb.value);
  });

  // Turnos del barbero
  const turnosBarbero = DB.turnos.filter(t => t.barberUser === barberUser);
  const tbody = document.getElementById('tbody-barber-turnos');
  if (tbody) {
    if (!turnosBarbero.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin turnos</td></tr>';
    } else {
      tbody.innerHTML = [...turnosBarbero].reverse().map(t => `
        <tr>
          <td>${t.fecha}</td>
          <td>${t.hora}</td>
          <td>${escHtml(t.clienteNombre)}</td>
          <td>${escHtml(t.serviceName)}</td>
          <td><span class="badge badge-${t.estado}">${t.estado}</span></td>
        </tr>
      `).join('');
    }
  }

  // Trabajos
  const worksGrid = document.getElementById('works-grid');
  if (worksGrid) {
    worksGrid.innerHTML = (b.works || []).map((w, i) => `
      <div class="work-item">
        <img src="${w}" alt="trabajo ${i + 1}" />
        <button class="work-delete" onclick="deleteWork('${barberUser}', ${i})">✕</button>
      </div>
    `).join('');
  }

  // Ganancias
  const completadosBarbero = turnosBarbero.filter(t => t.estado === 'completado');
  const totalGanado = completadosBarbero.reduce((s, t) => s + Math.round(t.price * (t.pct / 100)), 0);
  const today = todayStr();
  const hoyGanado = completadosBarbero
    .filter(t => t.fecha === today)
    .reduce((s, t) => s + Math.round(t.price * (t.pct / 100)), 0);

  setEl('barber-total-ganado', fmtMoney(totalGanado));
  setEl('barber-total-cortes', completadosBarbero.length);
  setEl('barber-hoy-ganado', fmtMoney(hoyGanado));

  const tbodyGan = document.getElementById('tbody-barber-ganancias');
  if (tbodyGan) {
    if (!completadosBarbero.length) {
      tbodyGan.innerHTML = '<tr><td colspan="5" class="empty">Sin cortes registrados aún</td></tr>';
    } else {
      tbodyGan.innerHTML = [...completadosBarbero].reverse().map(t => `
        <tr>
          <td>${escHtml(t.serviceName)}</td>
          <td>${escHtml(t.clienteNombre)}</td>
          <td>${fmtMoney(t.price)}</td>
          <td>${fmtMoney(Math.round(t.price * (t.pct / 100)))}</td>
          <td>${t.fecha}</td>
        </tr>
      `).join('');
    }
  }
}

function saveBarberProfile() {
  if (!currentUser || currentUser.role !== 'barber') return;
  const barberUser = currentUser.barberUser || currentUser.user;
  const b = DB.barbers.find(x => x.user === barberUser);
  if (!b) return;

  b.name = document.getElementById('bp-name').value.trim() || b.name;
  b.ig   = document.getElementById('bp-ig').value.trim();
  b.especialidad = document.getElementById('bp-esp').value.trim();

  const days = [];
  document.querySelectorAll('#bp-perfil .days-check input:checked').forEach(cb => days.push(cb.value));
  b.days = days;

  const u = DB.users.find(x => x.user === barberUser);
  if (u) u.name = b.name;
  currentUser.name = b.name;

  saveDB();
  setEl('barber-display-name', b.name);
  setEl('barber-display-ig', b.ig);
  renderBarbersStrip();
  showToast('✅ Perfil guardado', 'success');
}

function previewWork(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('La imagen supera los 5MB', 'error'); return; }

  if (!currentUser || currentUser.role !== 'barber') return;
  const barberUser = currentUser.barberUser || currentUser.user;
  const b = DB.barbers.find(x => x.user === barberUser);
  if (!b) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    b.works = b.works || [];
    b.works.push(e.target.result);
    saveDB();
    renderBarberPanel();
    showToast('📸 Trabajo subido', 'success');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function deleteWork(barberUser, index) {
  const b = DB.barbers.find(x => x.user === barberUser);
  if (!b) return;
  b.works.splice(index, 1);
  saveDB();
  renderBarberPanel();
  showToast('Foto eliminada');
}

// ──────────────────────────────────────────────────────────────
// PANEL CLIENTE — RESERVA DE TURNOS
// ──────────────────────────────────────────────────────────────
let booking = {
  barberUser: null,
  barberName: null,
  serviceId: null,
  serviceName: null,
  price: null,
  pct: null,
  fecha: null,
  hora: null,
};

function renderClientHome() {
  renderBarberCards();
  // Fecha mínima = hoy
  const fechaInput = document.getElementById('client-fecha');
  if (fechaInput) fechaInput.min = todayStr();
}

function renderBarberCards() {
  const el = document.getElementById('barber-cards');
  if (!el) return;
  const barbers = DB.barbers.filter(b => b.active);
  if (!barbers.length) {
    el.innerHTML = '<p style="color:var(--gray-light)">No hay barberos disponibles.</p>';
    return;
  }
  el.innerHTML = barbers.map(b => `
    <div class="barber-card-big ${booking.barberUser === b.user ? 'selected' : ''}" onclick="selectBarber('${b.user}')">
      <div class="bcb-img">
        ${b.avatar ? `<img src="${b.avatar}" alt="${b.name}" />` : '<div class="bcb-placeholder">✂</div>'}
      </div>
      <div class="bcb-works">
        ${(b.works || []).slice(0, 2).map(w => `<img src="${w}" alt="trabajo" />`).join('') || '<div class="bcb-no-works">Sin fotos aún</div>'}
      </div>
      <div class="bcb-info">
        <strong>${escHtml(b.name)}</strong>
        <span>${escHtml(b.ig || '')}</span>
        <small>${escHtml(b.especialidad || '')}</small>
        <small>Trabaja: ${(b.days || []).join(', ')}</small>
      </div>
    </div>
  `).join('');
}

function selectBarber(barberUser) {
  const b = DB.barbers.find(x => x.user === barberUser);
  if (!b) return;
  booking.barberUser = b.user;
  booking.barberName = b.name;

  // Actualizar cards
  document.querySelectorAll('.barber-card-big').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  // Avanzar al paso de servicio
  goStep('step-barber', 'step-service');
  renderServiceList();
}

function preselectBarber(barberUser) {
  // Llamado desde el modal de la landing
  booking.barberUser = barberUser;
  const b = DB.barbers.find(x => x.user === barberUser);
  if (b) booking.barberName = b.name;
  renderBarberCards();
  goStep('step-barber', 'step-service');
  renderServiceList();
}

function renderServiceList() {
  const el = document.getElementById('service-list');
  if (!el) return;
  if (!DB.services.length) {
    el.innerHTML = '<p style="color:var(--gray-light)">No hay servicios configurados.</p>';
    return;
  }
  el.innerHTML = DB.services.map(s => `
    <div class="service-item ${booking.serviceId === s.id ? 'selected' : ''}" onclick="selectService('${s.id}')">
      <div class="service-item-info">
        <strong>${escHtml(s.name)}</strong>
      </div>
      <div class="service-item-price">${fmtMoney(s.price)}</div>
    </div>
  `).join('');
}

function selectService(serviceId) {
  const s = DB.services.find(x => x.id === serviceId);
  if (!s) return;
  booking.serviceId   = s.id;
  booking.serviceName = s.name;
  booking.price       = s.price;
  booking.pct         = s.pct;

  document.querySelectorAll('.service-item').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  goStep('step-service', 'step-datetime');
}

function goToStepData() {
  const fecha = document.getElementById('client-fecha').value;
  const hora  = document.getElementById('client-hora').value;

  if (!fecha || !hora) {
    showToast('Elegí fecha y hora', 'error');
    return;
  }

  // Validar que no sea pasado
  const chosen = new Date(fecha + 'T' + hora);
  if (chosen < new Date()) {
    showToast('Elegí una fecha y hora futura', 'error');
    return;
  }

  booking.fecha = fecha;
  booking.hora  = hora;

  // Pre-rellenar datos si está logueado
  if (currentUser) {
    setVal('client-nombre', currentUser.name || '');
    setVal('client-tel',    currentUser.phone || '');
  }

  goStep('step-datetime', 'step-datos');
}

function confirmarTurno() {
  const nombre = document.getElementById('client-nombre').value.trim();
  const tel    = document.getElementById('client-tel').value.trim();

  if (!nombre || !tel) {
    showToast('Completá tu nombre y teléfono', 'error');
    return;
  }

  const turno = {
    id: uid(),
    fecha: booking.fecha,
    hora: booking.hora,
    clienteNombre: nombre,
    clienteTel: tel,
    barberUser: booking.barberUser,
    barberName: booking.barberName,
    serviceId: booking.serviceId,
    serviceName: booking.serviceName,
    price: booking.price,
    pct: booking.pct,
    estado: 'pendiente',
  };

  DB.turnos.push(turno);
  saveDB();

  // Mostrar confirmación
  const detailEl = document.getElementById('confirm-detail');
  if (detailEl) {
    detailEl.innerHTML = `
      <p><strong>Barbero:</strong> ${escHtml(turno.barberName)}</p>
      <p><strong>Servicio:</strong> ${escHtml(turno.serviceName)}</p>
      <p><strong>Fecha:</strong> ${turno.fecha} a las ${turno.hora}</p>
      <p><strong>Precio:</strong> ${fmtMoney(turno.price)}</p>
    `;
  }

  goStep('step-datos', 'step-ok');
  resetBooking();
  showToast('✅ ¡Turno reservado!', 'success');
}

function resetBooking() {
  booking = { barberUser: null, barberName: null, serviceId: null, serviceName: null, price: null, pct: null, fecha: null, hora: null };
}

// Navegación entre pasos del cliente
function goStep(hideId, showId) {
  const hide = document.getElementById(hideId);
  const show = document.getElementById(showId);
  if (hide) hide.classList.add('hidden');
  if (show) show.classList.remove('hidden');
  // Scroll al inicio del contenedor
  const wrap = document.querySelector('.client-wrap');
  if (wrap) wrap.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetStep(showId, hideId) {
  goStep(hideId, showId);
}

// ──────────────────────────────────────────────────────────────
// WHATSAPP (demo — en producción integrar Twilio/WABA)
// ──────────────────────────────────────────────────────────────
function sendWACode() {
  const phone = document.getElementById('reg-phone').value;
  if (!phone) { showToast('Ingresá tu teléfono primero', 'error'); return; }
  // Demo: código siempre 123456
  showToast('📱 Código enviado: 123456 (demo)', 'info');
}

// ──────────────────────────────────────────────────────────────
// STRIP DE BARBEROS — LANDING
// ──────────────────────────────────────────────────────────────
function renderBarbersStrip() {
  const track = document.getElementById('barbers-strip-track');
  if (!track) return;
  const barbers = DB.barbers;
  if (!barbers.length) {
    track.innerHTML = '<p style="color:var(--gray);font-size:0.8rem">No hay barberos registrados aún.</p>';
    return;
  }
  track.innerHTML = barbers.map(b => `
    <div class="strip-barber-card" onclick="openBarberModal('${b.user}')">
      <div class="strip-barber-img">
        ${b.avatar ? `<img src="${b.avatar}" alt="${b.name}" />` : '✂'}
      </div>
      <div class="strip-barber-info">
        <div class="strip-barber-name">${escHtml(b.name)}</div>
        <div class="strip-barber-ig">${escHtml(b.ig || '')}</div>
      </div>
    </div>
  `).join('');
}

// ──────────────────────────────────────────────────────────────
// UTILIDADES DOM
// ──────────────────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────────────────────────
// ESTILOS DINÁMICOS (badges, barber cards, service items)
// ──────────────────────────────────────────────────────────────
function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Badges de estado */
    .badge { display:inline-block; padding:0.2em 0.65em; border-radius:20px; font-size:0.72rem; font-weight:600; text-transform:capitalize; }
    .badge-pendiente   { background:rgba(255,193,7,0.15); color:#ffc107; }
    .badge-completado  { background:rgba(40,167,69,0.15); color:#28a745; }
    .badge-cancelado   { background:rgba(220,53,69,0.15); color:#dc3545; }

    /* Fila barbero admin */
    .barber-row { display:flex; align-items:center; gap:1rem; padding:1rem; border:1px solid var(--border); border-radius:10px; margin-top:0.75rem; background:var(--surface); }
    .barber-row-avatar { width:52px; height:52px; border-radius:50%; overflow:hidden; background:var(--bg); display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; }
    .barber-row-avatar img { width:100%; height:100%; object-fit:cover; }
    .barber-row-info { flex:1; display:flex; flex-direction:column; gap:0.2rem; }
    .barber-row-info strong { color:var(--white); font-size:0.95rem; }
    .barber-row-info span,small { color:var(--gray-light); font-size:0.8rem; }
    .barber-row-actions { display:flex; gap:0.5rem; flex-shrink:0; }

    /* Cards grandes barbero (cliente) */
    .barber-card-big { background:var(--surface); border:2px solid var(--border); border-radius:14px; overflow:hidden; cursor:pointer; transition:border-color 0.2s,transform 0.2s; }
    .barber-card-big:hover { border-color:var(--gold); transform:translateY(-2px); }
    .barber-card-big.selected { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,168,76,0.25); }
    .bcb-img { height:140px; overflow:hidden; background:var(--bg); display:flex; align-items:center; justify-content:center; font-size:3rem; color:var(--gold); }
    .bcb-img img { width:100%; height:100%; object-fit:cover; }
    .bcb-placeholder { font-size:3rem; color:var(--gold); }
    .bcb-works { display:grid; grid-template-columns:1fr 1fr; gap:2px; height:80px; overflow:hidden; }
    .bcb-works img { width:100%; height:100%; object-fit:cover; }
    .bcb-no-works { grid-column:1/-1; display:flex; align-items:center; justify-content:center; color:var(--gray); font-size:0.75rem; }
    .bcb-info { padding:0.85rem; display:flex; flex-direction:column; gap:0.2rem; }
    .bcb-info strong { color:var(--white); font-size:0.95rem; }
    .bcb-info span,small { color:var(--gray-light); font-size:0.78rem; }

    /* Lista de servicios (cliente) */
    .service-list { display:flex; flex-direction:column; gap:0.6rem; margin:1rem 0; }
    .service-item { display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1.1rem; border:2px solid var(--border); border-radius:10px; cursor:pointer; transition:border-color 0.2s; background:var(--surface); }
    .service-item:hover { border-color:var(--gold); }
    .service-item.selected { border-color:var(--gold); background:rgba(201,168,76,0.07); }
    .service-item-info strong { color:var(--white); }
    .service-item-price { color:var(--gold); font-weight:700; font-size:1.05rem; font-family:'DM Mono',monospace; }

    /* Trabajos del barbero */
    .works-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.75rem; margin-top:1.25rem; }
    .work-item { position:relative; border-radius:10px; overflow:hidden; aspect-ratio:1; background:var(--bg); }
    .work-item img { width:100%; height:100%; object-fit:cover; }
    .work-delete { position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.65); border:none; color:#fff; border-radius:50%; width:26px; height:26px; cursor:pointer; font-size:0.7rem; display:flex; align-items:center; justify-content:center; }

    /* Botones pequeños */
    .btn-danger { background:rgba(220,53,69,0.15); color:#f26a74; border:1px solid rgba(220,53,69,0.3); border-radius:6px; padding:0.35em 0.75em; cursor:pointer; font-size:0.8rem; transition:background 0.2s; }
    .btn-danger:hover { background:rgba(220,53,69,0.28); }
    .btn-ghost.small, .btn-danger.small { padding:0.28em 0.65em; font-size:0.76rem; }
    .btn-primary.small { padding:0.28em 0.65em; font-size:0.76rem; }

    /* Toast */
    .toast { position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%); background:var(--surface); color:var(--white); padding:0.75rem 1.5rem; border-radius:30px; font-size:0.9rem; z-index:9999; box-shadow:0 4px 20px rgba(0,0,0,0.4); border:1px solid var(--border); transition:opacity 0.3s; }
    .toast.success { border-color:rgba(40,167,69,0.5); }
    .toast.error   { border-color:rgba(220,53,69,0.5); }

    /* Confirm ok */
    .confirm-ok { text-align:center; padding:2rem 1rem; }
    .confirm-check { width:72px; height:72px; border-radius:50%; background:rgba(40,167,69,0.15); color:#28a745; font-size:2.2rem; display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem; }
    .confirm-ok h2 { color:var(--white); margin-bottom:1rem; }
    .confirm-detail { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:1rem 1.25rem; text-align:left; margin-bottom:1.25rem; }
    .confirm-detail p { color:var(--gray-light); font-size:0.88rem; margin:0.3rem 0; }
    .confirm-detail strong { color:var(--white); }
    .wa-confirm-note { display:flex; align-items:center; gap:0.5rem; justify-content:center; color:var(--gray-light); font-size:0.85rem; margin-bottom:1.5rem; }
  `;
  document.head.appendChild(style);
}

// ──────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectDynamicStyles();
  renderBarbersStrip();
});
