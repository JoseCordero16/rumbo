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

## Requisitos de la evaluación → dónde están
| Requisito | Pantalla / ruta | Código principal |
|---|---|---|
| Landing page | `#/` | `Vistas.home` |
| Crear usuario | `#/acceso` (pestaña *Soy candidato*) | `Formularios.registro` → `POST /api/registro` |
| Crear empresa | `#/acceso` (pestaña *Soy empresa*; el admin la aprueba) | `Formularios.registroEmpresa` → `POST /api/registro-empresa` |
| Empresa crea oferta | `#/publicar` | `Formularios.publicar` → `POST /api/empleos` |
| Usuario busca empleos y ve detalle | `#/empleos` y `#/empleo/ID` | `Vistas.empleos`, `Vistas.empleo` |
| Usuario aplica a empleo | botón *Postularme ahora* | `Acciones.postular` → `POST /api/postulaciones` |
| Empresa ve aplicantes | `#/candidatos` y `#/candidato/ID` | `Vistas.candidatos`, `Vistas.candidato` |
| Empresa acepta o deniega | botones *Aceptar / Denegar* | `Acciones.estado` → `PATCH /api/postulaciones/:id` (status 3 o 4) |
| Empresa inactiva o elimina ofertas | `#/publicar` (tabla *Mis vacantes*) | `Acciones.pausar`, `Acciones.borrarEmpleo` |
| Dashboard de empresas | `#/panel` | `Vistas.panel` |
| Dashboard de usuarios | `#/tablero` | `Vistas.tablero` |
| Panel administrativo | `#/admin`, `#/usuarios`, `#/empresas`, `#/vacantes`, `#/moderacion` | `Vistas.admin` y siguientes |

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

## Cómo funciona (explicación para la exposición)
**Navegador (public/)**
1. *Una sola página (SPA):* `index.html` solo tiene `<div id="app">`; JavaScript pinta cada pantalla.
2. *Router por hash:* `#/empleo/3` → ruta `empleo`, parámetro `3`; `render()` llama a `Vistas.empleo(3)`.
3. En cada `render()`, `db.cargar()` pide `GET /api/datos` y guarda la respuesta; las vistas solo **leen** esa copia.
4. Los `<form data-form="x">` se validan con Bootstrap y llaman a `Formularios.x(datos)`; los `data-act="x"` llaman a `Acciones.x()`. Ambos usan `http()` para mandar la petición. Si el servidor responde error, se muestra con `aviso()`.

**Servidor (server/server.js)**
1. `ruta(método, url, roles, función)` registra cada endpoint y comprueba que el usuario tenga el rol permitido (403 si no).
2. *Sesión:* al hacer login se guarda el id del usuario en una **cookie firmada** (`cookie-session`); cada petición carga al usuario en `req.user`.
3. *Contraseñas:* se guardan como hash con **bcrypt**; nunca en texto plano ni se envían al navegador.
4. *Consultas SQL con parámetros* (`$1, $2`): así nadie puede inyectar SQL.
5. `GET /api/datos` decide **qué datos ve cada rol**: el visitante ve empleos activos y empresas aprobadas; el candidato, sus postulaciones; la empresa, las postulaciones a SUS vacantes; el admin, todo.
6. *Reglas del negocio en el servidor* (el navegador no es de fiar): palabras restringidas, empresa pendiente no puede entrar, una persona no se postula dos veces (`UNIQUE`), la empresa solo modifica sus vacantes.

**Endpoints principales:** `POST /login, /registro, /registro-empresa, /logout` · `GET /datos` · `POST /empleos, /postulaciones, /valoraciones, /alertas, /palabras` · `PATCH /perfil, /empresa, /empleos/:id, /postulaciones/:id, /empresas/:id, /usuarios/:id` · `DELETE /empleos/:id, /palabras/:id, /bloqueados/:id`.

