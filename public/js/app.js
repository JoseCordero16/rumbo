/* ============================================================
   app.js · El "cerebro" del navegador: rutas, formularios y acciones
   1) render()      → decide qué pantalla mostrar según la URL (#/ruta)
   2) Formularios   → se ejecutan al enviar un <form data-form="...">
   3) Acciones      → se ejecutan al hacer clic en [data-act="..."]
   Cada una manda su petición al servidor con http(); si el servidor rechaza
   algo (permiso, validación, palabra restringida) lanza un error y se muestra con aviso().
   ============================================================ */

// Qué rol necesita cada pantalla protegida (el servidor también lo valida)
const ACCESO = { tablero: 'candidate', panel: 'company', perfil: 'candidate', postulaciones: 'candidate', empresa: 'company', publicar: 'company', candidatos: 'company', candidato: 'company',
                 admin: 'admin', usuarios: 'admin', empresas: 'admin', empresaDetalle: 'admin', vacantes: 'admin', moderacion: 'admin' };

const $ = s => document.querySelector(s);
const aviso = msg => { $('#toast .toast-body').textContent = msg; bootstrap.Toast.getOrCreateInstance($('#toast')).show(); };
const ir = ruta => location.hash === '#/' + ruta ? render() : (location.hash = '#/' + ruta);

/* ---------- 1) Router: la URL (#/empleo/3) decide la pantalla ---------- */
async function render() {
  try { await db.cargar(); }                                   // pide al servidor los datos actuales
  catch (e) { return $('#app').innerHTML = `<div class="container py-5"><div class="alert alert-danger">${esc(e.message)}</div></div>`; }
  const [ruta = 'home', param] = location.hash.slice(2).split('/');
  const u = db.sesion;
  let vista = Vistas[ruta] ? ruta : 'home';
  if (ACCESO[vista] && u?.role !== ACCESO[vista]) { aviso('Inicia sesión con una cuenta que tenga acceso a esa sección'); vista = 'acceso'; }
  let contenido;
  try { contenido = await Vistas[vista](param, u); }
  catch (e) { contenido = `<div class="alert alert-danger" role="alert">${esc(e.message || 'No se pudo cargar esta pantalla')}</div>`; }
  $('#app').innerHTML = Navbar(u) + `<main class="container py-4">${contenido}</main>` +
    `<footer class="container pb-4 small text-muted">rumbo · <a href="#/">Inicio</a> · <a href="#/empleos">Buscar empleo</a> · <a href="#/recursos">Recursos</a> · <a href="#/valoraciones">Valoraciones</a>${u ? '' : ' · <a href="#/acceso">Acceso</a>'}</footer>`;
  scrollTo(0, 0);
}
addEventListener('hashchange', render);

/* ---------- 2) Formularios: reciben los datos ya validados como objeto ---------- */
const Formularios = {
  async login(d)          { const r = await http('POST', '/login', d); ir(INICIO[r.role]); },
  async registro(d)       { await http('POST', '/registro', d); ir('tablero'); },
  async registroEmpresa(d){ await http('POST', '/registro-empresa', { ...d, doc: await convertirArchivo(d.doc) }); aviso('Solicitud enviada. El administrador revisará tu empresa antes de activarla'); ir('home'); },
  async actualizarDocumento(d){ await http('PATCH', '/empresas/' + d.id + '/documento', { doc: await convertirArchivo(d.doc) }); aviso('Documento actualizado'); render(); },
  buscar(d)               { lst.empleos = { q: d.q || '', ciudad: d.ciudad || '', tipo: d.tipo || '', nivel: d.nivel || '', salario: +d.salario || 0, pagina: 1 }; ir('empleos'); },
  filtrar({ lista, ...f }) { lst[lista] = { ...f, pagina: 1 }; render(); },   // búsqueda de las tablas del administrador
  async valorar(d)        { await http('POST', '/valoraciones', d); aviso('Valoración publicada'); render(); },
  async perfil(d)         { await http('PATCH', '/perfil', { name: d.name, phone: d.phone, cv: d.cv.name }); aviso('Perfil guardado'); render(); },
  async alerta(d)         { await http('POST', '/alertas', d); render(); },
  async empresa(d)        { await http('PATCH', '/empresa', d); aviso('Datos actualizados'); render(); },
  async publicar(d)       { await http('POST', '/empleos', d); aviso('Vacante publicada'); render(); },
  async nota(d)           { await http('PATCH', '/postulaciones/' + d.id, { note: d.note }); aviso('Nota guardada'); },
  async palabra(d)        { await http('POST', '/palabras', d); render(); }
};
addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  if (!f.checkValidity()) return f.classList.add('was-validated');            // Bootstrap muestra los errores
  try { await Formularios[f.dataset.form](Object.fromEntries(new FormData(f))); }
  catch (err) { aviso(err.message); }                                         // mensaje que mandó el servidor
});

async function convertirArchivo(file) {
  if (!file || !file.size) throw new Error('Selecciona el archivo solicitado');
  if (file.size > 5 * 1024 * 1024) throw new Error('El PDF debe pesar como máximo 5 MB');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo')); reader.readAsDataURL(file);
  });
  return { name: file.name, size: file.size, data };
}

/* ---------- 3) Acciones: botones y switches con data-act ---------- */
const Acciones = {
  async salir()              { await http('POST', '/logout'); ir(''); },
  async postular({ id })     {
    if (!db.sesion) { aviso('Inicia sesión para postularte'); return ir('acceso'); }
    await http('POST', '/postulaciones', { jobId: id }); aviso('Postulación enviada'); ir('postulaciones');
  },
  async alerta({ id })       { await http('PATCH', '/alertas/' + id); },
  async pausar({ id })       { await http('PATCH', '/empleos/' + id); render(); },
  async borrarEmpleo({ id }) { if (confirm('¿Eliminar esta vacante?')) { await http('DELETE', '/empleos/' + id); render(); } },
  async estado({ id, s })    { await http('PATCH', '/postulaciones/' + id, { status: +s }); aviso('Estado actualizado'); render(); },
  pagina({ id, n })          { lst[id].pagina = +n; render(); },
  async empresaEstado({ id, s }) {
    let reason = ''; if (s === 'rejected') { reason = prompt('Motivo del rechazo (se le mostrará a la empresa):'); if (!reason) return; }
    await http('PATCH', '/empresas/' + id, { status: s, reason }); aviso(s === 'approved' ? 'Empresa aprobada: ya puede iniciar sesión' : 'Empresa rechazada'); render(); },
  async usuarioEstado({ id }){ await http('PATCH', '/usuarios/' + id); render(); },
  async quitarPalabra({ id }){ await http('DELETE', '/palabras/' + id); render(); },
  async descartar({ id })    { await http('DELETE', '/bloqueados/' + id); render(); }
};
addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.type !== 'checkbox') e.preventDefault();
  try { await Acciones[el.dataset.act](el.dataset); } catch (err) { aviso(err.message); }
});

render();   // primer dibujo de la página
