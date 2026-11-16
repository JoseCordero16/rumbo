-- ============================================================
-- schema.sql · Estructura de la base de datos (PostgreSQL)
-- Inicializa o actualiza el esquema sin eliminar datos existentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  nit     TEXT NOT NULL UNIQUE,
  sector  TEXT, size TEXT, web TEXT, rep TEXT, phone TEXT,
  doc     TEXT NOT NULL DEFAULT '',                      -- nombre del documento de registro que adjuntó la empresa
  reject_reason TEXT,                                    -- motivo cuando el administrador la rechaza
  status  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS doc TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                       -- NUNCA guardamos la clave en texto plano
  role          TEXT NOT NULL CHECK (role IN ('candidate','company','admin')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  phone         TEXT NOT NULL DEFAULT '',
  cv            TEXT NOT NULL DEFAULT '',
  company_id    INT REFERENCES companies(id)         -- solo para usuarios de tipo empresa
);

CREATE TABLE IF NOT EXISTS jobs (
  id           SERIAL PRIMARY KEY,
  company_id   INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        TEXT NOT NULL, city TEXT, type TEXT, level TEXT,
  salary_min   INT, salary_max INT,
  description  TEXT, requirements TEXT, benefits TEXT, contact TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS applications (                           -- postulaciones
  id       SERIAL PRIMARY KEY,
  job_id   INT NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status   INT NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 4),   -- 0 Enviada, 1 En revisión, 2 Entrevista, 3 Aceptado, 4 Denegado
  note     TEXT NOT NULL DEFAULT '',
  date     DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (job_id, user_id)                            -- una persona no se postula dos veces
);

CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  company_id  INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stars       INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text        TEXT NOT NULL, author TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS words  (id SERIAL PRIMARY KEY, word TEXT NOT NULL UNIQUE);                       -- palabras restringidas
CREATE TABLE IF NOT EXISTS flags  (id SERIAL PRIMARY KEY, text TEXT NOT NULL, word TEXT NOT NULL, by_name TEXT);  -- contenido bloqueado
CREATE TABLE IF NOT EXISTS alerts (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE);

-- Índices: hacen que las búsquedas sigan siendo rápidas aunque haya miles de registros
CREATE INDEX IF NOT EXISTS idx_jobs_active_id    ON jobs(active, id DESC);   -- listado de empleos activos (más recientes primero)
CREATE INDEX IF NOT EXISTS idx_jobs_company      ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city         ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_apps_user         ON applications(user_id);   -- (job_id, user_id) ya tiene índice por el UNIQUE
CREATE INDEX IF NOT EXISTS idx_reviews_company   ON reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_companies_status  ON companies(status);
