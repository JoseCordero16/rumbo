/* ============================================================
   server.js · Servidor (Node + Express) y API REST sobre PostgreSQL
   - Sirve el sitio (carpeta /public)
   - Expone la API en /api/...  (el navegador la llama con fetch)
   - Decide QUÉ datos ve cada rol y valida los permisos (el navegador no es de fiar)
   ============================================================ */
require('dotenv').config();
const express = require('express'), path = require('path'), fs = require('fs/promises'), crypto = require('crypto'), bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session'), { Pool, types } = require('pg');

types.setTypeParser(1082, v => v);                                  // las fechas (DATE) llegan como texto 'AAAA-MM-DD'
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(cookieSession({ name: 'rumbo', keys: [process.env.SECRET || 'cambia-este-secreto'], maxAge: 7 * 24 * 3600 * 1000 })); // sesión en cookie firmada
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ---------- Ayudas ---------- */
const camel = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v])); // company_id → companyId
const q = (sql, p) => pool.query(sql, p).then(r => r.rows);          // consulta SQL con parámetros ($1, $2…): evita inyección SQL
const rows = async (sql, p) => (await q(sql, p)).map(camel);
const documentosDir = path.join(__dirname, 'private-documents');
const guardarPDF = async archivo => {
  if (!archivo || !archivo.data) throw fallo(400, 'Adjunta el documento de registro en PDF');
  if (archivo.size > 5 * 1024 * 1024) throw fallo(413, 'El PDF debe pesar como máximo 5 MB');
  const buffer = Buffer.from(archivo.data, 'base64');
  if (buffer.length !== archivo.size || buffer.subarray(0, 5).toString() !== '%PDF-') throw fallo(400, 'El documento debe ser un PDF válido');
  await fs.mkdir(documentosDir, { recursive: true });
  const nombre = crypto.randomUUID() + '.pdf';
  await fs.writeFile(path.join(documentosDir, nombre), buffer, { flag: 'wx' });
  return nombre;
};
const fallo = (status, message) => Object.assign(new Error(message), { status });
const TODOS = ['candidate', 'company', 'admin'];

// Cada petición: si hay sesión, cargamos el usuario en req.user
app.use(async (req, _, next) => {
  try { if (req.session.uid) [req.user] = await rows('SELECT id,name,email,role,active,phone,cv,company_id FROM users WHERE id=$1 AND active', [req.session.uid]); next(); }
  catch (e) { next(e); }
});

// ruta(método, url, roles permitidos, función): registra un endpoint con control de permisos y manejo de errores
const ruta = (metodo, url, roles, fn) => app[metodo]('/api' + url, async (req, res) => {
  try {
    if (roles && !(req.user && roles.includes(req.user.role))) throw fallo(403, 'Inicia sesión con una cuenta que tenga permiso para esto');
    res.json((await fn(req, req.user)) || { ok: true });
  } catch (e) { if (!e.status) console.error(e); res.status(e.status || 500).json({ error: e.status ? e.message : 'Error del servidor' }); }
});

// Palabras restringidas: si el texto trae alguna, se guarda en "flags" y se rechaza
const prohibida = async t => (await q('SELECT word FROM words')).find(w => t.toLowerCase().includes(w.word.toLowerCase()))?.word;
const bloquear = async (texto, palabra, por) => {
  await q('INSERT INTO flags(text,word,by_name) VALUES($1,$2,$3)', [texto, palabra, por]);
  throw fallo(422, `No se publicó: contiene la palabra restringida “${palabra}”`);
};
const NIT = /^\d{4}-\d{6}-\d{3}-\d$/;
const libre = async email => { if ((await q('SELECT 1 FROM users WHERE email=$1', [email.toLowerCase()])).length) throw fallo(409, 'Ese correo ya está registrado'); };

/* ---------- Lectura ---------- */
// Promedio y número de valoraciones de una empresa (calculados por la base de datos, no por el navegador)
const PROM = `(SELECT COALESCE(avg(stars),0)::float FROM reviews r WHERE r.company_id=c.id) AS promedio, (SELECT count(*)::int FROM reviews r WHERE r.company_id=c.id) AS total_reviews`;
const estados = filas => [0, 1, 2, 3, 4].map(s => filas.find(x => x.status === s)?.n || 0);   // [enviadas, revisión, entrevista, aceptadas, denegadas]

