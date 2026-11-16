# Git, GitHub y defensa del proyecto

## Publicar el proyecto

1. Un integrante crea un repositorio vacío en GitHub, sin generar README ni licencia si el proyecto ya contiene esos archivos.
2. Desde la carpeta `rumbo` del proyecto, configura identidad y origen (reemplaza los valores):

```bash
git config user.name "Nombre Apellido"
git config user.email "correo-verificado@example.com"
git init
git add .
git status
git commit -m "chore: importar base del portal rumbo"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

3. Verifica en GitHub que aparecen `public/`, `server/`, `docs/`, `package.json` y README.
4. No subas `.env`, contraseñas, copias de bases de datos ni PDFs reales. `.gitignore` excluye `.env`, `node_modules/` y `server/private-documents/`.

## Aporte individual evaluable

- Cada integrante debe usar su cuenta personal verificada de GitHub.
- Trabajen en ramas cortas con nombres claros (`feat/detalle-empresa`, `fix/validacion-pdf`, `docs/pruebas-funcionales`).
- Hagan commits pequeños que describan el cambio: `feat: agregar ficha administrativa de empresa`.
- Abran pull request hacia `main`, describan qué cambia y cómo revisarlo; otra persona revisa antes de integrar.
- Eviten compartir una sola cuenta, hacer commits atribuidos a otra persona o concentrar todo el trabajo en un único commit final.
- Asegúrense de que el historial y los pull requests representen contribuciones reales. No fabriquen actividad para la evaluación.

## Guion de sustentación

1. Presentar problema, usuarios objetivo y propuesta de valor.
2. Recorrer los flujos del documento `GUION_VIDEO_USUARIO.md` en vivo.
3. Explicar la arquitectura: SPA en `public/`, API Express en `server/server.js`, PostgreSQL y consultas parametrizadas.
4. Mostrar roles y autorización del servidor; explicar hash bcrypt, sesión y acceso protegido a documentos.
5. Abrir una función sencilla y explicar cómo cambiarla. Ejemplo: añadir una opción de modalidad en `public/js/vistas.js` y comprobar dónde se procesa en backend.
6. Mostrar la matriz de pruebas completada con resultados verdaderos y el historial de contribuciones GitHub.

## Comandos de trabajo en equipo

```bash
git switch -c feat/nombre-del-cambio
git add ruta/del/archivo
git commit -m "feat: describir el cambio"
git push -u origin feat/nombre-del-cambio
```

Después creen el pull request en GitHub. Al empezar otra tarea, `git switch main` y `git pull` antes de crear una rama nueva.
