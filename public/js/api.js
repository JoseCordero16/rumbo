/* ============================================================
   api.js · Consumo de una API pública (Remotive: empleos remotos)
   Usamos fetch (GET). Si la API falla o no hay internet devolvemos
   una lista vacía y el sitio sigue funcionando con los empleos locales.
   ============================================================ */
const Api = {
  cache: {},   // guarda los empleos externos para poder abrir su detalle sin volver a pedirlos

  async empleosRemotos(texto = '') {
    try {
      const url = 'https://remotive.com/api/remote-jobs?limit=6' + (texto ? '&search=' + encodeURIComponent(texto) : '');
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });   // máximo 4 segundos
      const datos = await res.json();
      // Convertimos cada empleo externo al MISMO formato que usan los empleos locales
      return datos.jobs.map(j => {
        const empleo = {
          id: 'r' + j.id, external: true, title: j.title, companyName: j.company_name,
          city: 'Remoto', type: 'Remoto', level: '—', salaryText: j.salary || 'No indicado',
          date: j.publication_date.slice(0, 10), url: j.url,
          // La descripción viene en HTML: la pasamos a texto plano y la acortamos
          description: new DOMParser().parseFromString(j.description, 'text/html').body.textContent.slice(0, 600) + '…'
        };
        this.cache[empleo.id] = empleo;
        return empleo;
      });
    } catch (e) { return []; }
  }
};