## "Cámbiame esto" — dónde tocar
| Si te piden… | Haz esto |
|---|---|
| Cambiar el color principal | `public/css/styles.css`: `--acento` y `.btn-primary`. |
| Agregar una ciudad | `public/js/vistas.js`: arreglo `CIUDADES`. |
| Cambiar las etapas de postulación | `vistas.js`: `ETAPAS` (la posición es el número guardado en `applications.status`); en `schema.sql` el `CHECK (status BETWEEN 0 AND 4)`; en `server.js` la lista `[0,1,2,3,4]` de validación. |
| Agregar una palabra restringida | Panel admin → Moderación (o `INSERT INTO words` en `seed.js`). |
| Agregar un campo a un formulario | 1) columna nueva en `schema.sql` (y `npm run db:init`); 2) `campo(...)` en `vistas.js`; 3) incluirlo en el `INSERT/UPDATE` del endpoint en `server.js`. |
| Cambiar cuántos resultados salen por página | `server.js`, `paginar()`: `tam` por defecto (`|| 8`). |
| Cambiar cuántos empleos salen en inicio | `vistas.js`, `home`: `slice(0, 3)`. |
| Cambiar cuántos empleos trae la API | `public/js/api.js`: `limit=6`. |
| Cambiar los salarios del filtro | `vistas.js`: arreglo `[0, 800, 1000, 1500]`. |
| Agregar una pantalla nueva | función en `Vistas` + enlace `#/nombre` + (si es privada) agregarla a `ACCESO` en `app.js`. |
| Un nuevo permiso/endpoint | `server.js`: `ruta('post', '/algo', ['admin'], async (req, u) => {...})`. |
| Cambiar el puerto | `.env`: `PORT`. |

## Preguntas probables
- **¿Por qué hay un servidor? ¿No bastaba JavaScript?** El navegador no puede hablar de forma segura con PostgreSQL ni guardar claves; el servidor es el intermediario que valida permisos y ejecuta el SQL.
- **¿Qué es una API REST?** Un conjunto de URLs (`/api/empleos`) y métodos HTTP (GET leer, POST crear, PATCH modificar, DELETE borrar) que el navegador llama con `fetch` y que responden en JSON.
- **¿Qué es bcrypt?** Convierte la clave en un hash de un solo sentido; al entrar se compara el hash, no la clave.
- **¿Qué es la inyección SQL y cómo se evita?** Meter SQL malicioso en un campo. Se evita usando consultas parametrizadas (`$1`) en vez de concatenar texto.
- **¿Cómo se mantiene la sesión?** Cookie firmada con el id del usuario; el servidor la verifica en cada petición.
- **¿Por qué validar en el navegador Y en el servidor?** El navegador mejora la experiencia; el servidor es el que garantiza que nadie se salte las reglas.
- **¿Para qué `esc()`?** Convierte `< > "` en texto seguro y evita XSS (inyección de HTML/JS).
- **¿Qué hace `UNIQUE (job_id, user_id)`?** La base misma impide postularse dos veces a la misma vacante.
- **¿Qué es `ON DELETE CASCADE`?** Si se borra una vacante, se borran sus postulaciones.

## Limitaciones actuales (siguientes pasos)
Los PDF de registro de empresa se guardan en `server/private-documents/` y no se publican como archivos estáticos; solo los puede abrir la empresa propietaria y el administrador. La carpeta se excluye de Git. Los CV todavía guardan el nombre indicado por el candidato; no hay envío real de correos para las alertas. Antes de desplegar: cambia `SECRET`, usa HTTPS, limita intentos de login y considera almacenamiento de documentos externo.

## Entrega y exposición

- `docs/PRUEBAS_FUNCIONALES_INTEGRACION.md`: casos listos para ejecutar y completar con resultados reales.
- `docs/GUION_VIDEO_USUARIO.md`: recorrido sugerido para grabar el manual en video.
- `docs/INTEGRANTES.md`: plantilla para completar con los nombres del grupo.
- `docs/GIT_Y_EXPOSICION.md`: pasos para repositorio, commits individuales y recorrido de sustentación.

El detalle administrativo de empresa está en `#/empresas` → **Ver detalle**. Muestra datos legales, representante, estado, el PDF privado y la actividad de vacantes.
