/* ==========================================================================
   teo-modulos.js — Lista oficial de módulos de Sistema Teodoro
   v1.0 · Desarrollado por Jeison Maya · 2026

   Una sola lista para todos los menús: el menú lateral común (teo-sidebar.js),
   la sección «Sistema Teodoro» de Tutelas y la de Peticiones. Para agregar,
   quitar, renombrar o reordenar un módulo, se cambia AQUÍ y se ve en todos.
   (Pensado también para cuando cada municipio tenga sus propios módulos activos.)

   Mismo orden y grupos que la portada.
   alias: otras páginas que pertenecen al módulo (para marcarlo como activo).

   USO: en el <head>, antes de los demás scripts del módulo:
     script src="teo-modulos.js?v=1"
   ========================================================================== */
(function () {
  'use strict';

  window.TEO_MODULOS = [
    { grupo: null, items: [
      { id: 'inicio', nombre: 'Inicio', href: 'index.html', icono: 'home', alias: ['home.html', ''] }
    ]},
    { grupo: 'Cartera y cobro', items: [
      { id: 'expedientes', nombre: 'Expedientes', href: 'expedientes.html', icono: 'folder' },
      { id: 'seguimiento', nombre: 'Seguimiento', href: 'seguimiento.html', icono: 'chart' },
      { id: 'recaudo',     nombre: 'Recaudo',     href: 'recaudo.html',     icono: 'coins' }
    ]},
    { grupo: 'Actuaciones', items: [
      { id: 'desembargos',    nombre: 'Embargos',       href: 'desembargos.html',    icono: 'unlock' },
      { id: 'notificaciones', nombre: 'Notificaciones', href: 'notificaciones.html', icono: 'send',
        alias: ['buscador.html', 'con_correo.html', 'certificado.html', 'predial.html'] }
    ]},
    { grupo: 'Atención al ciudadano', items: [
      { id: 'tutelas',    nombre: 'Tutelas',    href: 'tutelas_v2.html', icono: 'shield' },
      { id: 'peticiones', nombre: 'Peticiones', href: 'peticiones.html', icono: 'inbox' }
    ]},
    { grupo: 'Consulta', items: [
      { id: 'biblioteca', nombre: 'Biblioteca', href: 'biblioteca.html', icono: 'book', alias: ['modelos.html'] }
    ]}
  ];

  /* Íconos de línea (los mismos del menú lateral común) */
  var P = {
    home:   '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    inbox:  '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7Z"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    book:   '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M4 19.5A2 2 0 0 0 6 22h13"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    send:   '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    chart:  '<path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 7v10M19 12v5"/>',
    coins:  '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>'
  };

  window.TEO = window.TEO || {};
  /* Ícono SVG de un módulo. clase: la que use el menú del módulo (ej. 'ico'). */
  window.TEO.icono = function (nombre, clase, tam) {
    tam = tam || 18;
    return '<svg' + (clase ? ' class="' + clase + '"' : '') + ' viewBox="0 0 24 24" width="' + tam + '" height="' + tam +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (P[nombre] || '') + '</svg>';
  };
  /* Lista plana, sin el módulo actual (para las secciones «Sistema Teodoro»). */
  window.TEO.otrosModulos = function (idActual) {
    var r = [];
    window.TEO_MODULOS.forEach(function (g) {
      g.items.forEach(function (it) { if (it.id !== idActual) r.push(it); });
    });
    return r;
  };
})();
