/* ==========================================================================
   teo-puerta.js — Entrada única de Sistema Teodoro
   v1.0 · Desarrollado por Jeison Maya · 2026

   Si no hay sesión de Supabase en este navegador, manda a la portada
   (index.html) para iniciar sesión y, al entrar, devuelve a esta página.

   USO: primera línea dentro de <head> de cada módulo:
     script src="teo-puerta.js?v=1"   (etiqueta script normal, sin async/defer)

   Notas:
   · Va antes que todo para que no se vea el módulo ni un instante sin sesión.
   · No interrumpe los enlaces de recuperación de contraseña de Supabase
     (llegan con #access_token / type=recovery / ?code=).
   · Esto ordena el acceso; la protección real de los datos la da Supabase (RLS).
   ========================================================================== */
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('sb-bmurdtfztsltcgwsfbgf-auth-token') || 'null');
    if (s && s.currentSession) s = s.currentSession;
    if (s && s.refresh_token) return;                       // hay sesión: seguir normal
    if (/type=recovery|access_token=|error_description=|[?&]code=/.test(location.hash + location.search)) return;
    var pag = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!/^[a-z0-9_]+\.html$/.test(pag) || pag === 'index.html') return;
    location.replace('index.html?volver=' + encodeURIComponent(pag));
  } catch (e) { /* sin almacenamiento: el módulo muestra su propio acceso */ }
})();