// Paginación: cuenta el total y trae SOLO la página pedida (LIMIT/OFFSET). Así el navegador nunca recibe miles de filas.
// El texto SQL lo escribimos nosotros; lo que escribe el usuario viaja siempre como parámetro ($1, $2…).
const paginar = async (req, from, where, params, order, cols) => {
  const n = Math.max(1, +req.query.pagina || 1), tam = Math.min(20, +req.query.tam || 8);
  const [{ total }] = await q(`SELECT count(*)::int total FROM ${from} WHERE ${where}`, params);
  const items = await rows(`SELECT ${cols} FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT ${tam} OFFSET ${(n - 1) * tam}`, params);
  return { items, total, pagina: n, paginas: Math.max(1, Math.ceil(total / tam)) };
};

// Datos "pequeños" que la interfaz necesita en cada pantalla (sesión, métricas y unos pocos registros recientes).
// Las listas grandes se piden aparte, por páginas, en /api/lista/...
ruta('get', '/datos', null, async (_, u) => {
  const admin = u?.role === 'admin', cid = u?.companyId ?? null, uid = u?.id ?? null;
  const stats = (await q(`SELECT (SELECT count(*)::int FROM companies WHERE status='approved') empresas, (SELECT count(*)::int FROM users WHERE role='candidate') candidatos,
                                 (SELECT count(*)::int FROM jobs WHERE active) empleos, (SELECT count(*)::int FROM applications) postulaciones`))[0];
  if (u?.role === 'candidate') stats.mis = { estados: estados(await q('SELECT status, count(*)::int n FROM applications WHERE user_id=$1 GROUP BY status', [uid])) };
  if (u?.role === 'company') stats.mis = {
    activas: (await q('SELECT count(*)::int n FROM jobs WHERE company_id=$1 AND active', [cid]))[0].n, inactivas: (await q('SELECT count(*)::int n FROM jobs WHERE company_id=$1 AND NOT active', [cid]))[0].n,
    estados: estados(await q('SELECT a.status, count(*)::int n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.company_id=$1 GROUP BY a.status', [cid])),
    porVacante: await q('SELECT j.title, count(a.id)::int n FROM jobs j LEFT JOIN applications a ON a.job_id=j.id WHERE j.company_id=$1 GROUP BY j.id ORDER BY n DESC LIMIT 8', [cid]) };
  if (admin) stats.mis = (await q(`SELECT (SELECT count(*)::int FROM users) usuarios, (SELECT count(*)::int FROM companies WHERE status='pending') pendientes, (SELECT count(*)::int FROM flags) bloqueados`))[0];

  const jobs = await rows(`SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON c.id=j.company_id
    WHERE j.id IN (SELECT id FROM jobs WHERE active ORDER BY id DESC LIMIT 12) OR j.id IN (SELECT id FROM jobs WHERE company_id=$1 ORDER BY id DESC LIMIT 50)
       OR j.id IN (SELECT job_id FROM applications WHERE user_id=$2) ORDER BY j.id DESC`, [cid, uid]);
  const applications = !u ? [] : await rows(`SELECT * FROM applications WHERE user_id=$1 OR job_id IN (SELECT id FROM jobs WHERE company_id=$2) ORDER BY id DESC LIMIT 100`, [uid, cid]);
  return {
    sesion: u || null, stats, jobs, applications,
    companies: await rows(`SELECT c.*, ${PROM} FROM companies c WHERE (c.status='approved' AND (c.id = ANY($1::int[]) OR c.id IN
      (SELECT company_id FROM reviews GROUP BY company_id ORDER BY count(*) DESC LIMIT 20))) OR c.id=$2 ORDER BY c.id`, [jobs.map(j => j.companyId), cid]),
    users: u ? await rows('SELECT id,name,email,role,active,phone,cv FROM users WHERE id=$1 OR id = ANY($2::int[])', [uid, applications.map(a => a.userId)]) : [],
    alerts: u ? await rows('SELECT * FROM alerts WHERE user_id=$1 ORDER BY id', [uid]) : [],
    words: admin ? await rows('SELECT * FROM words ORDER BY id') : [],
    flags: admin ? await rows('SELECT * FROM flags ORDER BY id DESC LIMIT 50') : []
  };
});

