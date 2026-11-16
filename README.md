# rumbo · Portal de Trabajo (versión con PostgreSQL)

Frontend: HTML + CSS + JavaScript + Bootstrap 5 · API pública: Remotive · Backend: Node.js + Express · Base de datos: PostgreSQL.

## Cómo ejecutarlo
1. Instala **Node.js** (v18+) y **PostgreSQL**. Usa tu base `rumbo` existente o crea una base vacía (pgAdmin o `psql -U postgres -c "CREATE DATABASE rumbo"`).
2. Copia `.env.example` como `.env` y pon tu clave de PostgreSQL en `DATABASE_URL`.
3. En la carpeta del proyecto:
```
npm install        # instala las dependencias
npm run db:init    # crea/actualiza el esquema; conserva los datos existentes
npm start          # inicia el servidor
```
4. Abre **http://localhost:3000** (ya no se abre con doble clic en el HTML: el sitio lo sirve el servidor).

`db:init` no borra tus datos. Para una demostración limpia, crea otra base vacía y ejecuta `npm run db:seed-demo`; el script se niega a insertar ejemplos si ya hay usuarios. Nunca ejecutes la carga de demostración sobre la base que quieres conservar.

Datos de demo (clave **1234**): `admin@rumbo.com` · `empresa@demo.com` (Tigo) · `ana@correo.com`, `carlos@correo.com`, `lucia@correo.com` (candidatos). Solo se insertan en una base vacía con `npm run db:seed-demo`.
Para demostrar que escala: `npm run db:stress` agrega **2,000 candidatos, 3,000 vacantes y miles de postulaciones** (entra como `empresa@demo.com` o `admin@rumbo.com` y mira cómo siguen respondiendo rápido).

**Cuentas demo:** `admin@rumbo.com` = administrador · `empresa@demo.com` = empresa (Tigo) · `ana@correo.com`, `carlos@correo.com`, `lucia@correo.com` = candidatos.

## ¿Y si en vez de 30 datos hubiera 3,000 (o 300,000)?
El navegador **nunca recibe todos los registros**. Lo que hace el sistema:
| Problema | Solución implementada |
|---|---|
| Listas enormes | **Paginación en el servidor**: `LIMIT 8 OFFSET …` (`paginar()` en `server.js`). Empleos, postulaciones, usuarios, empresas y vacantes se piden por páginas (`/api/lista/...`). |
| Búsquedas y filtros lentos | Se hacen **en la base de datos** (`WHERE … ILIKE`, ciudad, tipo, nivel, salario), no filtrando arreglos en JavaScript. |
| Consultas lentas | **Índices** en `schema.sql` (`idx_jobs_active_id`, `idx_jobs_company`, `idx_apps_user`, `idx_reviews_company`…). |
| Dashboards con miles de filas | Los totales los calcula PostgreSQL (`count(*) … GROUP BY status`); el navegador recibe solo los números. |
| Promedio de valoraciones | Calculado por la BD (`avg(stars)`), no sumando en el navegador. |
| `GET /api/datos` creciendo sin control | Solo manda lo necesario: sesión, métricas y unos pocos registros recientes (cada rol ve lo suyo). |
| Detalle de una vacante o postulación | Endpoints por id (`/api/empleos/:id`, `/api/postulaciones/:id`) en vez de cargar todo. |
Siguiente nivel (si creciera aún más): búsqueda de texto completo (`pg_trgm` / `tsvector`), paginación por cursor (`WHERE id < último`), caché, y subir CV/documentos a un almacenamiento de archivos.

## Pasos de verificación
- **Empresas:** (1) formulario con NIT validado (formato y único) y **documento de registro obligatorio**; (2) queda *En revisión* y no puede iniciar sesión; (3) el administrador revisa una **lista de verificación** (NIT, documento, representante) y **aprueba o rechaza con un motivo**; (4) si se rechaza, al intentar entrar ve el motivo.
- **Postulantes:** (1) registro con correo único y clave cifrada; (2) **para postularse debe completar su perfil** (teléfono y CV); (3) el administrador puede suspender cuentas.
- Pendiente para producción: verificación del correo con un enlace (requiere un servidor de correo).

## Navegación entre pantallas
Barra superior y pie de página en todas las pantallas · el logo vuelve al inicio · los indicadores (KPIs) de los dashboards son enlaces a sus listas · detalle de empleo ↔ resultados ↔ valoraciones · dashboard del candidato → perfil / solicitudes / buscar · dashboard de empresa → publicar / postulaciones → perfil del aplicante → vacante · panel admin → usuarios / empresas / vacantes / moderación.

## Estructura
| Archivo | Para qué sirve |
|---|---|
| `server/schema.sql` | Las 8 tablas de PostgreSQL: companies, users, jobs, applications, reviews, words, flags, alerts. |
| `server/init.js` | Crea o actualiza el esquema conservando los datos existentes. |
| `server/seed.js` | Carga datos de demostración solo cuando la base está vacía (claves con bcrypt). |
| `server/stress.js` | Carga miles de registros para probar el rendimiento (`npm run db:stress`). |
| `server/server.js` | Servidor Express: sirve el sitio y la API `/api/...`; valida permisos y reglas. |
| `public/index.html` | Página única; carga Bootstrap, los estilos y los 4 scripts en orden. |
| `public/css/styles.css` | ~20 líneas: cambia colores/variables de Bootstrap. |
| `public/js/db.js` | `http()` (fetch a nuestra API) y `db`: copia de los datos que el servidor deja ver a este usuario. |
| `public/js/api.js` | Consume la API pública de Remotive (empleos remotos). |
| `public/js/vistas.js` | El HTML de cada pantalla. |
| `public/js/app.js` | Router, formularios y botones (cada uno llama al servidor). |


**Servidor (server/server.js)**
1. `ruta(método, url, roles, función)` registra cada endpoint y comprueba que el usuario tenga el rol permitido (403 si no).
2. *Sesión:* al hacer login se guarda el id del usuario en una **cookie firmada** (`cookie-session`); cada petición carga al usuario en `req.user`.
3. *Contraseñas:* se guardan como hash con **bcrypt**; nunca en texto plano ni se envían al navegador.
4. *Consultas SQL con parámetros* (`$1, $2`): así nadie puede inyectar SQL.
5. `GET /api/datos` decide **qué datos ve cada rol**: el visitante ve empleos activos y empresas aprobadas; el candidato, sus postulaciones; la empresa, las postulaciones a SUS vacantes; el admin, todo.
6. *Reglas del negocio en el servidor* (el navegador no es de fiar): palabras restringidas, empresa pendiente no puede entrar, una persona no se postula dos veces (`UNIQUE`), la empresa solo modifica sus vacantes.

**Endpoints principales:** `POST /login, /registro, /registro-empresa, /logout` · `GET /datos` · `POST /empleos, /postulaciones, /valoraciones, /alertas, /palabras` · `PATCH /perfil, /empresa, /empleos/:id, /postulaciones/:id, /empresas/:id, /usuarios/:id` · `DELETE /empleos/:id, /palabras/:id, /bloqueados/:id`.

