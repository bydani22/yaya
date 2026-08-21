# MediDay — versión web (fase 1)

App de recordatorio de medicación: HTML + CSS + JS puro, sin dependencias, datos guardados en el navegador (localStorage).

## Publicarla en GitHub Pages

1. Ve a github.com y crea un repositorio nuevo llamado, por ejemplo, `mediday` (puede ser público).
2. Sube estos 5 archivos a la raíz del repositorio (arrastrándolos en la web de GitHub o con `git push`):
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `icon.svg`
3. En el repositorio, ve a **Settings → Pages**.
4. En "Branch", elige `main` y la carpeta `/ (root)`, luego **Save**.
5. Espera 1-2 minutos. Tu web quedará en:
   `https://TU-USUARIO.github.io/mediday/`

## Probarla en el móvil de tu amigo

- Abrid ese enlace en **Chrome** en el móvil.
- Menú (⋮) → **Añadir a pantalla de inicio**. Se instalará como si fuera una app, con su icono.

## Notas

- Todo el diseño (colores, tipografías, textos) puede cambiarse: dime qué te gustaría ajustar y lo modificamos.
- Las notificaciones aunque la app esté cerrada **no funcionan todavía** en esta fase web — eso llega en la fase 2 (Capacitor + Android + APK), cuando el diseño esté cerrado.
- Los datos se guardan solo en ese navegador/móvil. Si borra datos de navegación de Chrome, se perderían — esto se resuelve también en la fase APK.
