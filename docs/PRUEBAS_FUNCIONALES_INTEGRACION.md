# Pruebas funcionales y de integración

**Proyecto:** rumbo · Portal de Trabajo  
**Versión:** 1.1  
**Fecha de ejecución:** [completar al probar en el equipo del grupo]  
**Base:** PostgreSQL `rumbo` (indicar si se usó una base de demostración)  
**Responsables:** [completar]

> Esta matriz define los casos para la ejecución y la defensa. Completen “Resultado observado” y “Estado” con evidencia de una ejecución real; no se deben marcar como aprobadas antes de probarlas en su entorno.

## Preparación

1. Configurar `DATABASE_URL` en `.env` y respaldar la base antes de la primera ejecución.
2. Ejecutar `npm run db:init` y `npm start`.
3. Para disponer de datos de demostración, usar una base vacía separada y ejecutar `npm run db:seed-demo`.
4. Anotar navegador, sistema operativo, versión de Node.js y PostgreSQL.

## Casos funcionales

| ID | Flujo | Pasos y datos | Resultado esperado | Resultado observado / evidencia | Estado |
|---|---|---|---|---|---|
| F-01 | Landing y navegación | Abrir `http://localhost:3000`; abrir Buscar empleo y volver al inicio con el logo. | Carga la portada, las vacantes disponibles y navegación sin error. | [Completar] | [Pendiente] |
| F-02 | Registro de candidato | Crear candidato con correo nuevo y contraseña válida; cerrar sesión e iniciar sesión. | La cuenta queda en rol candidato; la contraseña no se guarda en texto plano. | [Completar] | [Pendiente] |
| F-03 | Correo duplicado | Repetir registro con el correo anterior. | Se rechaza el registro con mensaje claro; no se duplica la cuenta. | [Completar] | [Pendiente] |
| F-04 | Registro de empresa y PDF | Enviar datos, NIT válido y PDF de hasta 5 MB. | Solicitud queda pendiente; archivo se guarda en directorio privado; la empresa no puede publicar antes de aprobación. | [Completar] | [Pendiente] |
| F-05 | Validación del documento | Enviar registro sin PDF, archivo no PDF o mayor a 5 MB. | Se rechaza y se explica la validación; no se crea una empresa aprobada. | [Completar] | [Pendiente] |
| F-06 | Revisión administrativa | Entrar como administrador, abrir Gestión de empresas y Ver detalle. Abrir PDF; aprobar una empresa pendiente. | La ficha muestra información legal y vacantes; solo admin/empresa propietaria abre el PDF; empresa aprobada puede iniciar sesión. | [Completar] | [Pendiente] |
| F-07 | Rechazo de empresa | Rechazar empresa indicando motivo e intentar iniciar sesión como ella. | Motivo obligatorio; la empresa ve la causa y no puede publicar. | [Completar] | [Pendiente] |
| F-08 | Crear oferta | Entrar como empresa aprobada, publicar vacante con salario y descripción. | Vacante aparece activa y disponible en la búsqueda. | [Completar] | [Pendiente] |
| F-09 | Buscar y ver detalle | Buscar por palabra, ubicación o modalidad; abrir una vacante. | Los resultados respetan filtros y el detalle muestra descripción, requisitos, empresa y contacto. | [Completar] | [Pendiente] |
| F-10 | Aplicar a empleo | Completar teléfono y CV en perfil; postularse a una vacante; intentar repetir. | Se crea una postulación; la segunda se rechaza por la restricción única. | [Completar] | [Pendiente] |
| F-11 | Ver y resolver postulaciones | Como empresa, abrir una postulación, avanzar estado a revisión/entrevista y aceptar o denegar. | La empresa ve datos del candidato y su vacante; el cambio se conserva y aparece en su panel. | [Completar] | [Pendiente] |
| F-12 | Pausar y eliminar vacante | Pausar y reactivar una oferta; eliminar otra oferta propia. | Estado cambia según acción; vacante eliminada y sus postulaciones dejan de estar disponibles. | [Completar] | [Pendiente] |
| F-13 | Dashboards por rol | Abrir panel candidato, empresa y administrador con cuentas respectivas. | Cada dashboard muestra métricas y accesos acordes al rol; no permite abrir rutas de otro rol. | [Completar] | [Pendiente] |
| F-14 | Gestión administrativa | Buscar usuarios, suspender/reactivar; filtrar empresas y vacantes; revisar moderación. | Filtros y acciones actualizan los datos; el administrador no se suspende desde la lista. | [Completar] | [Pendiente] |

## Integración y seguridad

| ID | Componente integrado | Procedimiento | Resultado esperado | Resultado observado / evidencia | Estado |
|---|---|---|---|---|---|
| I-01 | Navegador → Express → PostgreSQL | Crear una cuenta y confirmar su fila en `users`. | API persiste el registro; la clave queda como hash bcrypt. | [Completar] | [Pendiente] |
| I-02 | Sesión y autorización | Iniciar sesión, abrir panel del rol; cerrar sesión e intentar de nuevo una ruta protegida. | La cookie mantiene la sesión y el servidor rechaza la petición sin sesión/rol válido. | [Completar] | [Pendiente] |
| I-03 | Empresa → empleo → postulación | Crear vacante; postular candidato; revisar la fila de `applications`. | Relaciones `jobs`, `users` y `applications` quedan asociadas correctamente. | [Completar] | [Pendiente] |
| I-04 | Documento privado | Abrir URL de documento sin sesión, como otro rol, como admin y como empresa propietaria. | Sin autorización se recibe 403; admin y propietaria autorizada pueden ver el PDF. | [Completar] | [Pendiente] |
| I-05 | Inicialización conservadora | Antes de `npm run db:init`, registrar conteos; correr comando y volver a contarlos. | Se crean/actualizan tablas e índices; registros anteriores se conservan. | [Completar] | [Pendiente] |
| I-06 | Integridad referencial | Crear relaciones de vacante/postulación y eliminar una vacante de prueba. | PostgreSQL mantiene relaciones; cascada elimina postulaciones de esa vacante. | [Completar] | [Pendiente] |
| I-07 | Acceso a PostgreSQL | Detener PostgreSQL o configurar temporalmente URL inválida y cargar la app. | La interfaz informa que no pudo conectarse, sin exponer contraseña ni SQL. | [Completar] | [Pendiente] |

## Resumen de ejecución

- Casos ejecutados: [ ] / 21
- Aprobados: [ ] · Fallidos: [ ] · Bloqueados: [ ]
- Incidentes y pasos para reproducir: [completar]
- Evidencias (capturas o enlaces): [completar]
- Revisor y fecha: [completar]
