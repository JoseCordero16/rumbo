/* ============================================================
   vistas.js · El HTML de cada pantalla
   Cada función de `Vistas` devuelve un texto HTML (usando clases
   de Bootstrap). El router de app.js decide cuál mostrar.
   ============================================================ */

const CIUDADES = ['San Salvador', 'Santa Tecla', 'Antiguo Cuscatlán', 'San Miguel'];
const ETAPAS   = ['Enviada', 'En revisión', 'Entrevista', 'Aceptado', 'Denegado'];   // posición = valor de applications.status
const ROL      = { candidate: 'Candidato', company: 'Empresa', admin: 'Administrador' };
const INICIO   = { candidate: 'tablero', company: 'panel', admin: 'admin' };   // a dónde va cada rol al entrar

/* ---------- Ayudas pequeñas que se repiten en varias pantallas ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); // evita inyectar HTML
const txt = s => esc(s).replace(/\n/g, '<br>');
const estrellas = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const empresa = id => db.find('companies', c => c.id == id) || {};
const nombreEmpresa = j => j.companyName || empresa(j.companyId).name;
const empleo = id => String(id).startsWith('r') ? Api.cache[id] : db.find('jobs', j => j.id == id);
const promedio = id => empresa(id).promedio || 0;   // lo calcula la base de datos
const salario = j => j.salaryText || `$${j.salaryMin} – $${j.salaryMax}`;
const estadoEmpresa = { approved: ['Aprobada', 'success'], pending: ['En revisión', 'warning'], rejected: ['Rechazada', 'danger'] };

// Generadores de campos de formulario (así no repetimos el mismo HTML 30 veces)
const campo = (label, name, { type = 'text', value = '', req = true, ph = '', extra = '' } = {}) =>
  `<div class="mb-2"><label class="form-label small fw-bold">${label}</label>
   <input class="form-control" type="${type}" name="${name}" value="${esc(value)}" placeholder="${ph}" ${req ? 'required' : ''} ${extra}></div>`;
const lista = (label, name, opciones, valor = '', vacio = '') =>
  `<div class="mb-2"><label class="form-label small fw-bold">${label}</label><select class="form-select" name="${name}">
   ${vacio ? `<option value="">${vacio}</option>` : ''}${opciones.map(o => `<option ${o == valor ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
const area = (label, name, valor = '') =>
  `<div class="mb-2"><label class="form-label small fw-bold">${label}</label><textarea class="form-control" name="${name}" rows="3" required>${esc(valor)}</textarea></div>`;

// Menú lateral + contenido (lo usan candidato, empresa y administrador)
const conMenu = (items, actual, contenido) => `<div class="row g-4"><div class="col-md-3">
  <div class="list-group">${items.map(([t, r]) => `<a class="list-group-item list-group-item-action ${r === actual ? 'active' : ''}" href="#/${r}">${t}</a>`).join('')}</div>
  </div><div class="col-md-9">${contenido}</div></div>`;
const MENU_CANDIDATO = [['Dashboard', 'tablero'], ['Mi perfil', 'perfil'], ['Solicitudes', 'postulaciones'], ['Valoraciones', 'valoraciones']];
const MENU_EMPRESA   = [['Dashboard', 'panel'], ['Mantenimiento de empresa', 'empresa'], ['Publicar empleo', 'publicar'], ['Postulaciones', 'candidatos']];
const MENU_ADMIN     = [['Panel principal', 'admin'], ['Gestión de usuarios', 'usuarios'], ['Gestión de empresas', 'empresas'], ['Gestión de vacantes', 'vacantes'], ['Moderación de contenido', 'moderacion']];

const tabla = (cabeceras, filas) => `<div class="card p-2 table-responsive"><table class="table table-hover align-middle mb-0">
  <thead><tr>${cabeceras.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cabeceras.length}" class="text-muted">Sin registros</td></tr>`}</tbody></table></div>`;
const boton = (texto, act, id, extra = '', clase = 'btn-outline-dark') => `<button class="btn btn-sm ${clase}" data-act="${act}" data-id="${id}" ${extra}>${texto}</button>`;

// Insignia con color según la etapa de la postulación (0 Enviada … 3 Aceptado, 4 Denegado)
const etapa = a => `<span class="badge text-bg-${['secondary', 'warning', 'info', 'success', 'danger'][a.status]}">${ETAPAS[a.status]}</span>`;
// Barras horizontales simples para los dashboards: items = [[texto, número], ...]
const barras = items => { const max = Math.max(1, ...items.map(i => i[1]));
  return items.map(([t, v]) => `<div class="mb-2"><div class="d-flex justify-content-between small"><span>${esc(t)}</span><b>${v}</b></div><div class="progress"><div class="progress-bar" style="width:${v / max * 100}%"></div></div></div>`).join('') || '<small class="text-muted">Sin datos</small>'; };

// Botones Anterior / Siguiente de las listas paginadas
const paginacion = (nombre, r) => r.paginas < 2 ? '' : `<div class="d-flex gap-3 align-items-center my-3">${boton('‹ Anterior', 'pagina', nombre, `data-n="${r.pagina - 1}" ${r.pagina <= 1 ? 'disabled' : ''}`)}
  <span class="small">Página ${r.pagina} de ${r.paginas} · ${r.total} resultados</span>${boton('Siguiente ›', 'pagina', nombre, `data-n="${r.pagina + 1}" ${r.pagina >= r.paginas ? 'disabled' : ''}`)}</div>`;
// Formulario de búsqueda/filtros para las tablas del administrador
const formFiltro = (nombre, f, selects = []) => `<form class="d-flex gap-2 mb-3" data-form="filtrar"><input type="hidden" name="lista" value="${nombre}">
  <input class="form-control" name="q" value="${esc(f.q)}" placeholder="🔍 Buscar…">${selects.map(([n, texto, ops]) => `<select class="form-select" name="${n}"><option value="">${texto}</option>${ops.map(([v, t]) => `<option value="${v}" ${f[n] == v ? 'selected' : ''}>${t}</option>`).join('')}</select>`).join('')}
  <button class="btn btn-outline-dark">Filtrar</button></form>`;
// Tarjeta de indicador que además es un enlace a la pantalla donde se ve el detalle
const kpi = (titulo, valor, color, href) => `<div class="col-6 col-lg-4"><a class="card p-3 bg-${color}-subtle text-decoration-none text-body" href="${href}"><div class="fs-2 fw-bold">${valor}</div>${titulo}</a></div>`;

const tarjetaEmpleo = j => `<a class="card p-3 mb-3 text-decoration-none text-body" href="#/empleo/${j.id}">
  <div class="d-flex gap-3 align-items-center"><div class="logo-box">${esc(nombreEmpresa(j)[0])}</div>
  <div class="flex-grow-1"><h5 class="mb-0">${esc(j.title)}</h5><small class="text-muted">${esc(nombreEmpresa(j))} · ${esc(j.city)}</small>
  <div class="mt-2"><span class="badge text-bg-light border">${j.type}</span> <span class="badge text-bg-light border">${j.level}</span>
  <span class="badge text-bg-light border">${salario(j)}</span> <span class="badge text-bg-light border">${j.date}</span></div></div>
  ${j.external ? '<span class="badge text-bg-info">API Remotive</span>' : ''}</div></a>`;

const formValoracion = companyId => `<form class="card p-3 shadow-hard" data-form="valorar"><h5>Cuenta tu experiencia</h5>
  ${companyId ? `<input type="hidden" name="companyId" value="${companyId}">`
    : `<label class="form-label small fw-bold">Empresa</label><select class="form-select mb-2" name="companyId">${db.all('companies').filter(c => c.status === 'approved').map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>`}
  ${lista('Estrellas', 'stars', [5, 4, 3, 2, 1])}${area('Tu opinión', 'text')}
  <button class="btn btn-primary">Enviar valoración</button></form>`;

/* ---------- Barra superior (con el formulario de inicio de sesión, como pide el requerimiento) ---------- */
const Navbar = u => `<nav class="navbar navbar-expand-lg bg-white border-bottom border-2 border-dark sticky-top"><div class="container">
  <a class="navbar-brand logo" href="#/">rumbo<span>↗</span></a>
  <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#menu"><span class="navbar-toggler-icon"></span></button>
  <div class="collapse navbar-collapse" id="menu"><ul class="navbar-nav me-auto">
    <li class="nav-item"><a class="nav-link" href="#/empleos">Buscar empleo</a></li>
    <li class="nav-item"><a class="nav-link" href="#/${u?.role === 'company' ? 'publicar' : 'acceso'}">Publicar empleos</a></li>
    <li class="nav-item"><a class="nav-link" href="#/recursos">Recursos</a></li>
    <li class="nav-item"><a class="nav-link" href="#/valoraciones">Valoraciones</a></li>
    <li class="nav-item"><a class="nav-link" href="#/${u ? INICIO[u.role] : 'acceso'}">Mi perfil</a></li></ul>
  ${u ? `<span class="badge text-bg-warning me-2">${esc(u.name)} · ${ROL[u.role]}</span><button class="btn btn-sm btn-outline-dark" data-act="salir">Salir</button>`
      : `<form class="d-flex gap-2" data-form="login"><input class="form-control form-control-sm" type="email" name="email" placeholder="correo" required>
         <input class="form-control form-control-sm" type="password" name="password" placeholder="clave" required>
         <button class="btn btn-sm btn-outline-dark">Entrar</button><a class="btn btn-sm btn-primary" href="#/acceso">Registrarse</a></form>`}
  </div></div></nav>`;

