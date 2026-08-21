# MediDay — versión web (fase 1)

App de recordatorio de medicación: HTML + CSS + JS puro, sin dependencias, datos guardados en el navegador (localStorage).

## Publicarla en GitHub Pages

1. Ve a github.com y crea un repositorio nuevo llamado, por ejemplo, `mediday` (puede ser público).
2. Sube estos archivos a la raíz del repositorio (arrastrándolos en la web de GitHub o con `git push`):
   - `index.html`
   - `style.css`
   - `app.js`
   - `service-worker.js`
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
- **Notificaciones ya activas en esta fase web**, en Ajustes → Notificaciones. Al activar te pedirá permiso al navegador y, a partir de ahí, cada medicamento lanza un aviso real (con sonido/vibración del móvil) en su hora, mientras el navegador o la web instalada esté abierto o en segundo plano.
  ⚠️ Límite honesto: en la fase web, si Android mata del todo la pestaña/app (batería, mucho tiempo cerrada, móvil reiniciado), la notificación puede no saltar. Para que suene **siempre, pase lo que pase**, incluso con la app totalmente cerrada, hace falta la fase 2 (Capacitor + APK con alarmas del sistema Android). Para probar bien esta fase 1, conviene dejar la pestaña abierta o la app instalada abierta en segundo plano.
- Los datos se guardan solo en ese navegador/móvil. Si borra datos de navegación de Chrome, se perderían — esto se resuelve también en la fase APK.
