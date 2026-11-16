/* ============================================================
   db.js · Conexión con el servidor
   - http(): hace las peticiones a la API (fetch) y lanza error si falla.
   - db: guarda una COPIA de los datos que el servidor nos permite ver.
     render() la actualiza en cada pantalla (db.cargar) y las vistas la leen
     con db.all('jobs'), db.find(...), etc.  Las vistas no hablan con la BD.
   ============================================================ */
async function http(metodo, url, cuerpo) {
  let res;
  try {
    res = await fetch('/api' + url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
  } catch { throw new Error('No hay conexión con el servidor. ¿Ejecutaste "npm start"?'); }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || 'Error inesperado');
  return datos;
}

const db = {
  datos: { sesion: null, stats: {} },
  async cargar()     { this.datos = await http('GET', '/datos'); },   // trae todo lo que este usuario puede ver
  all(nombre)        { return this.datos[nombre] || []; },
  find(nombre, fn)   { return this.all(nombre).find(fn); },
  get sesion()       { return this.datos.sesion; },
  get stats()        { return this.datos.stats; }
};

// Estado de las listas paginadas (búsqueda, filtros y página actual de cada una)
const lst = {
  empleos:       { q: '', ciudad: '', tipo: '', nivel: '', salario: 0, pagina: 1 },
  postulaciones: { pagina: 1 },
  usuarios:      { q: '', rol: '', pagina: 1 },
  empresas:      { q: '', estado: '', pagina: 1 },
  vacantes:      { q: '', pagina: 1 }
};
// Pide al servidor UNA página de una lista (el servidor filtra, cuenta y recorta con SQL)
const pedir = tipo => http('GET', '/lista/' + tipo + '?' + new URLSearchParams(lst[tipo]));
