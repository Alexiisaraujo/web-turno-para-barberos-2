/* ========================================
   BARBERÍA GUSTAVO AGUIRRE — script.js
   Lógica completa: Auth, Admin, Barbero, Cliente
   ======================================== */

// ============================================================
// STATE & STORAGE
// ============================================================

const DB_KEY = 'barberia_aguirre_db';

function getDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);

  // Estado inicial por defecto
  const initial = {
    users: [
      {
        id: 'admin',
        username: 'gustavo',
        password: '1234',
        role: 'admin',
        nombre: 'Gustavo Aguirre'
      }
    ],
    barberos: [],   // { id, userId, nombre, instagram, tiktok, bio, foto, horaInicio, horaFin }
    turnos: [],     // { id, clienteId, clienteNombre, barberoId, fecha, hora, estado }
    cortes: [],     // { id, barberoId, clienteNombre, precio, foto, fecha }
  };
  saveDB(initial);
  return initial;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ============================================================
// CURRENT SESSION
// ============================================================

let currentUser = null; // { id, username, role, nombre }

// ============================================================
// SCREENS
// ============================================================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ============================================================
// LOGIN
// ============================================================

function switchLoginTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`.tab-btn[onclick="switchLoginTab('${tab}')"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function login() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');

  if (!username || !password) {
    showError(errEl, 'Completá usuario y contraseña.');
    return;
  }

  const db = getDB();
  const user = db.users.find(u => u.username === username && u.password === password);

  if (!user) {
    showError(errEl, 'Usuario o contraseña incorrectos.');
    return;
  }

  errEl.classList.add('hidden');
  currentUser = user;
  redirectByRole(user);
}

function register() {
  const nombre = document.getElementById('reg-nombre').value.trim();
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const errEl = document.getElementById('reg-error');

  if (!nombre || !username || !password) {
    showError(errEl, 'Completá todos los campos.');
    return;
  }
  if (password.length < 4) {
    showError(errEl, 'La contraseña debe tener al menos 4 caracteres.');
    return;
  }

  const db = getDB();
  if (db.users.find(u => u.username === username)) {
    showError(errEl, 'Ese nombre de usuario ya existe.');
    return;
  }

  const newUser = {
    id: 'u_' + Date.now(),
    username,
    password,
    role: 'cliente',
    nombre
  };
  db.users.push(newUser);
  saveDB(db);

  errEl.classList.add('hidden');
  currentUser = newUser;
  showToast('¡Bienvenido/a, ' + nombre + '!');
  redirectByRole(newUser);
}

function redirectByRole(user) {
  if (user.role === 'admin') {
    initAdmin();
    showScreen('screen-admin');
  } else if (user.role === 'barbero') {
    initBarbero();
    showScreen('screen-barbero');
  } else {
    initCliente();
    showScreen('screen-cliente');
  }
}

function logout() {
  currentUser = null;
  // Limpiar inputs
  ['login-user', 'login-pass', 'reg-nombre', 'reg-user', 'reg-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('reg-error').classList.add('hidden');
  switchLoginTab('login');
  showScreen('screen-login');
}

// ============================================================
// ADMIN
// ============================================================

function initAdmin() {
  adminTab('dashboard');
  renderDashboard();
  renderBarberosAdmin();
  renderTurnosAdmin();
  renderGaleriaAdmin();
  populateFiltrosBarbero();
}

function adminTab(tab) {
  document.querySelectorAll('#screen-admin .nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#screen-admin .panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`#screen-admin .nav-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`admin-${tab}`).classList.add('active');

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'barberos') renderBarberosAdmin();
  if (tab === 'turnos') renderTurnosAdmin();
  if (tab === 'galeria') renderGaleriaAdmin();
}

