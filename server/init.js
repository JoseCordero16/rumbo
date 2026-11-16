// Inicializa o actualiza el esquema sin eliminar los datos existentes.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('Esquema listo. Los datos existentes se conservaron.');
  } finally {
    await pool.end();
  }
})().catch(error => {
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exit(1);
});
