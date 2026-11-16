/* stress.js · Agrega miles de registros para demostrar que el sistema escala.  Uso: npm run db:stress
   (primero corre npm run db:init si quieres partir de cero) */
require('dotenv').config();
const { Pool } = require('pg'), bcrypt = require('bcryptjs');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL }), q = (s, p) => pool.query(s, p), hash = await bcrypt.hash('1234', 4);
  console.time('carga');
  await q(`INSERT INTO users(name,email,password_hash,role,phone,cv) SELECT 'Candidato '||g,'cand'||g||'@demo.com',$1,'candidate','7000-'||g,'cv'||g||'.pdf' FROM generate_series(1,2000) g ON CONFLICT DO NOTHING`, [hash]);
  await q(`INSERT INTO jobs(company_id,title,city,type,level,salary_min,salary_max,description,requirements,benefits,contact)
           SELECT 1+(g%3), (array['Diseñador','Desarrollador','Analista','Soporte','Contador','Vendedor'])[1+g%6]||' '||g,
                  (array['San Salvador','Santa Tecla','Antiguo Cuscatlán','San Miguel'])[1+g%4], (array['Remoto','Híbrido','Presencial'])[1+g%3], (array['Junior','Semi-senior','Senior'])[1+g%3],
                  600+(g%10)*100, 900+(g%10)*150, 'Descripción '||g, 'Requisitos '||g, 'Beneficios '||g, 'rrhh@demo.com' FROM generate_series(1,3000) g`);
  await q(`INSERT INTO applications(job_id,user_id,status) SELECT (SELECT min(id) FROM jobs WHERE title LIKE '%1')+(g%2900), (SELECT min(id) FROM users WHERE email='cand1@demo.com')+(g%2000), g%5 FROM generate_series(1,6000) g ON CONFLICT DO NOTHING`);
  console.timeEnd('carga');
  console.log('✔ Listo: +2000 candidatos, +3000 vacantes y miles de postulaciones');
  await pool.end();
})().catch(e => { console.error('✖', e.message); process.exit(1); });
