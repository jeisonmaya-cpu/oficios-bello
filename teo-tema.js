/* ==========================================================================
   teo-tema.js — Una sola preferencia de modo claro / oscuro en Teodoro
   v1.0 · Desarrollado por Jeison Maya · 2026

   Antes cada módulo guardaba el tema en su propia clave (app_tema,
   tutelas_tema, teodoro_tema), así que elegir modo claro en uno no se
   respetaba en los otros. Este archivo:
     1. Lee la preferencia (clave principal: app_tema = 'light' | 'dark').
     2. La copia a las claves viejas, para que cada módulo, al arrancar con su
        propio código, lea lo mismo.
     3. Aplica las dos convenciones que usan los módulos:
          html[data-theme="light"]   (portada, Tutelas, Desembargos)
          html.tema-claro            (Recaudo, menú lateral)
   Los botones de tema de cada módulo siguen funcionando igual; además
   escriben app_tema, así que la elección vale para todo Teodoro.

   USO (en el <head>, antes de cualquier otro script del módulo):
     script src="teo-tema.js?v=1"

   Un módulo sin modo claro todavía se marca <html data-teo-solo-oscuro>:
   ahí no se aplica el claro (pero la preferencia se conserva para los demás).
   ========================================================================== */
(function () {
  'use strict';
  var html = document.documentElement;

  function leer() {
    try {
      var a = localStorage.getItem('app_tema');
      if (a === 'light' || a === 'dark') return a;
      var t = localStorage.getItem('tutelas_tema');
      if (t === 'light' || t === 'dark') return t;
      var r = localStorage.getItem('teodoro_tema');
      if (r === 'claro') return 'light';
      if (r === 'oscuro') return 'dark';
    } catch (e) { /* sin almacenamiento */ }
    return 'dark';
  }

  function guardar(t) {
    try {
      localStorage.setItem('app_tema', t);
      localStorage.setItem('tutelas_tema', t);
      localStorage.setItem('teodoro_tema', t === 'light' ? 'claro' : 'oscuro');
    } catch (e) { /* sin almacenamiento */ }
  }

  function aplicar(t) {
    if (html.hasAttribute('data-teo-solo-oscuro')) t = 'dark';
    if (t === 'light') { html.setAttribute('data-theme', 'light'); html.classList.add('tema-claro'); }
    else { if (html.getAttribute('data-theme') === 'light') html.removeAttribute('data-theme'); html.classList.remove('tema-claro'); }
  }

  var actual = leer();
  guardar(actual);
  aplicar(actual);

  // Si otra pestaña cambia el tema, esta se entera al volver a cargar;
  // la página abierta no se repinta sola para no redibujar gráficos a medias.
  window.TeoTema = {
    actual: function () { return leer(); },
    poner: function (t) { t = (t === 'light') ? 'light' : 'dark'; guardar(t); aplicar(t); }
  };
})();