// Listas paginadas con búsqueda y filtros hechos EN LA BASE DE DATOS
ruta('get', '/lista/empleos', null, req => { const { q = '', ciudad = '', tipo = '', nivel = '', salario = 0 } = req.query;
  return paginar(req, 'jobs j JOIN companies c ON c.id=j.company_id',
    `j.active AND c.status='approved' AND ($1='' OR j.title ILIKE '%'||$1||'%' OR c.name ILIKE '%'||$1||'%') AND ($2='' OR j.city=$2) AND ($3='' OR j.type=$3) AND ($4='' OR j.level=$4) AND j.salary_max>=$5`,
    [q, ciudad, tipo, nivel, +salario || 0], 'j.id DESC', 'j.*, c.name AS company_name'); });
ruta('get', '/lista/postulaciones', ['company'], (req, u) => paginar(req, 'applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.user_id', 'j.company_id=$1', [u.companyId],
  'a.id DESC', 'a.id, a.status, a.date, u.name AS candidate_name, j.title AS job_title'));
ruta('get', '/lista/usuarios', ['admin'], req => paginar(req, 'users', `($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%') AND ($2='' OR role=$2)`,
  [req.query.q || '', req.query.rol || ''], 'id', 'id,name,email,role,active'));
ruta('get', '/lista/empresas', ['admin'], req => paginar(req, 'companies', `($1='' OR name ILIKE '%'||$1||'%' OR nit ILIKE '%'||$1||'%') AND ($2='' OR status=$2)`,
  [req.query.q || '', req.query.estado || ''], `CASE status WHEN 'pending' THEN 0 ELSE 1 END, id`, '*'));
// El detalle administrativo reúne los datos de revisión y el historial de vacantes.
ruta('get', '/empresas/:id(\\d+)', ['admin'], async req => {
  const [company] = await rows(`SELECT c.*, (SELECT email FROM users u WHERE u.company_id=c.id AND u.role='company' ORDER BY u.id LIMIT 1) AS email,
    (SELECT count(*)::int FROM users u WHERE u.company_id=c.id) AS users_count,
    (SELECT count(*)::int FROM jobs j WHERE j.company_id=c.id) AS jobs_count,
    (SELECT count(*)::int FROM jobs j WHERE j.company_id=c.id AND j.active) AS active_jobs
    FROM companies c WHERE c.id=$1`, [req.params.id]);
  if (!company) throw fallo(404, 'Empresa no encontrada');
  return { company, jobs: await rows('SELECT id,title,city,type,level,date,active FROM jobs WHERE company_id=$1 ORDER BY id DESC LIMIT 20', [company.id]) };
});
// Los documentos privados solo los ve el administrador o un usuario de esa empresa.
app.get('/api/empresas/:id(\\d+)/documento', async (req, res, next) => {
  try {
    const [c] = await q('SELECT id,doc FROM companies WHERE id=$1', [req.params.id]);
    if (!c || !c.doc) throw fallo(404, 'La empresa no tiene un documento adjunto');
    if (!(req.user?.role === 'admin' || (req.user?.role === 'company' && req.user.companyId === c.id))) throw fallo(403, 'No tienes permiso para ver este documento');
    if (!/^[a-f0-9-]+\\.pdf$/i.test(c.doc)) throw fallo(404, 'Documento no disponible');
    try { await fs.access(path.join(documentosDir, c.doc)); } catch { throw fallo(404, 'El archivo no está disponible; solicita a la empresa que lo adjunte nuevamente'); }
    res.type('application/pdf').set('Content-Disposition', `inline; filename="documento-empresa-${c.id}.pdf"`).sendFile(path.join(documentosDir, c.doc));
  } catch (e) { if (e.status) res.status(e.status).json({ error: e.message }); else next(e); }
});
// El administrador puede reemplazar un nombre antiguo o un archivo que ya no esté disponible.
ruta('patch', '/empresas/:id(\\d+)/documento', ['admin'], async req => {
  const [empresa] = await q('SELECT id FROM companies WHERE id=$1', [req.params.id]);
  if (!empresa) throw fallo(404, 'Empresa no encontrada');
  const doc = await guardarPDF(req.body.doc);
  await q('UPDATE companies SET doc=$1 WHERE id=$2', [doc, empresa.id]);
});
ruta('get', '/lista/vacantes', ['admin'], req => paginar(req, 'jobs j JOIN companies c ON c.id=j.company_id', `($1='' OR j.title ILIKE '%'||$1||'%' OR c.name ILIKE '%'||$1||'%')`,
  [req.query.q || ''], 'j.id DESC', 'j.id, j.title, j.active, j.city, j.type, j.level, c.name AS company_name'));

