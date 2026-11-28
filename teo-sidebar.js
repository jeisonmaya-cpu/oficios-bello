/* ==========================================================================
   teo-sidebar.js — Menú lateral unificado de Sistema Teodoro
   v1.1 · Desarrollado por Jeison Maya · 2026

   USO (una sola línea en cada módulo, justo antes del cierre del body):
     script src="teo-sidebar.js?v=1"   (etiqueta script normal)

   Opcional en <body>:
     data-teo-sidebar="off"     → no mostrar el menú en esa página
     data-teo-push="none"       → el menú no empuja el contenido (lo tapa)

   Comportamiento:
     · Colapsado (riel de íconos, 68px) ↔ Expandido (248px), animado.
     · Botón de fijar (chevron) guarda la preferencia en localStorage.
     · Estando colapsado, al pasar el mouse se "asoma" expandido encima del
       contenido sin moverlo; al salir se recoge.
     · Atajo: Ctrl + B  (fijar / soltar).
     · Móvil (<900px): oculto; botón ☰ flotante abre un cajón con fondo.
     · Respeta el tema: html.tema-claro (misma clave teodoro_tema).
   Sin dependencias externas (la red de la Alcaldía bloquea CDNs).
   ========================================================================== */
(function () {
  'use strict';
  if (window.__teoSidebar) return;
  window.__teoSidebar = true;

  /* ------------------------------------------------------------------------
     1. CONFIGURACIÓN — edite aquí para agregar, quitar o reordenar módulos
     ------------------------------------------------------------------------ */
  var MODULOS = [
    { grupo: null, items: [
      { id: 'inicio', nombre: 'Inicio', href: 'index.html', icono: 'home', alias: ['home.html', ''] }
    ]},
    { grupo: 'Gestión jurídica', items: [
      { id: 'tutelas',     nombre: 'Tutelas',          href: 'tutelas_v2.html',  icono: 'shield' },
      { id: 'peticiones',  nombre: 'Peticiones',       href: 'peticiones.html',  icono: 'inbox' },
      { id: 'desembargos', nombre: 'Desembargos',      href: 'desembargos.html', icono: 'unlock' },
      { id: 'oficios',     nombre: 'Central Jurídica', href: 'oficios.html',     icono: 'file' },
      { id: 'biblioteca',  nombre: 'Biblioteca',       href: 'biblioteca.html',  icono: 'book', alias: ['modelos.html'] }
    ]},
    { grupo: 'Cobro coactivo', items: [
      { id: 'expedientes',    nombre: 'Expedientes',    href: 'expedientes.html',    icono: 'folder' },
      { id: 'notificaciones', nombre: 'Notificaciones', href: 'notificaciones.html', icono: 'send' },
      { id: 'seguimiento',    nombre: 'Seguimiento',    href: 'seguimiento.html',    icono: 'chart' },
      { id: 'recaudo',        nombre: 'Recaudo',        href: 'recaudo.html',        icono: 'coins' },
      { id: 'acuerdos',       nombre: 'Acuerdos de pago', href: 'acuerdos.html',     icono: 'handshake' }
    ]},
    { grupo: 'Consulta', items: [
      { id: 'buscador', nombre: 'Buscador de guías', href: 'buscador.html', icono: 'search' }
    ]}
  ];

  var LS_ESTADO = 'teo_sidebar_v1';     // 'abierto' | 'cerrado'
  var LS_TEMA   = 'teodoro_tema';       // compartida con recaudo y demás
  var SUPA_REF  = 'bmurdtfztsltcgwsfbgf';
  var ANCHO_MIN = 68, ANCHO_MAX = 248, BP_MOVIL = 900;

  /* ------------------------------------------------------------------------
     2. ÍCONOS (SVG en línea, trazo 1.8, estilo lineal)
     ------------------------------------------------------------------------ */
  var P = {
    home:      '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    shield:    '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    inbox:     '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7Z"/>',
    unlock:    '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    file:      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    book:      '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M4 19.5A2 2 0 0 0 6 22h13"/>',
    folder:    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    send:      '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    chart:     '<path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 7v10M19 12v5"/>',
    coins:     '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
    handshake: '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2L15 11l-3 1.5-1.5-1.5L14 8l-2-1-6 3 6 6"/><path d="M2 9l4-2 M22 9l-4-2"/>',
    search:    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron:   '<path d="m15 18-6-6 6-6"/>',
    menu:      '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    x:         '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  function ico(n) {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>';
  }

  /* ------------------------------------------------------------------------
     3. ESTILOS (prefijo .tsb- para no chocar con los módulos)
     ------------------------------------------------------------------------ */
  var CSS = [
    ':root{--tsb-min:' + ANCHO_MIN + 'px;--tsb-max:' + ANCHO_MAX + 'px;--tsb-w:var(--tsb-min);',
    '--tsb-bg:rgba(10,31,61,.90);--tsb-borde:rgba(255,255,255,.07);--tsb-txt:#c9d2e3;--tsb-txt2:#7f8aa3;',
    '--tsb-hover:rgba(255,255,255,.06);--tsb-acento:#e8a020;--tsb-acento-bg:rgba(232,160,32,.14);',
    '--tsb-sombra:0 20px 50px -12px rgba(0,0,0,.6);--tsb-ease:cubic-bezier(.32,.72,0,1);}',
    'html.tema-claro{--tsb-bg:rgba(70,51,31,.97);--tsb-borde:rgba(255,255,255,.10);--tsb-txt:#f3ead8;--tsb-txt2:#cdb896;',
    '--tsb-hover:rgba(255,255,255,.08);--tsb-acento:#e8b04a;--tsb-acento-bg:rgba(232,176,74,.18);--tsb-sombra:0 20px 50px -12px rgba(70,51,31,.45);}',

    /* empuje del contenido */
    'body.tsb-on:not([data-teo-push="none"]){padding-left:var(--tsb-w)!important;transition:padding-left .45s var(--tsb-ease);}',
    'body.tsb-on.tsb-fijo{--tsb-w:var(--tsb-max);}',

    /* contenedor */
    '.tsb{position:fixed;top:0;left:0;bottom:0;z-index:9000;width:var(--tsb-min);display:flex;flex-direction:column;',
    'background:var(--tsb-bg);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);',
    'border-right:1px solid var(--tsb-borde);color:var(--tsb-txt);font-family:"DM Sans",system-ui,sans-serif;font-size:13.5px;',
    'transition:width .45s var(--tsb-ease),box-shadow .3s,transform .45s var(--tsb-ease);overflow:hidden;}',
    '.tsb.abierto{width:var(--tsb-max);}',
    '.tsb.asomado{box-shadow:var(--tsb-sombra);}',

    /* cabecera */
    '.tsb-cab{display:flex;align-items:center;gap:12px;height:64px;padding:0 16px;flex:none;border-bottom:1px solid var(--tsb-borde);}',
    '.tsb-logo{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;',
    'background:linear-gradient(135deg,#f59e0b,#d97706);color:#0a0f1e;font-family:"DM Serif Display",Georgia,serif;font-size:21px;',
    'box-shadow:0 4px 14px -4px rgba(245,158,11,.55);text-decoration:none;}',
    '.tsb-marca{display:flex;flex-direction:column;line-height:1.15;white-space:nowrap;}',
    '.tsb-marca b{font-family:"DM Serif Display",Georgia,serif;font-weight:400;font-size:17px;color:#fff;letter-spacing:.2px;}',
    '.tsb-marca small{font-size:10.5px;color:var(--tsb-txt2);letter-spacing:.4px;text-transform:uppercase;}',

    /* textos que se desvanecen al colapsar */
    '.tsb-fade{opacity:0;transform:translateX(-6px);transition:opacity .2s,transform .3s var(--tsb-ease);pointer-events:none;}',
    '.tsb.abierto .tsb-fade{opacity:1;transform:none;pointer-events:auto;transition-delay:.08s;}',

    /* buscador */
    '.tsb-busca{margin:12px 12px 4px;position:relative;flex:none;height:36px;}',
    '.tsb-busca input{width:100%;height:36px;box-sizing:border-box;border-radius:10px;border:1px solid var(--tsb-borde);',
    'background:rgba(255,255,255,.04);color:var(--tsb-txt);padding:0 10px 0 34px;font:inherit;font-size:13px;outline:none;transition:border-color .2s,background .2s;}',
    '.tsb-busca input::placeholder{color:var(--tsb-txt2);}',
    '.tsb-busca input:focus{border-color:var(--tsb-acento);background:rgba(255,255,255,.07);}',
    '.tsb-busca span{position:absolute;left:9px;top:9px;color:var(--tsb-txt2);display:flex;}',
    '.tsb-busca span svg{width:17px;height:17px;}',
    '.tsb:not(.abierto) .tsb-busca{height:0;margin:6px 12px 0;overflow:hidden;}',

    /* navegación */
    '.tsb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:6px 12px 12px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;}',
    '.tsb-grupo{margin-top:14px;}',
    '.tsb-grupo-t{height:18px;padding:0 10px;font-size:10.5px;font-weight:600;letter-spacing:.9px;text-transform:uppercase;color:var(--tsb-txt2);white-space:nowrap;position:relative;}',
    '.tsb-grupo-t::after{content:"";position:absolute;left:12px;right:12px;top:8px;height:1px;background:var(--tsb-borde);opacity:1;transition:opacity .2s;}',
    '.tsb.abierto .tsb-grupo-t::after{opacity:0;}',
    '.tsb-item{position:relative;display:flex;align-items:center;gap:14px;height:42px;padding:0 12px;margin:2px 0;border-radius:11px;',
    'color:var(--tsb-txt);text-decoration:none;white-space:nowrap;transition:background .18s,color .18s;}',
    '.tsb-item svg{flex:none;}',
    '.tsb-item:hover{background:var(--tsb-hover);color:#fff;}',
    '.tsb-item.activo{background:var(--tsb-acento-bg);color:var(--tsb-acento);font-weight:600;}',
    '.tsb-item.activo::before{content:"";position:absolute;left:-12px;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--tsb-acento);}',
    '.tsb-item.oculto{display:none;}',
    '.tsb-item:focus-visible,.tsb-btn:focus-visible{outline:2px solid var(--tsb-acento);outline-offset:-2px;}',
    '.tsb-vacio{display:none;padding:14px 10px;color:var(--tsb-txt2);font-size:12.5px;white-space:nowrap;}',

    /* tooltip (solo colapsado) */
    '.tsb-tip{position:fixed;z-index:9100;left:calc(var(--tsb-min) + 10px);padding:6px 10px;border-radius:8px;background:#111827;color:#fff;',
    'font:500 12.5px "DM Sans",system-ui,sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transform:translateX(-4px);',
    'transition:opacity .15s,transform .15s;box-shadow:0 8px 20px -6px rgba(0,0,0,.5);}',
    '.tsb-tip.ver{opacity:1;transform:none;}',

    /* pie */
    '.tsb-pie{flex:none;border-top:1px solid var(--tsb-borde);padding:10px 12px;}',
    '.tsb-fila{display:flex;align-items:center;gap:8px;}',
    '.tsb-btn{flex:none;width:44px;height:38px;border:0;border-radius:10px;background:transparent;color:var(--tsb-txt);display:grid;place-items:center;cursor:pointer;transition:background .18s,color .18s;}',
    '.tsb-btn:hover{background:var(--tsb-hover);color:#fff;}',
    '.tsb-btn .tsb-chev{transition:transform .45s var(--tsb-ease);display:flex;}',
    '.tsb:not(.abierto) .tsb-btn .tsb-chev,.tsb.asomado .tsb-btn .tsb-chev{transform:rotate(180deg);}',
    '.tsb-usuario{display:flex;align-items:center;gap:10px;margin-top:8px;padding:6px 3px;white-space:nowrap;}',
    '.tsb-avatar{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px;',
    'background:rgba(245,158,11,.16);color:var(--tsb-acento);border:1px solid rgba(245,158,11,.35);}',
    '.tsb-usuario div{min-width:0;}',
    '.tsb-usuario b{display:block;font-size:12.5px;color:#fff;font-weight:600;overflow:hidden;text-overflow:ellipsis;max-width:160px;}',
    '.tsb-usuario small{font-size:11px;color:var(--tsb-txt2);}',
    '.tsb-firma{margin-top:8px;font-size:10px;color:var(--tsb-txt2);white-space:nowrap;letter-spacing:.2px;padding-left:3px;}',
    '.tsb-firma b{color:var(--tsb-acento);font-weight:600;}',

    /* móvil */
    '.tsb-ham{display:none;position:fixed;left:12px;top:12px;z-index:8990;width:42px;height:42px;border-radius:12px;border:1px solid var(--tsb-borde);',
    'background:var(--tsb-bg);backdrop-filter:blur(14px);color:var(--tsb-txt);place-items:center;cursor:pointer;box-shadow:var(--tsb-sombra);}',
    '.tsb-velo{position:fixed;inset:0;z-index:8995;background:rgba(5,8,18,.55);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .3s;}',
    '@media (max-width:' + (BP_MOVIL - 1) + 'px){',
    '  body.tsb-on:not([data-teo-push="none"]){padding-left:0!important;}',
    '  .tsb{width:var(--tsb-max);transform:translateX(-105%);}',
    '  .tsb .tsb-fade{opacity:1;transform:none;pointer-events:auto;}',
    '  .tsb .tsb-busca{height:36px;margin:12px 12px 4px;}',
    '  .tsb.movil-abierto{transform:none;box-shadow:var(--tsb-sombra);}',
    '  .tsb-ham{display:grid;}',
    '  .tsb-velo.ver{opacity:1;pointer-events:auto;}',
    '  .tsb-fijar{display:none!important;}',
    '}',
    '@media (prefers-reduced-motion:reduce){.tsb,.tsb *,body.tsb-on{transition:none!important;}}',
    '@media print{.tsb,.tsb-ham,.tsb-velo,.tsb-tip{display:none!important;}body.tsb-on{padding-left:0!important;}}'
  ].join('\n');

  /* ------------------------------------------------------------------------
     4. UTILIDADES
     ------------------------------------------------------------------------ */
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sinTildes(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esMovil() { return window.matchMedia('(max-width:' + (BP_MOVIL - 1) + 'px)').matches; }

  function paginaActual() {
    var f = location.pathname.split('/').pop().toLowerCase();
    return f;
  }
  function esActivo(it, pag) {
    if (it.href.toLowerCase() === pag) return true;
    return (it.alias || []).indexOf(pag) !== -1;
  }

  /* Usuario desde la sesión de Supabase Auth guardada por los módulos */
  function usuarioSesion() {
    try {
      var raw = localStorage.getItem('sb-' + SUPA_REF + '-auth-token');
      if (!raw) return null;
      var o = JSON.parse(raw);
      var u = (o && (o.user || (o.currentSession && o.currentSession.user))) || null;
      if (!u) return null;
      var meta = u.user_metadata || {};
      return { correo: u.email || '', nombre: meta.nombre || meta.full_name || meta.name || '' };
    } catch (e) { return null; }
  }
  function iniciales(txt) {
    var p = String(txt).replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }

  /* ------------------------------------------------------------------------
     5. CONSTRUCCIÓN
     ------------------------------------------------------------------------ */
  function construir() {
    var body = document.body;
    if (!body || body.getAttribute('data-teo-sidebar') === 'off') return;

    var st = document.createElement('style');
    st.id = 'tsb-css';
    st.textContent = CSS;
    document.head.appendChild(st);

    var pag = paginaActual();
    var navHTML = '';
    MODULOS.forEach(function (g) {
      navHTML += '<div class="tsb-grupo">';
      if (g.grupo) navHTML += '<div class="tsb-grupo-t"><span class="tsb-fade">' + esc(g.grupo) + '</span></div>';
      g.items.forEach(function (it) {
        var act = esActivo(it, pag);
        navHTML += '<a class="tsb-item' + (act ? ' activo' : '') + '" href="' + esc(it.href) + '" data-nombre="' + esc(it.nombre) + '"' +
          (act ? ' aria-current="page"' : '') + '>' + ico(it.icono) + '<span class="tsb-fade">' + esc(it.nombre) + '</span></a>';
      });
      navHTML += '</div>';
    });

    var u = usuarioSesion();
    var nombreU = u ? (u.nombre || u.correo.replace(/@.*/, '')) : 'Sin sesión';
    var usuarioHTML = '<div class="tsb-usuario" title="' + esc(u ? u.correo : '') + '">' +
      '<span class="tsb-avatar">' + esc(u ? iniciales(u.nombre || u.correo) : '·') + '</span>' +
      '<div class="tsb-fade"><b>' + esc(nombreU) + '</b><small>' + esc(u ? u.correo : 'Inicie sesión en el módulo') + '</small></div></div>';

    var aside = document.createElement('aside');
    aside.className = 'tsb';
    aside.setAttribute('aria-label', 'Módulos de Sistema Teodoro');
    aside.innerHTML =
      '<div class="tsb-cab">' +
        '<a class="tsb-logo" href="index.html" title="Inicio">T</a>' +
        '<div class="tsb-marca tsb-fade"><b>Teodoro</b><small>Ejecuciones Fiscales</small></div>' +
      '</div>' +
      '<div class="tsb-busca"><span>' + ico('search') + '</span>' +
        '<input type="search" placeholder="Buscar módulo…" aria-label="Buscar módulo" class="tsb-fade"></div>' +
      '<nav class="tsb-nav">' + navHTML + '<div class="tsb-vacio">Sin coincidencias</div></nav>' +
      '<div class="tsb-pie">' +
        '<div class="tsb-fila">' +
          '<button class="tsb-btn tsb-fijar" type="button" title="Fijar / contraer menú (Ctrl+B)"><span class="tsb-chev">' + ico('chevron') + '</span></button>' +
          '<button class="tsb-btn tsb-tema" type="button" title="Cambiar tema claro / oscuro"></button>' +
          '<button class="tsb-btn tsb-cerrar-m" type="button" title="Cerrar menú" style="display:none">' + ico('x') + '</button>' +
        '</div>' +
        usuarioHTML +
        '<div class="tsb-firma tsb-fade">Desarrollado por <b>Jeison Maya</b> · 2026</div>' +
      '</div>';

    var ham = document.createElement('button');
    ham.className = 'tsb-ham'; ham.type = 'button'; ham.title = 'Abrir menú'; ham.innerHTML = ico('menu');
    var velo = document.createElement('div'); velo.className = 'tsb-velo';
    var tip = document.createElement('div'); tip.className = 'tsb-tip';

    body.appendChild(velo);
    body.appendChild(aside);
    body.appendChild(ham);
    body.appendChild(tip);
    body.classList.add('tsb-on');

    /* --- estado fijo / colapsado --- */
    var fijo = ls(LS_ESTADO) === 'abierto';
    function aplicarFijo() {
      aside.classList.toggle('abierto', fijo);
      aside.classList.remove('asomado');
      body.classList.toggle('tsb-fijo', fijo);
    }
    aplicarFijo();
    function alternarFijo() {
      fijo = !fijo; ls(LS_ESTADO, fijo ? 'abierto' : 'cerrado'); aplicarFijo();
      ocultarTip();
      /* avisar a los módulos (gráficos Chart.js, tablas) para que se reajusten */
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 470);
    }
    aside.querySelector('.tsb-fijar').addEventListener('click', alternarFijo);

    /* --- asomarse con el mouse cuando está colapsado --- */
    var tAsoma = null, tRecoge = null;
    aside.addEventListener('mouseenter', function () {
      if (fijo || esMovil()) return;
      clearTimeout(tRecoge);
      tAsoma = setTimeout(function () { aside.classList.add('abierto', 'asomado'); ocultarTip(); }, 260);
    });
    aside.addEventListener('mouseleave', function () {
      clearTimeout(tAsoma);
      if (fijo || esMovil()) return;
      if (document.activeElement === buscador) return; // no recoger mientras escribe
      tRecoge = setTimeout(function () { aside.classList.remove('abierto', 'asomado'); }, 180);
    });

    /* --- tooltips en modo riel --- */
    function ocultarTip() { tip.classList.remove('ver'); }
    aside.querySelectorAll('.tsb-item').forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        if (aside.classList.contains('abierto') || esMovil()) return;
        var r = a.getBoundingClientRect();
        tip.textContent = a.getAttribute('data-nombre');
        tip.style.top = (r.top + r.height / 2 - 14) + 'px';
        tip.classList.add('ver');
      });
      a.addEventListener('mouseleave', ocultarTip);
    });

    /* --- buscador --- */
    var buscador = aside.querySelector('.tsb-busca input');
    var vacio = aside.querySelector('.tsb-vacio');
    buscador.addEventListener('input', function () {
      var q = sinTildes(buscador.value.trim());
      var n = 0;
      aside.querySelectorAll('.tsb-grupo').forEach(function (g) {
        var vis = 0;
        g.querySelectorAll('.tsb-item').forEach(function (a) {
          var ok = !q || sinTildes(a.getAttribute('data-nombre')).indexOf(q) !== -1;
          a.classList.toggle('oculto', !ok); if (ok) vis++;
        });
        g.style.display = vis ? '' : 'none'; n += vis;
      });
      vacio.style.display = n ? 'none' : 'block';
    });
    buscador.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var p = aside.querySelector('.tsb-item:not(.oculto)'); if (p) location.href = p.getAttribute('href'); }
      if (e.key === 'Escape') { buscador.value = ''; buscador.dispatchEvent(new Event('input')); buscador.blur(); }
    });
    buscador.addEventListener('blur', function () {
      if (!fijo && !esMovil() && !aside.matches(':hover')) aside.classList.remove('abierto', 'asomado');
    });

    /* --- tema --- */
    var btnTema = aside.querySelector('.tsb-tema');
    function pintarTema() {
      var claro = document.documentElement.classList.contains('tema-claro');
      btnTema.innerHTML = ico(claro ? 'moon' : 'sun');
    }
    var temaGuardado = ls(LS_TEMA);
    var soloOscuro = document.documentElement.hasAttribute('data-teo-solo-oscuro');
    if (soloOscuro) { btnTema.style.display = 'none'; document.documentElement.classList.remove('tema-claro'); }
    else if (temaGuardado === 'claro') document.documentElement.classList.add('tema-claro');
    pintarTema();
    btnTema.addEventListener('click', function () {
      var claro = document.documentElement.classList.toggle('tema-claro');
      ls(LS_TEMA, claro ? 'claro' : 'oscuro');
      ls('app_tema', claro ? 'light' : 'dark'); ls('tutelas_tema', claro ? 'light' : 'dark');
      pintarTema();
      window.dispatchEvent(new CustomEvent('teo-tema', { detail: { claro: claro } }));
    });
    /* si el módulo cambia el tema con su propio botón, sincronizar el ícono */
    new MutationObserver(pintarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    /* --- móvil --- */
    var btnCerrarM = aside.querySelector('.tsb-cerrar-m');
    function abrirMovil() { aside.classList.add('movil-abierto'); velo.classList.add('ver'); btnCerrarM.style.display = ''; }
    function cerrarMovil() { aside.classList.remove('movil-abierto'); velo.classList.remove('ver'); btnCerrarM.style.display = 'none'; }
    ham.addEventListener('click', abrirMovil);
    velo.addEventListener('click', cerrarMovil);
    btnCerrarM.addEventListener('click', cerrarMovil);

    /* --- teclado --- */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        if (esMovil()) { aside.classList.contains('movil-abierto') ? cerrarMovil() : abrirMovil(); }
        else alternarFijo();
      }
      if (e.key === 'Escape' && aside.classList.contains('movil-abierto')) cerrarMovil();
    });

    /* API mínima para los módulos */
    window.TeoSidebar = {
      fijar: function (v) { if (!!v !== fijo) alternarFijo(); },
      estaFijo: function () { return fijo; },
      ancho: function () { return esMovil() ? 0 : (fijo ? ANCHO_MAX : ANCHO_MIN); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', construir);
  else construir();
})();