// --- DASHBOARD ---
function renderDashboard() {
  const db = getDB();
  const turnosCompletos = db.turnos.filter(t => t.estado === 'completado');
  const ingresoTotal = turnosCompletos.reduce((s, t) => s + (t.precio || 0), 0);
  const cortes = db.cortes;
  const clientesUnicos = new Set(db.turnos.map(t => t.clienteId)).size;

  document.getElementById('stat-turnos-total').textContent = db.turnos.length;
  document.getElementById('stat-ingresos').textContent = '$' + ingresoTotal.toLocaleString('es-AR');
  document.getElementById('stat-cortes').textContent = cortes.length;
  document.getElementById('stat-clientes').textContent = clientesUnicos;

  // Ganancias por barbero
  const ganEl = document.getElementById('ganancias-barberos');
  if (db.barberos.length === 0) {
    ganEl.innerHTML = emptyState('No hay barberos registrados.');
    return;
  }
  ganEl.innerHTML = db.barberos.map(b => {
    const total = db.cortes
      .filter(c => c.barberoId === b.id)
      .reduce((s, c) => s + (parseFloat(c.precio) || 0), 0);
    const cant = db.cortes.filter(c => c.barberoId === b.id).length;
    return `
      <div class="barbero-earning-row">
        <div class="be-avatar">${b.foto ? `<img src="${b.foto}" alt="">` : '✂'}</div>
        <div class="be-info">
          <span class="be-nombre">${b.nombre}</span>
          <span class="be-cortes">${cant} cortes</span>
        </div>
        <div class="be-total">$${total.toLocaleString('es-AR')}</div>
      </div>
    `;
  }).join('');

  // Turnos por día
  const diaEl = document.getElementById('turnos-por-dia');
  const conteo = {};
  db.turnos.forEach(t => {
    conteo[t.fecha] = (conteo[t.fecha] || 0) + 1;
  });
  const dias = Object.entries(conteo).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  if (dias.length === 0) {
    diaEl.innerHTML = emptyState('Sin datos de turnos.');
    return;
  }
  const max = Math.max(...dias.map(d => d[1]));
  diaEl.innerHTML = dias.map(([fecha, cant]) => `
    <div class="dia-row">
      <span class="dia-label">${formatFecha(fecha)}</span>
      <div class="dia-bar-wrap">
        <div class="dia-bar" style="width:${(cant / max * 100)}%"></div>
      </div>
      <span class="dia-count">${cant}</span>
    </div>
  `).join('');
}