// Detalle de UNA vacante (con su empresa y las últimas opiniones) y de UNA postulación
ruta('get', '/empleos/:id(\\d+)', null, async (req, u) => {
  const [job] = await rows(`SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.id=$1 AND (j.active OR $2 OR j.company_id=$3)`, [req.params.id, u?.role === 'admin', u?.companyId ?? null]);
  if (!job) throw fallo(404, 'Esa vacante no existe o ya no está disponible');
  const [company] = await rows(`SELECT c.*, ${PROM} FROM companies c WHERE c.id=$1`, [job.companyId]);
  return { job, company, reviews: await rows('SELECT * FROM reviews WHERE company_id=$1 ORDER BY id DESC LIMIT 10', [job.companyId]) };
});
ruta('get', '/postulaciones/:id(\\d+)', ['company'], async (req, u) => {
  const [a] = await rows(`SELECT a.*, u.name AS candidate_name, u.email AS candidate_email, u.phone AS candidate_phone, u.cv AS candidate_cv, j.title AS job_title
    FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.user_id WHERE a.id=$1 AND j.company_id=$2`, [req.params.id, u.companyId]);
  if (!a) throw fallo(404, 'Postulación no encontrada'); return a;
});

/* ---------- Sesión y registro ---------- */
ruta('post', '/login', null, async (req) => {
  const { email, password } = req.body, [u] = await q('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) throw fallo(401, 'Correo o clave incorrectos');
  if (!u.active) throw fallo(403, 'Tu cuenta está suspendida');
  if (u.role === 'company') { const [c] = await q('SELECT status, reject_reason FROM companies WHERE id=$1', [u.company_id]);
    if (c.status !== 'approved') throw fallo(403, c.status === 'pending' ? 'Tu empresa aún está en revisión del administrador' : 'Tu solicitud fue rechazada. Motivo: ' + (c.reject_reason || 'no indicado')); }
  req.session.uid = u.id; return { role: u.role };
});
ruta('post', '/logout', null, async (req) => { req.session = null; });
ruta('post', '/registro', null, async (req) => {
  const { name, email, password } = req.body; await libre(email);
  const [u] = await q(`INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'candidate') RETURNING id`, [name, email.toLowerCase(), await bcrypt.hash(password, 10)]);
  req.session.uid = u.id;
});
ruta('post', '/registro-empresa', null, async (req) => {
  const d = req.body; await libre(d.email);
  if (!NIT.test(d.nit)) throw fallo(400, 'El NIT debe tener el formato 0000-000000-000-0');
  if ((await q('SELECT 1 FROM companies WHERE nit=$1', [d.nit])).length) throw fallo(409, 'Ya existe una empresa con ese NIT');
  const doc = await guardarPDF(d.doc);
  const [c] = await q(`INSERT INTO companies(name,nit,sector,size,web,rep,phone,doc) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [d.name, d.nit, d.sector, d.size, d.web, d.rep, d.phone, doc]);
  await q(`INSERT INTO users(name,email,password_hash,role,company_id) VALUES($1,$2,$3,'company',$4)`, [d.rep, d.email.toLowerCase(), await bcrypt.hash(d.password, 10), c.id]);
});

/* ---------- Candidato ---------- */
ruta('patch', '/perfil', ['candidate'], (req, u) => q(`UPDATE users SET name=$1, phone=$2, cv=COALESCE(NULLIF($3,''),cv) WHERE id=$4`, [req.body.name, req.body.phone, req.body.cv, u.id]));
ruta('post', '/postulaciones', ['candidate'], async (req, u) => {
  if (!u.phone || !u.cv) throw fallo(403, 'Completa tu perfil (teléfono y CV) en «Mi perfil» antes de postularte');   // verificación del postulante
  const r = await q('INSERT INTO applications(job_id,user_id) SELECT id,$2 FROM jobs WHERE id=$1 AND active ON CONFLICT DO NOTHING RETURNING id', [req.body.jobId, u.id]);
  if (!r.length) throw fallo(409, 'Ya te postulaste a esta vacante (o ya no está disponible)');
});
ruta('post', '/alertas', ['candidate'], (req, u) => q('INSERT INTO alerts(user_id,text) VALUES($1,$2)', [u.id, req.body.text]));
ruta('patch', '/alertas/:id', ['candidate'], (req, u) => q('UPDATE alerts SET enabled = NOT enabled WHERE id=$1 AND user_id=$2', [req.params.id, u.id]));

/* ---------- Valoraciones (cualquier usuario con sesión) ---------- */
ruta('post', '/valoraciones', TODOS, async (req, u) => {
  const { companyId, stars, text } = req.body, w = await prohibida(text);
  if (w) await bloquear('Comentario: ' + text, w, u.name);
  await q('INSERT INTO reviews(company_id,stars,text,author) VALUES($1,$2,$3,$4)', [companyId, stars, text, u.name]);
});

/* ---------- Empresa ---------- */
ruta('patch', '/empresa', ['company'], async (req, u) => {
  const d = req.body; if (!NIT.test(d.nit)) throw fallo(400, 'El NIT debe tener el formato 0000-000000-000-0');
  await q('UPDATE companies SET nit=$1, sector=$2, web=$3, rep=$4, phone=$5 WHERE id=$6', [d.nit, d.sector, d.web, d.rep, d.phone, u.companyId]);
});
ruta('post', '/empleos', ['company'], async (req, u) => {
  const d = req.body; if (+d.salaryMin > +d.salaryMax) throw fallo(400, 'El salario mínimo no puede superar al máximo');
  const w = await prohibida(Object.values(d).join(' '));
  if (w) await bloquear('Vacante: ' + d.title, w, u.name);
  await q(`INSERT INTO jobs(company_id,title,city,type,level,salary_min,salary_max,description,requirements,benefits,contact) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [u.companyId, d.title, d.city, d.type, d.level, d.salaryMin, d.salaryMax, d.description, d.requirements, d.benefits, d.contact]);
});
// Pausar/activar y eliminar: la empresa solo toca SUS vacantes; el admin, cualquiera
ruta('patch', '/empleos/:id', ['company', 'admin'], (req, u) => q('UPDATE jobs SET active = NOT active WHERE id=$1 AND (company_id=$2 OR $3)', [req.params.id, u.companyId ?? null, u.role === 'admin']));
ruta('delete', '/empleos/:id', ['company', 'admin'], (req, u) => q('DELETE FROM jobs WHERE id=$1 AND (company_id=$2 OR $3)', [req.params.id, u.companyId ?? null, u.role === 'admin']));
ruta('patch', '/postulaciones/:id', ['company'], async (req, u) => {
  if (req.body.status !== undefined && ![0, 1, 2, 3, 4].includes(+req.body.status)) throw fallo(400, 'Estado no válido');
  await q(
  `UPDATE applications SET status=COALESCE($2,status), note=COALESCE($3,note) WHERE id=$1 AND job_id IN (SELECT id FROM jobs WHERE company_id=$4)`,
  [req.params.id, req.body.status ?? null, req.body.note ?? null, u.companyId]);
});

/* ---------- Administrador ---------- */
ruta('patch', '/empresas/:id', ['admin'], async (req) => {
  if (!['approved', 'rejected', 'pending'].includes(req.body.status)) throw fallo(400, 'Estado no válido');
  if (req.body.status === 'rejected' && !(req.body.reason || '').trim()) throw fallo(400, 'Indica el motivo del rechazo');
  await q('UPDATE companies SET status=$1, reject_reason=$2 WHERE id=$3', [req.body.status, req.body.status === 'rejected' ? req.body.reason.trim() : null, req.params.id]);
});
ruta('patch', '/usuarios/:id', ['admin'], (req) => q(`UPDATE users SET active = NOT active WHERE id=$1 AND role<>'admin'`, [req.params.id]));
ruta('post', '/palabras', ['admin'], (req) => q('INSERT INTO words(word) VALUES($1) ON CONFLICT DO NOTHING', [req.body.word.trim()]));
ruta('delete', '/palabras/:id', ['admin'], (req) => q('DELETE FROM words WHERE id=$1', [req.params.id]));
ruta('delete', '/bloqueados/:id', ['admin'], (req) => q('DELETE FROM flags WHERE id=$1', [req.params.id]));

app.listen(process.env.PORT || 3000, () => console.log(`rumbo listo en http://localhost:${process.env.PORT || 3000}`));