/* ---------- Pantallas ---------- */
const Vistas = {
  // P-01 Inicio: buscador, métricas y empleos destacados
  async home() {
    const activos = db.all('jobs').filter(j => j.active);
    const m = db.stats, metricas = [['Empresas', m.empresas, 'info'], ['Candidatos', m.candidatos, 'warning'], ['Empleos activos', m.empleos, 'light'], ['Postulaciones', m.postulaciones, 'danger']];
    return `<div class="row align-items-center g-4 mb-5"><div class="col-lg-8">
      <span class="badge text-bg-warning mb-3">★ ${activos.length} vacantes activas</span>
      <h1 class="display-4 fw-bold">Tu próximo trabajo no es una lista. Es un rumbo.</h1>
      <form class="card shadow-hard p-3 mt-4" data-form="buscar"><div class="row g-2">
        <div class="col-md-4"><input class="form-control" name="q" placeholder="Busco trabajo de…"></div>
        <div class="col-md-3"><select class="form-select" name="ciudad"><option value="">en cualquier lugar</option>${CIUDADES.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="col-md-3"><select class="form-select" name="salario"><option value="0">salario desde…</option><option>800</option><option>1000</option><option>1500</option></select></div>
        <div class="col-md-2"><button class="btn btn-primary w-100">Buscar</button></div></div></form></div>
      <div class="col-lg-4"><div class="card p-3 text-bg-success"><b class="mb-2">Tu perfil encaja con…</b>
        ${activos.slice(0, 3).map(j => `<a class="card p-2 mb-2 text-decoration-none text-body" href="#/empleo/${j.id}"><b>${esc(j.title)}</b><small>${esc(nombreEmpresa(j))}</small></a>`).join('')}</div></div></div>
      <div class="row g-3 mb-5">${metricas.map(([t, n, c]) => `<div class="col-6 col-md-3"><div class="card p-3 bg-${c}-subtle"><div class="fs-2 fw-bold">${n}</div>${t}</div></div>`).join('')}</div>
      <h2 class="mb-3">Empleos destacados</h2>${activos.slice(0, 3).map(tarjetaEmpleo).join('')}`;
  },

  async empleos() {
    const f = lst.empleos, r = await pedir('empleos');
    const externos = (f.pagina == 1 && !f.ciudad && !f.nivel && (!f.tipo || f.tipo === 'Remoto')) ? await Api.empleosRemotos(f.q) : [];   // API externa solo en la primera página
    return `<div class="row g-4"><div class="col-md-3"><form class="card p-3" data-form="buscar"><h5>Refina tu rumbo</h5>
      ${campo('Palabra clave', 'q', { value: f.q, req: false })}${lista('Ubicación', 'ciudad', CIUDADES, f.ciudad, 'Cualquiera')}
      ${lista('Tipo de trabajo', 'tipo', ['Remoto', 'Híbrido', 'Presencial'], f.tipo, 'Cualquiera')}${lista('Nivel de experiencia', 'nivel', ['Junior', 'Semi-senior', 'Senior'], f.nivel, 'Cualquiera')}
      ${lista('Salario mínimo', 'salario', [0, 800, 1000, 1500], f.salario)}<button class="btn btn-primary">Aplicar filtros</button></form></div>
      <div class="col-md-9"><h2 class="mb-3">${r.total + externos.length} empleos encontrados</h2>
      ${r.items.concat(externos).map(tarjetaEmpleo).join('') || '<div class="card p-3">Sin resultados. Prueba quitando algún filtro.</div>'}${paginacion('empleos', r)}</div></div>`;
  },

  async empleo(id) {
    let j, e = {}, opiniones = [];
    if (String(id).startsWith('r')) j = Api.cache[id];                                    // empleo de la API externa
    else { try { ({ job: j, company: e, reviews: opiniones } = await http('GET', '/empleos/' + id)); } catch (err) { return `<div class="card p-3">${esc(err.message)}</div>`; } }
    if (!j) return '<div class="card p-3">Ese empleo ya no está disponible. <a href="#/empleos">Volver a buscar</a></div>';
    return `<a href="#/empleos" class="small">← Volver a resultados</a><div class="row g-4 mt-1"><div class="col-lg-8">
      <div class="d-flex gap-3 align-items-center mb-3"><div class="logo-box">${esc(nombreEmpresa(j)[0])}</div><div><h1 class="mb-1">${esc(j.title)}</h1>
        <span class="badge text-bg-light border">${esc(nombreEmpresa(j))} · ${esc(j.city)}</span> <span class="badge text-bg-light border">${j.type}</span> <span class="badge text-bg-light border">${j.level}</span></div></div>
      <div class="card p-3 mb-3"><h5>Descripción y responsabilidades</h5>${txt(j.description)}</div>
      ${j.external ? '' : `<div class="card p-3 mb-3"><h5>Requisitos</h5>${txt(j.requirements)}</div><div class="card p-3 mb-3"><h5>Beneficios</h5>${txt(j.benefits)}</div>
      <div class="card p-3 mb-3"><h5>Valoraciones de ${esc(e.name)} <span class="text-danger">${estrellas(Math.round(e.promedio))} ${e.promedio.toFixed(1)}</span> <small class="text-muted">(${e.totalReviews})</small></h5>
        ${opiniones.map(r => `<div class="border rounded p-2 mb-2">“${esc(r.text)}” — <small>${esc(r.author)}</small></div>`).join('') || '<small class="text-muted">Aún no hay valoraciones.</small>'}
        <a href="#/valoraciones" class="small mb-2">Ver valoraciones de otras empresas →</a>${formValoracion(e.id)}</div>`}</div>
      <div class="col-lg-4"><div class="card p-3 shadow-hard"><h3>${salario(j)}</h3>
        ${j.external ? `<a class="btn btn-primary mb-2" target="_blank" rel="noopener" href="${esc(j.url)}">Postularme en Remotive</a>`
                     : `<button class="btn btn-primary mb-2" data-act="postular" data-id="${j.id}">Postularme ahora</button>`}
        <a class="btn btn-outline-dark mb-2" href="#/empleos">Seguir buscando</a>
        <b class="mt-2">Contacto de la empresa</b><small>${esc(j.contact || e.web || 'Ver en el sitio de la oferta')}<br>${esc(e.phone || '')}</small></div></div></div>`;
  },

  // P-08 Registro e inicio de sesión (3 pestañas). Aquí se piden los datos de la empresa.
  async acceso() {
    return `<div class="row g-4"><div class="col-lg-5"><div class="card p-4 text-bg-success h-100"><h1>Encuentra tu rumbo en minutos.</h1>
      <p>✓ Perfil y CV en un solo lugar<br>✓ Alertas de empleos a tu medida<br>✓ Publica vacantes y recibe postulaciones</p>
      <small>Cuentas de prueba (clave 1234): admin@rumbo.com · empresa@demo.com · ana@correo.com</small></div></div>
      <div class="col-lg-7"><div class="card p-3 shadow-hard"><ul class="nav nav-tabs mb-3">
        <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#t1">Iniciar sesión</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#t2">Soy candidato</button></li>
        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#t3">Soy empresa</button></li></ul>
      <div class="tab-content">
        <div class="tab-pane fade show active" id="t1"><form data-form="login">${campo('Correo', 'email', { type: 'email' })}${campo('Contraseña', 'password', { type: 'password' })}<button class="btn btn-primary">Entrar</button></form></div>
        <div class="tab-pane fade" id="t2"><form data-form="registro">${campo('Nombre completo', 'name')}${campo('Correo', 'email', { type: 'email' })}${campo('Contraseña (mín. 4)', 'password', { type: 'password', extra: 'minlength="4"' })}<button class="btn btn-primary">Crear mi cuenta</button></form></div>
        <div class="tab-pane fade" id="t3"><div class="alert alert-warning small">Las empresas deben ser verificadas por el administrador antes de publicar vacantes.</div>
          <form data-form="registroEmpresa"><div class="row">
            <div class="col-md-6">${campo('Razón social / nombre comercial', 'name')}</div><div class="col-md-6">${campo('NIT', 'nit', { ph: '0000-000000-000-0', extra: 'pattern="\\d{4}-\\d{6}-\\d{3}-\\d" title="Formato: 0000-000000-000-0"' })}</div>
            <div class="col-md-6">${lista('Sector', 'sector', ['Tecnología', 'Finanzas', 'Comercio', 'Telecomunicaciones', 'Alimentos', 'Salud', 'Educación'])}</div><div class="col-md-6">${lista('Tamaño', 'size', ['1–10', '11–50', '51–200', '201–500', '501–1000', '1000+'])}</div>
            <div class="col-md-6">${campo('Sitio web', 'web')}</div><div class="col-md-6">${campo('Representante legal', 'rep')}</div>
            <div class="col-md-6">${campo('Teléfono', 'phone')}</div><div class="col-md-6">${campo('Correo corporativo', 'email', { type: 'email' })}</div>
            <div class="col-md-6">${campo('Contraseña (mín. 4)', 'password', { type: 'password', extra: 'minlength="4"' })}</div>
            <div class="col-md-6"><label class="form-label small fw-bold">Documento de registro (PDF)</label><input class="form-control" type="file" name="doc" accept=".pdf" required></div></div>
            <div class="form-check my-2"><input class="form-check-input" type="checkbox" required id="ok"><label class="form-check-label small" for="ok">Declaro que la información es verídica</label></div>
            <button class="btn btn-primary">Enviar solicitud de registro</button></form></div>
      </div></div></div></div>`;
  },

  // P-04 Perfil del candidato: datos, completitud, estadísticas y alertas

  async tablero(_, u) {
    const est = db.stats.mis.estados, total = est.reduce((a, b) => a + b, 0), mias = db.all('applications');     // los totales los calcula la BD
    const aplicadas = mias.map(a => a.jobId), sugeridas = db.all('jobs').filter(j => j.active && !aplicadas.includes(j.id)).slice(0, 3);
    const completo = [u.name, u.email, u.phone, u.cv].filter(Boolean).length * 25;
    const k = [['Postulaciones enviadas', total, 'light'], ['En proceso', est[0] + est[1] + est[2], 'warning'], ['Aceptadas', est[3], 'success'], ['Denegadas', est[4], 'danger']];
    return conMenu(MENU_CANDIDATO, 'tablero', `<h2 class="mb-3">Hola, ${esc(u.name)}</h2>
      <div class="row g-3 mb-4">${k.map(([t, v, c]) => kpi(t, v, c, '#/postulaciones').replace('col-lg-4', 'col-lg-3')).join('')}</div>
      <div class="row g-3 mb-4"><div class="col-lg-6"><div class="card p-3 h-100"><h5>Mis postulaciones por etapa</h5>${barras(ETAPAS.map((e, i) => [e, est[i]]))}</div></div>
      <div class="col-lg-6"><div class="card p-3 h-100"><h5>Perfil completo al ${completo}%</h5><div class="progress mb-2"><div class="progress-bar" style="width:${completo}%"></div></div>
        ${completo < 100 ? '<small class="text-muted">Para postularte necesitas teléfono y CV.</small>' : ''}<a href="#/perfil">Completar mi perfil →</a><hr><b>Alertas activas:</b> ${db.all('alerts').filter(a => a.enabled).length}
        <a href="#/empleos" class="btn btn-primary mt-3">Buscar empleos</a></div></div></div>
      <h5>Últimas postulaciones</h5>` + tabla(['Vacante', 'Empresa', 'Estado'], mias.slice(0, 4).map(a => { const j = empleo(a.jobId) || {}; return [`<a href="#/empleo/${a.jobId}">${esc(j.title)}</a>`, esc(nombreEmpresa(j)), etapa(a)]; })) +
      `<h5 class="mt-4">Empleos para ti</h5>${sugeridas.map(tarjetaEmpleo).join('') || '<small class="text-muted">No hay más empleos por ahora.</small>'}`);
  },

  async panel(_, u) {
    const m = db.stats.mis, est = m.estados, total = est.reduce((a, b) => a + b, 0), ultimas = await http('GET', '/lista/postulaciones?tam=6');   // métricas y últimas postulaciones vienen ya calculadas
    return conMenu(MENU_EMPRESA, 'panel', `<div class="d-flex justify-content-between align-items-center mb-3"><h2 class="mb-0">Dashboard · ${esc(empresa(u.companyId).name)}</h2><a class="btn btn-primary" href="#/publicar">+ Publicar vacante</a></div>
      <div class="row g-3 mb-4">${kpi('Vacantes activas', m.activas, 'info', '#/publicar')}${kpi('Vacantes inactivas', m.inactivas, 'secondary', '#/publicar')}${kpi('Postulaciones recibidas', total, 'warning', '#/candidatos')}
        ${kpi('Por revisar', est[0], 'light', '#/candidatos')}${kpi('Aceptados', est[3], 'success', '#/candidatos')}${kpi('Denegados', est[4], 'danger', '#/candidatos')}</div>
      <div class="card p-3 mb-4"><h5>Vacantes con más postulaciones</h5>${barras(m.porVacante.map(x => [x.title, x.n]))}</div>
      <h5>Últimas postulaciones <a class="small" href="#/candidatos">ver todas →</a></h5>` + tabla(['Candidato', 'Vacante', 'Estado', 'Decisión'], ultimas.items.map(a =>
        [esc(a.candidateName), esc(a.jobTitle), etapa(a), `<a class="btn btn-sm btn-outline-dark" href="#/candidato/${a.id}">Ver</a> ` + boton('Aceptar', 'estado', a.id, 'data-s="3"', 'btn-success') + ' ' + boton('Denegar', 'estado', a.id, 'data-s="4"', 'btn-danger')])));
  },

  async perfil(_, u) {
    const completo = [u.name, u.email, u.phone, u.cv].filter(Boolean).length * 25;
    const mias = db.all('applications').filter(a => a.userId === u.id), alertas = db.all('alerts').filter(a => a.userId === u.id);
    return conMenu(MENU_CANDIDATO, 'perfil', `<div class="row g-3"><div class="col-lg-7"><form class="card p-3" data-form="perfil"><h4>Gestión de perfil</h4>
      <div class="alert alert-warning py-2 small">Perfil completo al ${completo}%</div><div class="progress mb-3"><div class="progress-bar" style="width:${completo}%"></div></div>
      ${campo('Nombre', 'name', { value: u.name })}${campo('Teléfono', 'phone', { value: u.phone, req: false })}
      <label class="form-label small fw-bold">Currículum (PDF, DOCX) ${u.cv ? '· ' + esc(u.cv) : ''}</label><input class="form-control mb-3" type="file" name="cv" accept=".pdf,.docx">
      <button class="btn btn-primary">Guardar perfil</button></form></div>
      <div class="col-lg-5"><div class="card p-3 mb-3"><h4>Estadísticas</h4><div class="fs-2 fw-bold">${mias.length}</div>postulaciones enviadas<div class="fs-2 fw-bold">${alertas.filter(a => a.enabled).length}</div>alertas activas</div></div>
      <div class="col-12"><div class="card p-3"><h4>Panel de alertas</h4>
        ${alertas.map(a => `<div class="form-check form-switch border rounded p-2 ps-5 mb-2"><input class="form-check-input" type="checkbox" data-act="alerta" data-id="${a.id}" ${a.enabled ? 'checked' : ''}><label>🔔 ${esc(a.text)}</label></div>`).join('')}
        <form class="d-flex gap-2" data-form="alerta"><input class="form-control" name="text" placeholder="Nuevo puesto (ubicación)" required><button class="btn btn-outline-dark">+ Crear</button></form></div></div></div>`);
  },

  // P-10 Mis postulaciones con barra de progreso
  async postulaciones(_, u) {
    const mias = db.all('applications').filter(a => a.userId === u.id);
    return conMenu(MENU_CANDIDATO, 'postulaciones', `<h2 class="mb-3">Mis postulaciones (${mias.length})</h2>` + (mias.map(a => { const j = empleo(a.jobId) || {};
      return `<div class="card p-3 mb-3"><div class="d-flex justify-content-between"><div><h5 class="mb-0">${esc(j.title)}</h5><small>${esc(nombreEmpresa(j))} · enviada ${a.date}</small></div>
      <span class="align-self-start">${etapa(a)}</span></div><div class="progress mt-3"><div class="progress-bar ${a.status === 3 ? 'bg-success' : a.status === 4 ? 'bg-danger' : ''}" style="width:${Math.min(a.status + 1, 4) * 25}%"></div></div>
      <small class="text-muted mt-1">Enviada → En revisión → Entrevista → Aceptado / Denegado</small></div>`; }).join('') || '<div class="card p-3">Aún no te has postulado. <a href="#/empleos">Buscar empleos</a></div>'));
  },

  // P-09 Valoraciones de empresas
  async valoraciones(_, u) {
    const cuerpo = `<div class="row g-3"><div class="col-lg-7"><h2 class="mb-3">Cómo es trabajar en…</h2>
      ${db.all('companies').filter(c => c.status === 'approved').map(c => `<div class="card p-3 mb-3"><div class="d-flex gap-3 align-items-center"><div class="logo-box">${esc(c.name[0])}</div>
        <div><h5 class="mb-0">${esc(c.name)}</h5><b class="text-danger">${estrellas(Math.round(promedio(c.id)))} ${promedio(c.id).toFixed(1)}</b> <small>· ${c.totalReviews} opiniones</small></div></div></div>`).join('')}</div>
      <div class="col-lg-5">${formValoracion()}</div></div>`;
    return u?.role === 'candidate' ? conMenu(MENU_CANDIDATO, 'valoraciones', cuerpo) : cuerpo;
  },

  // P-07 Recursos (contenido estático)
  async recursos() {
    const items = [['Artículo', 'Cómo responder “háblame de ti”', '6 min'], ['Tutorial', 'Arma un CV en una sola página', 'Paso a paso'], ['Video', 'Simulacro de entrevista técnica', '12 min'],
                   ['Artículo', 'Cinco habilidades que más piden las empresas', '5 min'], ['Artículo', 'Errores comunes en un CV', '4 min'], ['Noticia', 'Tecnología lidera la demanda de talento', '3 min']];
    return `<h1 class="mb-2">Prepárate para tu próximo rumbo</h1><div class="alert alert-success">Consejo de la semana: cuenta logros con números, “aumenté ventas 20%” pesa más que “soy responsable”.</div>
      <div class="row g-3">${items.map(([t, n, m]) => `<div class="col-md-4"><div class="card p-3 h-100"><span class="badge text-bg-warning align-self-start mb-2">${t}</span><h5>${n}</h5><small class="text-muted">${m}</small></div></div>`).join('')}</div>`;
  },

  // P-11 Datos de la empresa (rol empresa)
  async empresa(_, u) {
    const c = empresa(u.companyId), [txtEstado, color] = estadoEmpresa[c.status];
    return conMenu(MENU_EMPRESA, 'empresa', `<form class="card p-3 shadow-hard" data-form="empresa"><h4>Datos de la empresa <span class="badge text-bg-${color}">${txtEstado}</span></h4>
      <label class="form-label small fw-bold">Nombre comercial</label><input class="form-control mb-2" value="${esc(c.name)}" disabled>
      ${campo('NIT', 'nit', { value: c.nit })}${lista('Sector', 'sector', ['Tecnología', 'Finanzas', 'Comercio', 'Telecomunicaciones', 'Alimentos', 'Salud', 'Educación'], c.sector)}
      ${campo('Sitio web', 'web', { value: c.web })}${campo('Representante legal', 'rep', { value: c.rep })}${campo('Teléfono', 'phone', { value: c.phone })}
      <button class="btn btn-primary align-self-start">Guardar cambios</button></form>`);
  },

  // P-05 Publicar empleo + mis vacantes
  async publicar(_, u) {
    const mios = db.all('jobs').filter(j => j.companyId === u.companyId);
    return conMenu(MENU_EMPRESA, 'publicar', `<form class="card p-3 shadow-hard mb-4" data-form="publicar"><h4>Publicar una nueva vacante</h4><div class="row">
      <div class="col-md-6">${campo('Título del trabajo', 'title')}</div><div class="col-md-6">${lista('Ubicación', 'city', CIUDADES)}</div>
      <div class="col-md-4">${lista('Tipo', 'type', ['Híbrido', 'Remoto', 'Presencial'])}</div><div class="col-md-4">${lista('Nivel', 'level', ['Junior', 'Semi-senior', 'Senior'])}</div>
      <div class="col-md-2">${campo('Salario mín.', 'salaryMin', { type: 'number', extra: 'min="0"' })}</div><div class="col-md-2">${campo('Salario máx.', 'salaryMax', { type: 'number', extra: 'min="0"' })}</div></div>
      ${area('Descripción y responsabilidades (una por línea)', 'description')}${area('Requisitos (uno por línea)', 'requirements')}${area('Beneficios (uno por línea)', 'benefits')}${campo('Contacto', 'contact', { type: 'email' })}
      <div class="alert alert-secondary small">Las vacantes con palabras restringidas se bloquean y pasan a moderación.</div><button class="btn btn-primary align-self-start">Publicar vacante</button></form>
      <h4>Mis vacantes (${mios.length})</h4>` + tabla(['Vacante', 'Estado', 'Acciones'], mios.map(j => [esc(j.title), j.active ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Pausada</span>',
        boton(j.active ? 'Inactivar' : 'Activar', 'pausar', j.id) + ' ' + boton('Eliminar', 'borrarEmpleo', j.id)])));
  },

  async candidatos(_, u) {
    const r = await pedir('postulaciones');
    return conMenu(MENU_EMPRESA, 'candidatos', `<h2 class="mb-3">Postulaciones recibidas (${r.total})</h2>` + tabla(['Candidato', 'Vacante', 'Estado', ''],
      r.items.map(a => [esc(a.candidateName), esc(a.jobTitle), etapa(a), `<a class="btn btn-sm btn-outline-dark" href="#/candidato/${a.id}">Ver perfil</a>`])) + paginacion('postulaciones', r));
  },

  async candidato(id, u) {
    let a; try { a = await http('GET', '/postulaciones/' + id); } catch (err) { return `<div class="card p-3">${esc(err.message)}</div>`; }
    return conMenu(MENU_EMPRESA, 'candidatos', `<a href="#/candidatos" class="small">← Postulaciones</a><div class="row g-3 mt-1"><div class="col-lg-7"><div class="card p-3"><h3>${esc(a.candidateName)}</h3>
      <p class="mb-1">${esc(a.candidateEmail)} · ${esc(a.candidatePhone || 'Sin teléfono')}</p><p>CV: ${esc(a.candidateCv || 'No ha subido CV')}</p><b>Postulado a:</b> <a href="#/empleo/${a.jobId}">${esc(a.jobTitle)}</a></div></div>
      <div class="col-lg-5"><div class="card p-3 shadow-hard"><h5>Estado: ${etapa(a)}</h5>
        <div class="d-grid gap-2 mb-3">${[[1, 'Pasar a revisión', 'btn-outline-dark'], [2, 'Programar entrevista', 'btn-outline-dark'], [3, '✔ Aceptar aplicante', 'btn-success'], [4, '✖ Denegar aplicante', 'btn-danger']].map(([s, t, c]) => boton(t, 'estado', a.id, `data-s="${s}"`, c)).join('')}</div>
        <form data-form="nota"><input type="hidden" name="id" value="${a.id}"><label class="form-label small fw-bold">Notas internas</label><textarea class="form-control mb-2" name="note">${esc(a.note)}</textarea><button class="btn btn-sm btn-primary">Guardar nota</button></form></div></div></div>`);
  },

  async admin() {
    const m = db.stats.mis, pend = await http('GET', '/lista/empresas?estado=pending&tam=5'), flags = db.all('flags');
    return conMenu(MENU_ADMIN, 'admin', `<h2 class="mb-3">Panel principal · Administrador</h2><div class="row g-3 mb-4">${kpi('Usuarios', m.usuarios, 'light', '#/usuarios')}${kpi('Empresas activas', db.stats.empresas, 'info', '#/empresas')}
      ${kpi('Vacantes activas', db.stats.empleos, 'warning', '#/vacantes')}${kpi('Empresas por verificar', m.pendientes, 'danger', '#/empresas')}${kpi('Contenido bloqueado', m.bloqueados, 'secondary', '#/moderacion')}</div>
      <h4>Empresas por verificar (${pend.total}) <a class="small" href="#/empresas">ver todas →</a></h4>` + tabla(['Empresa', 'Lista de verificación', 'Decisión'], pend.items.map(c => [`<b>${esc(c.name)}</b><br><small>${esc(c.sector)} · ${esc(c.size)}</small>`,
        `<small>NIT ${esc(c.nit)}<br>${c.doc ? 'Documento adjunto' : 'Sin documento'}<br>Rep. ${esc(c.rep)} · ${esc(c.phone)}</small>`,
        `<a class="btn btn-sm btn-outline-dark" href="#/empresaDetalle/${c.id}">Ver detalle</a> ` + boton('Aprobar', 'empresaEstado', c.id, 'data-s="approved"', 'btn-warning') + ' ' + boton('Rechazar', 'empresaEstado', c.id, 'data-s="rejected"')])) +
      `<h4 class="mt-4">Contenido bloqueado (${flags.length}) <a class="small" href="#/moderacion">moderación →</a></h4>` + tabla(['Contenido', 'Palabra', ''], flags.slice(0, 5).map(f => [esc(f.text), `<span class="badge text-bg-danger">${esc(f.word)}</span>`, boton('Descartar', 'descartar', f.id)])));
  },

  async usuarios() {
    const f = lst.usuarios, r = await pedir('usuarios');
    return conMenu(MENU_ADMIN, 'usuarios', `<h2 class="mb-3">Gestión de usuarios (${r.total})</h2>` + formFiltro('usuarios', f, [['rol', 'Rol: todos', [['candidate', 'Candidato'], ['company', 'Empresa'], ['admin', 'Administrador']]]]) +
      tabla(['Usuario', 'Rol', 'Estado', ''], r.items.map(u => [`<b>${esc(u.name)}</b><br><small>${esc(u.email)}</small>`, `<span class="badge text-bg-info">${ROL[u.role]}</span>`,
        u.active ? '<span class="badge text-bg-success">Activo</span>' : '<span class="badge text-bg-danger">Suspendido</span>', u.role === 'admin' ? '' : boton(u.active ? 'Suspender' : 'Activar', 'usuarioEstado', u.id)])) + paginacion('usuarios', r));
  },

  async empresas() {
    const f = lst.empresas, r = await pedir('empresas');
    return conMenu(MENU_ADMIN, 'empresas', `<h2 class="mb-3">Gestión de empresas (${r.total})</h2>` + formFiltro('empresas', f, [['estado', 'Estado: todos', [['pending', 'En revisión'], ['approved', 'Aprobada'], ['rejected', 'Rechazada']]]]) +
      tabla(['Empresa', 'NIT / documento', 'Estado', ''], r.items.map(c => { const [t, col] = estadoEmpresa[c.status];
        return [`<b>${esc(c.name)}</b><br><small>${esc(c.sector)}</small>`, `${esc(c.nit)}<br><small>${c.doc ? esc(c.doc) : '⚠ sin documento'}</small>`,
          `<span class="badge text-bg-${col}">${t}</span>${c.rejectReason ? `<br><small class="text-muted">Motivo: ${esc(c.rejectReason)}</small>` : ''}`,
          `<a class="btn btn-sm btn-outline-dark" href="#/empresaDetalle/${c.id}">Ver detalle</a> ` + (c.status === 'pending' ? boton('Aprobar', 'empresaEstado', c.id, 'data-s="approved"', 'btn-warning') + ' ' + boton('Rechazar', 'empresaEstado', c.id, 'data-s="rejected"') : ' ')]; })) + paginacion('empresas', r));
  },

  async empresaDetalle(id) {
    const { company: c, jobs } = await http('GET', '/empresas/' + id), [label, color] = estadoEmpresa[c.status];
    return conMenu(MENU_ADMIN, 'empresas', `<a href="#/empresas" class="small">← Volver a empresas</a>
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mt-3 mb-4"><div><span class="eyebrow">EXPEDIENTE DE EMPRESA</span><h1 class="h2 mb-1">${esc(c.name)}</h1><span class="badge text-bg-${color}">${label}</span></div>
      <div class="d-flex gap-2">${c.status === 'pending' ? boton('Aprobar empresa', 'empresaEstado', c.id, 'data-s="approved"', 'btn-success') + boton('Rechazar solicitud', 'empresaEstado', c.id, 'data-s="rejected"', 'btn-outline-danger') : ''}</div></div>
      ${c.rejectReason ? `<div class="alert alert-danger">Motivo del rechazo: ${esc(c.rejectReason)}</div>` : ''}
      <div class="row g-3 mb-4"><div class="col-lg-8"><section class="card p-4 h-100"><h2 class="h5">Información legal y de contacto</h2><div class="row g-3 mt-1">
        ${[['NIT', c.nit], ['Sector', c.sector], ['Tamaño', c.size], ['Representante legal', c.rep], ['Teléfono', c.phone], ['Sitio web', c.web], ['Correo de acceso', c.email]].map(([k,v]) => `<div class="col-sm-6"><small class="text-muted d-block">${k}</small><strong>${esc(v || 'No informado')}</strong></div>`).join('')}
      </div></section></div><div class="col-lg-4"><section class="card p-4 h-100"><h2 class="h5">Documento de registro</h2>${c.doc ? `<p class="small text-muted">Documento asociado a esta solicitud.</p><a class="btn btn-primary mb-3" href="/api/empresas/${c.id}/documento" target="_blank" rel="noopener">Abrir documento PDF ↗</a>` : '<div class="alert alert-warning">No se encontró un PDF disponible.</div>'}
        <form data-form="actualizarDocumento"><input type="hidden" name="id" value="${c.id}"><label class="form-label small fw-bold">Adjuntar o reemplazar PDF (máx. 5 MB)</label><input class="form-control mb-2" type="file" name="doc" accept="application/pdf,.pdf" required><button class="btn btn-outline-dark">Guardar documento</button></form></section></div></div>
      <section class="card p-4"><div class="d-flex justify-content-between"><h2 class="h5">Actividad de vacantes</h2><span class="small text-muted">${c.activeJobs} activas · ${c.jobsCount} en total</span></div>${tabla(['Vacante', 'Ubicación', 'Modalidad', 'Estado', 'Fecha'], jobs.map(j => [`<a href="#/empleo/${j.id}">${esc(j.title)}</a>`, esc(j.city || '—'), esc(j.type || '—'), j.active ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Inactiva</span>', esc(j.date)]))}</section>`);
  },

  async vacantes() {
    const f = lst.vacantes, r = await pedir('vacantes');
    return conMenu(MENU_ADMIN, 'vacantes', `<h2 class="mb-3">Gestión de vacantes (${r.total})</h2>` + formFiltro('vacantes', f) + tabla(['Vacante', 'Empresa', 'Estado', ''], r.items.map(j => [`<a href="#/empleo/${j.id}">${esc(j.title)}</a><br><small>${j.city} · ${j.type} · ${j.level}</small>`,
      esc(j.companyName), j.active ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Inactiva</span>',
      boton(j.active ? 'Inactivar' : 'Activar', 'pausar', j.id) + ' ' + boton('Eliminar', 'borrarEmpleo', j.id)])) + paginacion('vacantes', r));
  },

  async moderacion() {
    return conMenu(MENU_ADMIN, 'moderacion', `<h2 class="mb-3">Moderación de contenido</h2><div class="card p-3 mb-4"><h5>Palabras restringidas</h5>
      <small class="text-muted">Las vacantes y comentarios que las contengan se bloquean automáticamente.</small>
      <div class="my-2">${db.all('words').map(w => `<span class="badge text-bg-danger me-1">${esc(w.word)} <a href="#" class="text-white text-decoration-none" data-act="quitarPalabra" data-id="${w.id}">✕</a></span>`).join('')}</div>
      <form class="d-flex gap-2" data-form="palabra"><input class="form-control" name="word" placeholder="Nueva palabra o frase" required><button class="btn btn-primary">Agregar</button></form></div>
      <h5>Contenido bloqueado</h5>` + tabla(['Contenido', 'Palabra', 'Por', ''], db.all('flags').map(f => [esc(f.text), esc(f.word), esc(f.byName), boton('Descartar', 'descartar', f.id)])));
  }
};