// --- BARBEROS ADMIN ---
function renderBarberosAdmin() {
  const db = getDB();
  const el = document.getElementById('lista-barberos');
  if (db.barberos.length === 0) {
    el.innerHTML = emptyState('No hay barberos. Agregá uno con el botón +.');
    return;
  }
  el.innerHTML = db.barberos.map(b => {
    const cortes = db.cortes.filter(c => c.barberoId === b.id).length;
    const ingresos = db.cortes.filter(c => c.barberoId === b.id).reduce((s, c) => s + (parseFloat(c.precio) || 0), 0);
    const user = db.users.find(u => u.id === b.userId);
    return `
      <div class="barbero-card">
        <div class="barbero-card-header">
          <div class="barbero-avatar">
            ${b.foto ? `<img src="${b.foto}" alt="">` : '✂'}
          </div>
          <div class="barbero-card-info">
            <h3>${b.nombre}</h3>
            <span class="barbero-user">@${user ? user.username : '—'}</span>
            ${b.instagram ? `<span class="barbero-ig">📷 ${b.instagram}</span>` : ''}
          </div>
        </div>
        <div class="barbero-card-stats">
          <div class="bcs-item"><span>${cortes}</span><small>Cortes</small></div>
          <div class="bcs-item"><span>$${ingresos.toLocaleString('es-AR')}</span><small>Generado</small></div>
          <div class="bcs-item"><span>${b.horaInicio}–${b.horaFin}</span><small>Horario</small></div>
        </div>
        <div class="barbero-card-actions">
          <button class="btn-sm" onclick="openEditBarbero('${b.id}')">Editar</button>
          <button class="btn-danger" onclick="eliminarBarbero('${b.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function agregarBarbero() {
  const nombre = document.getElementById('new-barbero-nombre').value.trim();
  const username = document.getElementById('new-barbero-user').value.trim();
  const password = document.getElementById('new-barbero-pass').value;
  const instagram = document.getElementById('new-barbero-ig').value.trim();
  const horaInicio = document.getElementById('new-barbero-inicio').value;
  const horaFin = document.getElementById('new-barbero-fin').value;
  const errEl = document.getElementById('modal-barbero-error');

  if (!nombre || !username || !password) {
    showError(errEl, 'Nombre, usuario y contraseña son obligatorios.');
    return;
  }

  const db = getDB();
  if (db.users.find(u => u.username === username)) {
    showError(errEl, 'Ese nombre de usuario ya existe.');
    return;
  }

  const userId = 'u_' + Date.now();
  const barberoId = 'b_' + Date.now();

  db.users.push({ id: userId, username, password, role: 'barbero', nombre });
  db.barberos.push({ id: barberoId, userId, nombre, instagram, tiktok: '', bio: '', foto: '', horaInicio, horaFin });
  saveDB(db);

  closeModal('modal-add-barbero');
  clearModalBarbero();
  renderBarberosAdmin();
  populateFiltrosBarbero();
  showToast('Barbero creado correctamente.');
}

function clearModalBarbero() {
  ['new-barbero-nombre', 'new-barbero-user', 'new-barbero-pass', 'new-barbero-ig'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('new-barbero-inicio').value = '09:00';
  document.getElementById('new-barbero-fin').value = '18:00';
  document.getElementById('modal-barbero-error').classList.add('hidden');
}

function openEditBarbero(barberoId) {
  const db = getDB();
  const b = db.barberos.find(x => x.id === barberoId);
  if (!b) return;
  document.getElementById('edit-barbero-id').value = b.id;
  document.getElementById('edit-barbero-nombre').value = b.nombre;
  document.getElementById('edit-barbero-ig').value = b.instagram || '';
  document.getElementById('edit-barbero-inicio').value = b.horaInicio;
  document.getElementById('edit-barbero-fin').value = b.horaFin;
  openModal('modal-edit-barbero');
}

function editarBarbero() {
  const id = document.getElementById('edit-barbero-id').value;
  const nombre = document.getElementById('edit-barbero-nombre').value.trim();
  const instagram = document.getElementById('edit-barbero-ig').value.trim();
  const horaInicio = document.getElementById('edit-barbero-inicio').value;
  const horaFin = document.getElementById('edit-barbero-fin').value;

  if (!nombre) { showToast('El nombre es obligatorio.', true); return; }

  const db = getDB();
  const b = db.barberos.find(x => x.id === id);
  if (!b) return;

  b.nombre = nombre;
  b.instagram = instagram;
  b.horaInicio = horaInicio;
  b.horaFin = horaFin;

  // Actualizar nombre en el user también
  const user = db.users.find(u => u.id === b.userId);
  if (user) user.nombre = nombre;

  saveDB(db);
  closeModal('modal-edit-barbero');
  renderBarberosAdmin();
  showToast('Barbero actualizado.');
}

function eliminarBarbero(barberoId) {
  if (!confirm('¿Seguro que querés eliminar este barbero? Se eliminarán también sus turnos y cortes.')) return;
  const db = getDB();
  const b = db.barberos.find(x => x.id === barberoId);
  if (!b) return;

  db.users = db.users.filter(u => u.id !== b.userId);
  db.barberos = db.barberos.filter(x => x.id !== barberoId);
  db.turnos = db.turnos.filter(t => t.barberoId !== barberoId);
  db.cortes = db.cortes.filter(c => c.barberoId !== barberoId);
  saveDB(db);

  renderBarberosAdmin();
  renderDashboard();
  renderGaleriaAdmin();
  showToast('Barbero eliminado.');
}

// --- TURNOS ADMIN ---
function populateFiltrosBarbero() {
  const db = getDB();
  const sel = document.getElementById('filtro-barbero-turno');
  sel.innerHTML = '<option value="">Todos los barberos</option>';
  db.barberos.forEach(b => {
    sel.innerHTML += `<option value="${b.id}">${b.nombre}</option>`;
  });
}

function renderTurnosAdmin() {
  const db = getDB();
  const filtBarbero = document.getElementById('filtro-barbero-turno').value;
  const filtFecha = document.getElementById('filtro-fecha-turno').value;

  let turnos = [...db.turnos];
  if (filtBarbero) turnos = turnos.filter(t => t.barberoId === filtBarbero);
  if (filtFecha) turnos = turnos.filter(t => t.fecha === filtFecha);
  turnos.sort((a, b) => (a.fecha + a.hora) > (b.fecha + b.hora) ? -1 : 1);

  const el = document.getElementById('lista-turnos-admin');
  if (turnos.length === 0) {
    el.innerHTML = emptyState('No hay turnos con ese filtro.');
    return;
  }

  el.innerHTML = turnos.map(t => {
    const barbero = db.barberos.find(b => b.id === t.barberoId);
    return `
      <div class="turno-item">
        <div class="turno-hora">${t.hora}</div>
        <div class="turno-info">
          <span class="turno-cliente">${t.clienteNombre}</span>
          <span class="turno-barbero">con ${barbero ? barbero.nombre : '—'} · ${formatFecha(t.fecha)}</span>
        </div>
        <div class="turno-actions">
          ${estadoBadge(t.estado)}
          ${t.estado === 'pendiente' ? `<button class="btn-sm" onclick="completarTurno('${t.id}')">Completar</button>` : ''}
          <button class="btn-danger" onclick="cancelarTurno('${t.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function completarTurno(id) {
  const db = getDB();
  const t = db.turnos.find(x => x.id === id);
  if (t) { t.estado = 'completado'; saveDB(db); }
  renderTurnosAdmin();
  renderDashboard();
}

function cancelarTurno(id) {
  if (!confirm('¿Cancelar este turno?')) return;
  const db = getDB();
  db.turnos = db.turnos.filter(x => x.id !== id);
  saveDB(db);
  renderTurnosAdmin();
  renderDashboard();
  showToast('Turno cancelado.');
}

// --- GALERÍA ADMIN ---
function renderGaleriaAdmin() {
  const db = getDB();
  const el = document.getElementById('galeria-admin');
  renderGaleria(el, db.cortes, db);
}

// ============================================================
// BARBERO
// ============================================================

function initBarbero() {
  barberoTab('mis-turnos');
  renderBarberoWelcome();
  renderTurnosBarbero();
}

function barberoTab(tab) {
  document.querySelectorAll('#screen-barbero .nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#screen-barbero .panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`#screen-barbero .nav-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`barbero-${tab}`).classList.add('active');

  if (tab === 'mis-turnos') renderTurnosBarbero();
  if (tab === 'perfil') cargarPerfil();
}

function getBarberoActual() {
  const db = getDB();
  return db.barberos.find(b => b.userId === currentUser.id);
}

function renderBarberoWelcome() {
  const barbero = getBarberoActual();
  if (!barbero) return;
  document.getElementById('barbero-welcome').textContent = 'Bienvenido, ' + barbero.nombre;

  const db = getDB();
  const hoy = todayStr();
  const turnosHoy = db.turnos.filter(t => t.barberoId === barbero.id && t.fecha === hoy).length;
  const ingresosMes = db.cortes
    .filter(c => c.barberoId === barbero.id && c.fecha && c.fecha.startsWith(hoy.substring(0, 7)))
    .reduce((s, c) => s + (parseFloat(c.precio) || 0), 0);
  const ingresosTotal = db.cortes
    .filter(c => c.barberoId === barbero.id)
    .reduce((s, c) => s + (parseFloat(c.precio) || 0), 0);

  document.getElementById('barbero-stat-hoy').textContent = turnosHoy;
  document.getElementById('barbero-stat-mes').textContent = '$' + ingresosMes.toLocaleString('es-AR');
  document.getElementById('barbero-stat-total').textContent = '$' + ingresosTotal.toLocaleString('es-AR');
}

function renderTurnosBarbero() {
  renderBarberoWelcome();
  const barbero = getBarberoActual();
  if (!barbero) return;

  const db = getDB();
  const hoy = todayStr();
  const turnos = db.turnos
    .filter(t => t.barberoId === barbero.id && t.fecha >= hoy)
    .sort((a, b) => (a.fecha + a.hora) > (b.fecha + b.hora) ? 1 : -1);

  const el = document.getElementById('turnos-barbero');
  if (turnos.length === 0) {
    el.innerHTML = emptyState('No tenés turnos próximos.');
    return;
  }

  el.innerHTML = turnos.map(t => `
    <div class="turno-item">
      <div class="turno-hora">${t.hora}</div>
      <div class="turno-info">
        <span class="turno-cliente">${t.clienteNombre}</span>
        <span class="turno-barbero">${formatFecha(t.fecha)}</span>
      </div>
      <div class="turno-actions">
        ${estadoBadge(t.estado)}
        ${t.estado === 'pendiente' ? `<button class="btn-sm" onclick="barberoCompletarTurno('${t.id}')">Completar</button>` : ''}
      </div>
    </div>
  `).join('');
}

function barberoCompletarTurno(id) {
  const db = getDB();
  const t = db.turnos.find(x => x.id === id);
  if (t) { t.estado = 'completado'; saveDB(db); }
  renderTurnosBarbero();
  showToast('Turno marcado como completado.');
}

// --- SUBIR CORTE ---
function previewFoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('preview-foto');
    img.src = e.target.result;
    img.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function subirCorte() {
  const cliente = document.getElementById('corte-cliente').value.trim();
  const precio = parseFloat(document.getElementById('corte-precio').value);
  const fotoInput = document.getElementById('corte-foto');
  const barbero = getBarberoActual();

  if (!cliente) { showToast('Ingresá el nombre del cliente.', true); return; }
  if (isNaN(precio) || precio < 0) { showToast('Ingresá un precio válido.', true); return; }
  if (!barbero) { showToast('No se encontró el perfil de barbero.', true); return; }

  const guardarCorte = (fotoBase64) => {
    const db = getDB();
    db.cortes.push({
      id: 'c_' + Date.now(),
      barberoId: barbero.id,
      clienteNombre: cliente,
      precio,
      foto: fotoBase64 || '',
      fecha: todayStr()
    });
    saveDB(db);

    document.getElementById('corte-cliente').value = '';
    document.getElementById('corte-precio').value = '';
    fotoInput.value = '';
    const img = document.getElementById('preview-foto');
    img.src = '';
    img.classList.add('hidden');

    renderBarberoWelcome();
    showToast('¡Corte registrado!');
  };

  if (fotoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => guardarCorte(e.target.result);
    reader.readAsDataURL(fotoInput.files[0]);
  } else {
    guardarCorte('');
  }
}

// --- PERFIL BARBERO ---
function cargarPerfil() {
  const barbero = getBarberoActual();
  if (!barbero) return;
  document.getElementById('perfil-nombre').value = barbero.nombre || '';
  document.getElementById('perfil-instagram').value = barbero.instagram || '';
  document.getElementById('perfil-tiktok').value = barbero.tiktok || '';
  document.getElementById('perfil-bio').value = barbero.bio || '';
  if (barbero.foto) {
    const img = document.getElementById('preview-perfil');
    img.src = barbero.foto;
    img.classList.add('has-image');
  }
}

function previewPerfil(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('preview-perfil');
    img.src = e.target.result;
    img.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

function guardarPerfil() {
  const barbero = getBarberoActual();
  if (!barbero) return;

  const nombre = document.getElementById('perfil-nombre').value.trim();
  const instagram = document.getElementById('perfil-instagram').value.trim();
  const tiktok = document.getElementById('perfil-tiktok').value.trim();
  const bio = document.getElementById('perfil-bio').value.trim();
  const fotoInput = document.getElementById('perfil-foto');

  if (!nombre) { showToast('El nombre no puede estar vacío.', true); return; }

  const guardar = (fotoBase64) => {
    const db = getDB();
    const b = db.barberos.find(x => x.id === barbero.id);
    if (!b) return;
    b.nombre = nombre;
    b.instagram = instagram;
    b.tiktok = tiktok;
    b.bio = bio;
    if (fotoBase64) b.foto = fotoBase64;

    // Actualizar nombre en user
    const user = db.users.find(u => u.id === b.userId);
    if (user) user.nombre = nombre;

    saveDB(db);
    currentUser.nombre = nombre;
    showToast('Perfil guardado.');
  };

  if (fotoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => guardar(e.target.result);
    reader.readAsDataURL(fotoInput.files[0]);
  } else {
    guardar(null);
  }
}

// ============================================================
// CLIENTE
// ============================================================

function initCliente() {
  clienteTab('reservar');
  document.getElementById('cliente-welcome').textContent = '¡Hola, ' + currentUser.nombre + '!';
  renderBarberosSelectCards();
  renderMisTurnos();
  renderGaleriaCliente();
}

function clienteTab(tab) {
  document.querySelectorAll('#screen-cliente .nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#screen-cliente .panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`#screen-cliente .nav-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`cliente-${tab}`).classList.add('active');

  if (tab === 'mis-turnos') renderMisTurnos();
  if (tab === 'galeria') renderGaleriaCliente();
}

let barberoSeleccionado = null;

function renderBarberosSelectCards() {
  const db = getDB();
  const el = document.getElementById('barberos-cards-select');
  barberoSeleccionado = null;
  document.getElementById('horarios-section').classList.add('hidden');

  if (db.barberos.length === 0) {
    el.innerHTML = emptyState('No hay barberos disponibles todavía.');
    return;
  }

  el.innerHTML = db.barberos.map(b => `
    <div class="barbero-select-card" onclick="seleccionarBarbero('${b.id}', this)">
      <div class="card-avatar">
        ${b.foto ? `<img src="${b.foto}" alt="${b.nombre}">` : '✂'}
      </div>
      <h4>${b.nombre}</h4>
      <p>${b.horaInicio} – ${b.horaFin}</p>
      ${b.instagram ? `<p>📷 ${b.instagram}</p>` : ''}
    </div>
  `).join('');
}

function seleccionarBarbero(id, el) {
  document.querySelectorAll('.barbero-select-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  barberoSeleccionado = id;

  // Resetear fecha y horarios
  document.getElementById('turno-fecha').value = '';
  document.getElementById('horarios-disponibles').innerHTML = '<option value="">Seleccioná primero una fecha</option>';
  document.getElementById('horarios-section').classList.remove('hidden');

  // Fecha mínima: hoy
  document.getElementById('turno-fecha').min = todayStr();
}

function cargarHorariosDisponibles() {
  const fecha = document.getElementById('turno-fecha').value;
  const sel = document.getElementById('horarios-disponibles');

  if (!fecha || !barberoSeleccionado) {
    sel.innerHTML = '<option value="">Seleccioná primero una fecha</option>';
    return;
  }

  const db = getDB();
  const barbero = db.barberos.find(b => b.id === barberoSeleccionado);
  if (!barbero) return;

  const slots = generarSlots(barbero.horaInicio, barbero.horaFin, 30);
  const ocupados = db.turnos
    .filter(t => t.barberoId === barberoSeleccionado && t.fecha === fecha)
    .map(t => t.hora);

  const disponibles = slots.filter(s => !ocupados.includes(s));
  if (disponibles.length === 0) {
    sel.innerHTML = '<option value="">No hay horarios disponibles</option>';
    return;
  }
  sel.innerHTML = disponibles.map(s => `<option value="${s}">${s}</option>`).join('');
}

function generarSlots(inicio, fin, intervaloMin) {
  const slots = [];
  let [hh, mm] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const finMin = hf * 60 + mf;
  while (hh * 60 + mm < finMin) {
    slots.push(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
    mm += intervaloMin;
    if (mm >= 60) { hh++; mm -= 60; }
  }
  return slots;
}

function reservarTurno() {
  if (!barberoSeleccionado) { showToast('Seleccioná un barbero primero.', true); return; }
  const fecha = document.getElementById('turno-fecha').value;
  const hora = document.getElementById('horarios-disponibles').value;
  if (!fecha) { showToast('Seleccioná una fecha.', true); return; }
  if (!hora) { showToast('Seleccioná un horario.', true); return; }

  const db = getDB();
  // Verificar no duplicar
  const dup = db.turnos.find(t => t.barberoId === barberoSeleccionado && t.fecha === fecha && t.hora === hora);
  if (dup) { showToast('Ese horario ya fue reservado. Elegí otro.', true); return; }

  db.turnos.push({
    id: 't_' + Date.now(),
    clienteId: currentUser.id,
    clienteNombre: currentUser.nombre,
    barberoId: barberoSeleccionado,
    fecha,
    hora,
    estado: 'pendiente',
    precio: 0
  });
  saveDB(db);

  // Reset selección
  barberoSeleccionado = null;
  document.querySelectorAll('.barbero-select-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('horarios-section').classList.add('hidden');
  document.getElementById('turno-fecha').value = '';
  document.getElementById('horarios-disponibles').innerHTML = '<option value="">Seleccioná primero una fecha</option>';

  showToast('¡Turno reservado para el ' + formatFecha(fecha) + ' a las ' + hora + '!');
  renderMisTurnos();
}

function renderMisTurnos() {
  const db = getDB();
  const turnos = db.turnos
    .filter(t => t.clienteId === currentUser.id)
    .sort((a, b) => (a.fecha + a.hora) > (b.fecha + b.hora) ? -1 : 1);

  const el = document.getElementById('mis-turnos-cliente');
  if (turnos.length === 0) {
    el.innerHTML = emptyState('Todavía no tenés turnos reservados.');
    return;
  }

  el.innerHTML = turnos.map(t => {
    const barbero = db.barberos.find(b => b.id === t.barberoId);
    return `
      <div class="turno-item">
        <div class="turno-hora">${t.hora}</div>
        <div class="turno-info">
          <span class="turno-cliente">${formatFecha(t.fecha)}</span>
          <span class="turno-barbero">con ${barbero ? barbero.nombre : '—'}</span>
        </div>
        <div class="turno-actions">
          ${estadoBadge(t.estado)}
          ${t.estado === 'pendiente' ? `<button class="btn-danger" onclick="cancelarMiTurno('${t.id}')">Cancelar</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function cancelarMiTurno(id) {
  if (!confirm('¿Cancelar este turno?')) return;
  const db = getDB();
  db.turnos = db.turnos.filter(t => t.id !== id);
  saveDB(db);
  renderMisTurnos();
  showToast('Turno cancelado.');
}

function renderGaleriaCliente() {
  const db = getDB();
  const el = document.getElementById('galeria-cliente');
  renderGaleria(el, db.cortes, db);
}

// ============================================================
// GALERÍA (compartida)
// ============================================================

function renderGaleria(el, cortes, db) {
  if (cortes.length === 0) {
    el.innerHTML = emptyState('La galería está vacía por ahora.');
    return;
  }
  const sorted = [...cortes].sort((a, b) => b.fecha > a.fecha ? 1 : -1);
  el.innerHTML = sorted.map(c => {
    const barbero = db.barberos.find(b => b.id === c.barberoId);
    return `
      <div class="galeria-item">
        ${c.foto
          ? `<img src="${c.foto}" alt="Corte de ${c.clienteNombre}">`
          : `<div style="height:220px;display:flex;align-items:center;justify-content:center;font-size:48px;background:var(--dark3)">✂</div>`
        }
        <div class="galeria-info">
          <div class="galeria-cliente">${c.clienteNombre}</div>
          <div class="galeria-barbero">por ${barbero ? barbero.nombre : '—'}</div>
          <div class="galeria-precio">$${parseFloat(c.precio).toLocaleString('es-AR')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// MODALS
// ============================================================

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Cerrar modal clickeando afuera
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ============================================================
// TOAST
// ============================================================

let toastTimeout = null;

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================================
// HELPERS
// ============================================================

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function emptyState(msg) {
  return `<div class="empty-state"><span class="empty-icon">✂</span><p>${msg}</p></div>`;
}

function estadoBadge(estado) {
  const map = {
    pendiente: ['⏳', '#c9a84c'],
    completado: ['✓', '#27ae60'],
    cancelado: ['✕', '#c0392b']
  };
  const [icon, color] = map[estado] || ['?', '#888'];
  return `<span style="font-family:var(--font-ui);font-size:11px;letter-spacing:1px;color:${color};text-transform:uppercase;">${icon} ${estado}</span>`;
}

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatFecha(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

// ============================================================
// ESTILOS DINÁMICOS (elementos que no están en style.css)
// ============================================================

(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Barbero earning rows */
    .barbero-earning-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--dark4);
    }
    .barbero-earning-row:last-child { border-bottom: none; }
    .be-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--dark4); display: flex; align-items: center;
      justify-content: center; font-size: 18px; overflow: hidden;
      flex-shrink: 0; border: 1px solid rgba(201,168,76,0.3);
    }
    .be-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .be-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .be-nombre { font-family: var(--font-display); font-size: 15px; color: var(--white); }
    .be-cortes { font-family: var(--font-ui); font-size: 10px; color: var(--gray-light); letter-spacing: 1px; text-transform: uppercase; }
    .be-total { font-family: var(--font-display); font-size: 20px; color: var(--gold); font-weight: 700; }

    /* Dia rows */
    .dia-row {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 0; border-bottom: 1px solid var(--dark4);
    }
    .dia-row:last-child { border-bottom: none; }
    .dia-label { font-family: var(--font-ui); font-size: 11px; color: var(--gray-light); letter-spacing: 1px; min-width: 90px; }
    .dia-bar-wrap { flex: 1; background: var(--dark4); border-radius: 3px; height: 8px; overflow: hidden; }
    .dia-bar { height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); border-radius: 3px; transition: width 0.5s ease; }
    .dia-count { font-family: var(--font-display); font-size: 15px; color: var(--gold); min-width: 20px; text-align: right; }

    /* Barbero card */
    .barbero-card {
      background: var(--dark2); border: 1px solid var(--dark4);
      border-radius: var(--radius-lg); padding: 20px;
      transition: var(--transition);
    }
    .barbero-card:hover { border-color: rgba(201,168,76,0.3); box-shadow: var(--shadow-gold); }
    .barbero-card-header { display: flex; gap: 14px; margin-bottom: 16px; }
    .barbero-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--dark4); border: 2px solid rgba(201,168,76,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; overflow: hidden; flex-shrink: 0;
    }
    .barbero-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .barbero-card-info { display: flex; flex-direction: column; gap: 4px; justify-content: center; }
    .barbero-card-info h3 { font-family: var(--font-display); font-size: 18px; color: var(--white); }
    .barbero-user { font-family: var(--font-ui); font-size: 11px; letter-spacing: 1px; color: var(--gray-light); }
    .barbero-ig { font-family: var(--font-ui); font-size: 11px; color: var(--gold); }
    .barbero-card-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 16px; }
    .bcs-item { background: var(--dark3); border-radius: var(--radius); padding: 10px 8px; text-align: center; }
    .bcs-item span { display: block; font-family: var(--font-display); font-size: 16px; color: var(--gold); }
    .bcs-item small { font-family: var(--font-ui); font-size: 9px; letter-spacing: 1px; color: var(--gray-light); text-transform: uppercase; }
    .barbero-card-actions { display: flex; gap: 8px; justify-content: flex-end; }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// INIT — Mostrar login al arrancar
// ============================================================
showScreen('screen-login');