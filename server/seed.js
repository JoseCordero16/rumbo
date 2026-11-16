/* seed.js · Carga datos de demostración en una base vacía. Uso: npm run db:seed-demo */
require('dotenv').config();
const fs = require('fs'), path = require('path'), { Pool } = require('pg'), bcrypt = require('bcryptjs');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = (sql, p) => pool.query(sql, p);
  await q(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const [{ count }] = (await q('SELECT count(*)::int AS count FROM users')).rows;
  if (count > 0) throw new Error('La base ya contiene usuarios. No se insertaron datos de demo para protegerla. Usa una base vacía para npm run db:seed-demo.');

  const hash = await bcrypt.hash('1234', 10);   // todas las cuentas de ejemplo usan la clave 1234
  const empresas = [
    ['Tigo', '0614-010190-101-1', 'Telecomunicaciones', '501–1000', 'tigo.com.sv', 'María García', '2200-0000', 'approved'],
    ['Banco Agrícola', '0614-020280-102-2', 'Finanzas', '1000+', 'bancoagricola.com', 'Carlos Díaz', '2267-0000', 'approved'],
    ['Walmart', '0614-030375-103-3', 'Comercio', '1000+', 'walmart.com.sv', 'Ana Rivas', '2250-0000', 'approved'],
    ['Café Cuscatlán S.A.', '0614-250388-102-3', 'Alimentos', '51–200', 'cafecuscatlan.com', 'Luis Hernández', '2222-3333', 'pending'],
    ['DataSV', '0614-110291-105-5', 'Tecnología', '11–50', 'datasv.io', 'Rosa Campos', '7777-1212', 'pending']];
  for (const e of empresas) await q('INSERT INTO companies(name,nit,sector,size,web,rep,phone,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', e);

  await q(`INSERT INTO users(name,email,password_hash,role,company_id) VALUES
    ('Admin Rumbo','admin@rumbo.com',$1,'admin',NULL),('María García','empresa@demo.com',$1,'company',1),('Ana Martínez','ana@correo.com',$1,'candidate',NULL),
    ('Carlos Ruiz','carlos@correo.com',$1,'candidate',NULL),('Lucía Pérez','lucia@correo.com',$1,'candidate',NULL)`, [hash]);

  const empleos = [
    [1, 'Diseñador UX/UI', 'San Salvador', 'Híbrido', 'Semi-senior', 1100, 1500, 'Diseñar flujos y prototipos de apps móviles\nRealizar pruebas de usabilidad\nColaborar con desarrollo y producto', '2+ años en diseño de producto\nDominio de Figma\nPortafolio con casos reales', 'Seguro médico\nHome office 2 días\nBono anual', 'talento@tigo.com.sv'],
    [2, 'Desarrollador Frontend', 'Santa Tecla', 'Remoto', 'Junior', 900, 1300, 'Construir interfaces con HTML, CSS y JavaScript\nMantener componentes reutilizables', 'Conocimiento de JavaScript\nGit básico', 'Seguro médico\nCapacitaciones', 'rrhh@bancoagricola.com'],
    [3, 'Analista de datos', 'Antiguo Cuscatlán', 'Presencial', 'Semi-senior', 1000, 1400, 'Analizar ventas y comportamiento de clientes\nPreparar reportes semanales', 'SQL y Excel avanzado\nPower BI deseable', 'Descuentos\nBono por metas', 'empleos@walmart.com.sv'],
    [3, 'UX Researcher Jr.', 'Antiguo Cuscatlán', 'Presencial', 'Junior', 800, 1100, 'Entrevistar usuarios\nSintetizar hallazgos', 'Estudiante o egresado de diseño o psicología', 'Descuentos\nHorario flexible', 'empleos@walmart.com.sv'],
    [1, 'Soporte técnico', 'San Salvador', 'Presencial', 'Junior', 700, 950, 'Atender clientes por chat y teléfono\nResolver incidencias de primer nivel', 'Bachiller o estudiante universitario\nBuena comunicación', 'Seguro médico\nCapacitación', 'talento@tigo.com.sv']];
  for (const j of empleos) await q('INSERT INTO jobs(company_id,title,city,type,level,salary_min,salary_max,description,requirements,benefits,contact) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', j);

  await q(`UPDATE users SET phone='7000-0001', cv='cv-'||split_part(email,'@',1)||'.pdf' WHERE role='candidate'`);   // perfiles completos
  await q(`INSERT INTO applications(job_id,user_id,status) VALUES (1,3,1),(2,3,2),(1,4,0),(5,4,4),(1,5,3)`);
  await q(`INSERT INTO reviews(company_id,stars,text,author) VALUES
    (1,4,'Buen ambiente y aprendizaje constante.','Ex-empleado'),(1,5,'Los procesos de contratación son claros.','Candidato'),
    (2,4,'Buenas prestaciones y estabilidad.','Empleado'),(3,3,'Horarios exigentes pero buen equipo.','Ex-empleado')`);
  await q(`INSERT INTO words(word) VALUES ('estafa'),('dinero fácil'),('pago por adelantado'),('whatsapp')`);
  await q(`INSERT INTO alerts(user_id,text) VALUES (3,'Diseñador UI/UX (Remoto)')`);

  console.log('✔ Base de datos lista. Cuentas (clave 1234): admin@rumbo.com · empresa@demo.com · ana@correo.com · carlos@correo.com · lucia@correo.com');
  await pool.end();
})().catch(e => { console.error('✖ Error:', e.message); process.exit(1); });
