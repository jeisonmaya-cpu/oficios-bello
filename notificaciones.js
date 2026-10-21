/* =====================================================================
   TEODORO · NOTIFICACIONES · v1
   - Sesión con Supabase Auth (mismas cuentas de tutelas)
   - Consulta por año de notificación, renta y lote
   - Montar lote: Excel + PDF → verificación página por persona → Supabase
   - Un PDF por lote en Google Drive; cada notificación sabe su página
   - Oficio individual: se extrae del PDF del lote solo cuando se necesita
   ===================================================================== */
'use strict';

/* =========================================================
   Configuración
   ========================================================= */
var CFG = {
  SUPA_URL: 'https://bmurdtfztsltcgwsfbgf.supabase.co',
  SUPA_KEY: 'PEGAR_AQUI_LA_PUBLISHABLE_KEY',
  SESION_KEY: 'notificaciones_sesion_v1',
  SESION_HORAS: 8,
  POR_PAGINA: 50,
  LOTE_INSERT: 500,
  LIBS: ['lib/xlsx.full.min.js', 'lib/pdf-lib.min.js', 'lib/pdf.min.js'],
  PDF_WORKER: 'lib/pdf.worker.min.js',
  PDF_CMAPS: 'lib/cmaps/'
};

var RENTAS = {
  transito: { nombre: 'Tránsito', color: 'var(--c-transito)' },
  predial:  { nombre: 'Predial',  color: 'var(--c-predial)' },
  ica:      { nombre: 'ICA',      color: 'var(--c-ica)' },
  ou:       { nombre: 'Obligaciones Urbanísticas', corto: 'OU', color: 'var(--c-ou)' }
};
var RENTA_IDS = ['transito', 'predial', 'ica', 'ou'];

var MEDIOS = {
  correo:     { nombre: 'Correo electrónico',    corto: 'Correo' },
  mensajeria: { nombre: 'Empresa de mensajería', corto: 'Mensajería' },
  web:        { nombre: 'Publicación web',       corto: 'Web' }
};

var ICONOS = {
  correo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  mensajeria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>'
};

var ALERTAS_FILTRO = {
  correo:     { nombre: 'Correos de riesgo',              filtro: 'alerta_correo=not.is.null' },
  registro:   { nombre: 'Registros incompletos',          filtro: 'alerta_registro=not.is.null' },
  sin_pdf:    { nombre: 'Lote sin PDF en Drive',           filtro: 'notif_lotes.drive_pdf_id=is.null' },
  sin_pagina: { nombre: 'Sin página en el PDF',            filtro: 'pagina_inicio=is.null&notif_lotes.archivo_pdf=not.is.null' },
  sin_guia:   { nombre: 'Mensajería sin número de guía',   filtro: 'guia=is.null&notif_lotes.medio=eq.mensajeria' }
};

/* =========================================================
   Utilidades
   ========================================================= */
var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
function fmt(n) { return Number(n || 0).toLocaleString('es-CO'); }
function pesos(n) { return '$ ' + Math.round(Number(n || 0)).toLocaleString('es-CO'); }
function pesosCorto(n) {
  n = Number(n || 0);
  if (n >= 1e9) return '$ ' + (n / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' mil M';
  if (n >= 1e6) return '$ ' + (n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
  return pesos(n);
}
function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 : 0; }
function pctTxt(p) { return String(p).replace('.', ',') + ' %'; }
function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
function aFecha(iso) { if (!iso) return null; var p = String(iso).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fFecha(d) { if (!d) return ''; if (typeof d === 'string') d = aFecha(d); return pad(d.getDate(), 2) + '/' + pad(d.getMonth() + 1, 2) + '/' + d.getFullYear(); }
function addDias(d, n) { var r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; }
// Días hábiles sin festivos: el cálculo es aproximado y así se indica en pantalla.
function addHabiles(d, n) { var r = new Date(d.getTime()); while (n > 0) { r = addDias(r, 1); var w = r.getDay(); if (w !== 0 && w !== 6) n--; } return r; }
function hoy() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function diasEntre(a, b) { return Math.round((b - a) / 864e5); }
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
function renta(id) { return RENTAS[id] || { nombre: id, color: 'var(--gold)' }; }
function rentaCorta(id) { var r = renta(id); return r.corto || r.nombre; }
function driveArchivo(id, pagina) { return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view' + (pagina ? '#page=' + pagina : ''); }
function idArchivoDrive(txt) {
  txt = String(txt || '').trim();
  var m = txt.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) || txt.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return m[1];
  if (/\/folders\//.test(txt)) return null;
  return /^[A-Za-z0-9_-]{10,}$/.test(txt) ? txt : null;
}

var _toastT = null;
function toast(msg, tipo) {
  var t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (tipo ? ' ' + tipo : '');
  clearTimeout(_toastT);
  _toastT = setTimeout(function () { t.className = 'toast'; }, tipo === 'bad' ? 7000 : 4000);
}

/* Término para pagar o proponer excepciones (aproximado, sin festivos).
   Criterio prudente: si hubo publicación web, se cuenta desde ella para todos,
   porque no se sabe quién recibió el correo. Si no, desde el envío + 5 días. */
function terminoLote(l) {
  var base, desde;
  if (l.publicado_web && l.fecha_publicacion_web) { base = aFecha(l.fecha_publicacion_web); desde = 'la publicación web'; }
  else if (l.medio === 'correo' && l.fecha_envio) { base = addDias(aFecha(l.fecha_envio), 5); desde = 'el envío más 5 días'; }
  else return null;
  var vence = addHabiles(base, 15);
  var d = diasEntre(hoy(), vence);
  var t = d < 0 ? 'mute' : (d <= 10 ? 'warn' : 'info');
  var txt = d < 0 ? 'Vencido' : (d === 0 ? 'Vence hoy' : 'Faltan ' + d + ' días');
  return { vence: vence, desde: desde, dias: d, t: t, txt: txt };
}

/* =========================================================
   Sesión (Supabase Auth por REST)
   ========================================================= */
var Auth = {
  leer: function () { try { return JSON.parse(localStorage.getItem(CFG.SESION_KEY)); } catch (e) { return null; } },
  guardar: function (s) { try { localStorage.setItem(CFG.SESION_KEY, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } },
  email: function () { var s = this.leer(); return s ? s.email : ''; },
  vigente: function () { var s = this.leer(); return !!(s && s.access_token && Date.now() - s.inicio < CFG.SESION_HORAS * 36e5); },
  login: function (email, pass) {
    var self = this;
    return fetch(CFG.SUPA_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: CFG.SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error_description || j.msg || 'Correo o contraseña incorrectos.');
        var s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || email, inicio: Date.now() };
        self.guardar(s);
        return s;
      });
    });
  },
  refrescar: function () {
    var self = this, s = this.leer();
    if (!s || !s.refresh_token) return Promise.reject(new Error('SIN_SESION'));
    return fetch(CFG.SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: CFG.SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error('SIN_SESION');
        s.access_token = j.access_token; s.refresh_token = j.refresh_token;
        s.expires_at = Date.now() + (j.expires_in || 3600) * 1000;
        self.guardar(s);
        return s;
      });
    });
  },
  headers: function () {
    var self = this, s = this.leer();
    if (!this.vigente()) { return Promise.reject(new Error('SIN_SESION')); }
    var p = (s.expires_at - 60000 < Date.now()) ? this.refrescar() : Promise.resolve(s);
    return p.then(function (ss) { return { apikey: CFG.SUPA_KEY, Authorization: 'Bearer ' + ss.access_token }; });
  },
  salir: function () { try { localStorage.removeItem(CFG.SESION_KEY); } catch (e) { /* nada */ } }
};

/* =========================================================
   Acceso a Supabase (REST)
   ========================================================= */
function supaFetch(path, opt) {
  opt = opt || {};
  return Auth.headers().then(function (h) {
    var headers = Object.assign({}, h, opt.headers || {});
    if (opt.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opt.range) {
      headers['Range-Unit'] = 'items';
      headers.Range = opt.range[0] + '-' + opt.range[1];
      headers.Prefer = (headers.Prefer ? headers.Prefer + ',' : '') + 'count=exact';
    }
    return fetch(CFG.SUPA_URL + '/rest/v1/' + path, {
      method: opt.method || 'GET',
      headers: headers,
      body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined
    });
  }).then(function (r) {
    return r.text().then(function (txt) {
      var data = null;
      if (txt) { try { data = JSON.parse(txt); } catch (e) { data = txt; } }
      if (r.status === 401) { sesionVencida(); throw new Error('La sesión expiró. Ingresa de nuevo.'); }
      if (!r.ok) { throw new Error((data && (data.message || data.hint)) || ('Error ' + r.status + ' al consultar Supabase.')); }
      var total = null, cr = r.headers.get('Content-Range');
      if (cr && cr.indexOf('/') > -1) { var t = cr.split('/')[1]; if (t && t !== '*') total = +t; }
      return { data: data, total: total };
    });
  }).catch(function (err) {
    if (err && err.message === 'SIN_SESION') { sesionVencida(); throw new Error('La sesión expiró. Ingresa de nuevo.'); }
    throw err;
  });
}

/* Trae todas las filas en páginas de 1000 (Supabase corta en 1000 sin avisar).
   El path debe traer un order con desempate único. */
function supaFetchAll(path) {
  var todo = [], paso = 1000;
  function pagina(desde) {
    return supaFetch(path, { range: [desde, desde + paso - 1] }).then(function (r) {
      var filas = r.data || [];
      todo = todo.concat(filas);
      if (filas.length === paso) return pagina(desde + paso);
      return todo;
    });
  }
  return pagina(0);
}

/* =========================================================
   Estado
   ========================================================= */
var S = {
  anio: null, renta: 'todas', vista: 'resumen',
  resumen: [],          // filas de v_notif_anio_renta
  lotes: [],            // filas de v_notif_lotes del año
  actos: [],            // página actual de notificaciones
  total: 0, pagina: 1,
  f: { q: '', lote: '', alerta: '' }
};

/* =========================================================
   Carga de datos
   ========================================================= */
function cargarResumen() {
  return supaFetchAll('v_notif_anio_renta?select=*&order=anio_envio.desc,renta.asc,medio.asc').then(function (d) { S.resumen = d; });
}
function cargarLotes() {
  if (!S.anio) { S.lotes = []; return Promise.resolve(); }
  var q = 'v_notif_lotes?select=*&anio_envio=eq.' + S.anio + (S.renta !== 'todas' ? '&renta=eq.' + S.renta : '') + '&order=fecha_envio.desc,id.desc';
  return supaFetchAll(q).then(function (d) { S.lotes = d; });
}
function aniosDisponibles() {
  var a = [];
  S.resumen.forEach(function (r) { if (a.indexOf(r.anio_envio) < 0) a.push(r.anio_envio); });
  return a.sort(function (x, y) { return y - x; });
}
function resumenFiltrado(anio) {
  return S.resumen.filter(function (r) { return r.anio_envio === anio && (S.renta === 'todas' || r.renta === S.renta); });
}
function sumar(filas, campo) { var s = 0; filas.forEach(function (r) { s += Number(r[campo] || 0); }); return s; }

function recargarTodo() {
  return cargarResumen().then(function () {
    var anios = aniosDisponibles();
    if (!S.anio || anios.indexOf(S.anio) < 0) S.anio = anios.length ? anios[0] : hoy().getFullYear();
    return cargarLotes();
  }).then(renderTodo).catch(function (e) { toast(e.message, 'bad'); });
}

/* =========================================================
   Render: estructura
   ========================================================= */
function renderAnios() {
  var anios = aniosDisponibles(), max = 0, conteo = {};
  anios.forEach(function (y) {
    var f = resumenFiltrado(y);
    conteo[y] = { n: sumar(f, 'n'), riesgo: sumar(f, 'alertas_correo') + sumar(f, 'alertas_registro') };
    if (conteo[y].n > max) max = conteo[y].n;
  });
  var h = '<div class="years-title">Año de notificación</div>';
  if (!anios.length) h += '<div class="year-empty">Aún no hay lotes montados.</div>';
  anios.forEach(function (y) {
    var c = conteo[y];
    h += '<button type="button" class="year' + (y === S.anio ? ' active' : '') + '" data-anio="' + y + '" aria-pressed="' + (y === S.anio) + '">' +
      '<div class="year-num">' + y + '</div>' +
      '<div class="year-meta">' + fmt(c.n) + ' notificaciones</div>' +
      (c.riesgo ? '<div class="year-risk">' + fmt(c.riesgo) + ' con alertas</div>' : '') +
      '<div class="year-track"><div class="year-fill" style="width:' + pct(c.n, max) + '%"></div></div></button>';
  });
  $('years').innerHTML = h;
}

function renderHero() {
  var f = resumenFiltrado(S.anio);
  var n = sumar(f, 'n'), riesgo = sumar(f, 'alertas_correo') + sumar(f, 'alertas_registro'), sinArch = sumar(f, 'sin_archivo');
  $('heroYear').textContent = S.anio;
  $('heroSub').textContent = 'Notificaciones agrupadas por el año en que se enviaron. ' +
    (S.renta === 'todas' ? 'Todas las rentas.' : 'Renta: ' + renta(S.renta).nombre + '.');
  $('kpis').innerHTML =
    '<div class="kpi"><b>' + fmt(n) + '</b><small>Notificaciones</small></div>' +
    '<div class="kpi"><b>' + pesosCorto(sumar(f, 'valor')) + '</b><small>Valor notificado</small></div>' +
    '<div class="kpi"><b>' + fmt(sumar(f, 'lotes')) + '</b><small>Lotes</small></div>' +
    '<div class="kpi warn"><b>' + fmt(riesgo) + '</b><small>Con alertas</small></div>' +
    '<div class="kpi' + (sinArch ? ' warn' : ' ok') + '"><b>' + fmt(sinArch) + '</b><small>En lotes sin PDF en Drive</small></div>';

  var delAnio = S.resumen.filter(function (r) { return r.anio_envio === S.anio; });
  var h = '<button type="button" class="renta' + (S.renta === 'todas' ? ' active' : '') + '" data-renta="todas" style="--cc:var(--gold)"><i></i>Todas <b>' + fmt(sumar(delAnio, 'n')) + '</b></button>';
  RENTA_IDS.forEach(function (id) {
    var k = sumar(delAnio.filter(function (r) { return r.renta === id; }), 'n');
    h += '<button type="button" class="renta' + (S.renta === id ? ' active' : '') + '" data-renta="' + id + '" style="--cc:' + renta(id).color + '" title="' + esc(renta(id).nombre) + '"><i></i>' + esc(rentaCorta(id)) + ' <b>' + fmt(k) + '</b></button>';
  });
  $('rentas').innerHTML = h;
}

function renderTabs() {
  var tabs = [['resumen', 'Resumen'], ['lotes', 'Lotes'], ['notificaciones', 'Notificaciones'], ['montar', 'Montar lote']];
  $('tabs').innerHTML = tabs.map(function (t) {
    return '<button type="button" class="tab' + (S.vista === t[0] ? ' active' : '') + (t[0] === 'montar' ? ' cta' : '') + '" data-vista="' + t[0] + '" aria-pressed="' + (S.vista === t[0]) + '">' + t[1] + '</button>';
  }).join('');
}

function renderVista() {
  var v = $('vista');
  if (S.vista === 'resumen') v.innerHTML = vistaResumen();
  else if (S.vista === 'lotes') v.innerHTML = vistaLotes();
  else if (S.vista === 'notificaciones') { v.innerHTML = vistaNotificaciones(); buscarActos(); }
  else { v.innerHTML = vistaMontar(); pintarMontar(); }
}
function renderTodo() { renderAnios(); renderHero(); renderTabs(); renderVista(); }

/* =========================================================
   Vista: Resumen
   ========================================================= */
function vistaResumen() {
  var f = resumenFiltrado(S.anio), n = sumar(f, 'n');
  if (!n) {
    return '<section class="panel"><div class="empty"><h3>No hay notificaciones en ' + S.anio + '</h3>' +
      '<p>Monta el primer lote con el Excel y el PDF de oficios.</p>' +
      '<button class="btn btn-gold" type="button" data-vista="montar">Montar lote</button></div></section>';
  }
  var nCorreo = sumar(f.filter(function (r) { return r.medio === 'correo'; }), 'n');
  var nMsj = sumar(f.filter(function (r) { return r.medio === 'mensajeria'; }), 'n');
  var nWeb = sumar(f, 'publicadas_web') + sumar(f.filter(function (r) { return r.medio === 'web'; }), 'n');

  var h = '<section class="panel"><div class="panel-head"><h3>Medios de notificación</h3><p>Una misma notificación puede contar en correo y en publicación web.</p></div><div class="medios">';
  h += medioCard('correo', nCorreo, pctTxt(pct(nCorreo, n)) + ' de las notificaciones', false);
  h += medioCard('web', nWeb, pctTxt(pct(nWeb, n)) + ' publicadas en el portal', false);
  h += medioCard('mensajeria', nMsj, nMsj ? pctTxt(pct(nMsj, n)) + ' de las notificaciones' : 'Sin contrato vigente', !nMsj);
  h += '</div><div class="note">Los rebotes de correo todavía no se registran. Mientras tanto, el término se calcula desde la publicación web cuando el lote fue publicado.</div></section>';

  var aC = sumar(f, 'alertas_correo'), aR = sumar(f, 'alertas_registro'), sA = sumar(f, 'sin_archivo'), sP = sumar(f, 'sin_pagina'), sG = sumar(f, 'sin_guia');
  h += '<section class="panel"><div class="panel-head"><h3>Calidad de los datos</h3><p>Toca una fila para ver esas notificaciones. Porcentajes sobre ' + fmt(n) + ' notificaciones.</p></div><div class="bars">' +
    barRow('correo', 'Correos de riesgo', aC, n, 'var(--warn)') +
    barRow('registro', 'Registros incompletos', aR, n, 'var(--bad)') +
    barRow('sin_pagina', 'Sin página en el PDF', sP, n, 'var(--bad)') +
    barRow('sin_pdf', 'En lotes sin PDF en Drive', sA, n, 'var(--info)') +
    (sG ? barRow('sin_guia', 'Mensajería sin número de guía', sG, n, 'var(--warn)') : '') +
    '</div></section>';

  var conT = S.lotes.map(function (l) { return { l: l, t: terminoLote(l) }; }).filter(function (x) { return x.t; });
  conT.sort(function (a, b) { return a.t.vence - b.t.vence; });
  h += '<section class="panel"><div class="panel-head"><h3>Términos por lote</h3><p>Quince días hábiles para pagar o proponer excepciones. Cálculo aproximado, sin festivos.</p></div>';
  if (!conT.length) h += '<div class="empty">No hay lotes en este filtro.</div>';
  else {
    h += '<div class="table-wrap"><table class="data" style="min-width:720px"><thead><tr><th>Lote</th><th>Renta</th><th class="num">Notificaciones</th><th>Se cuenta desde</th><th>Vence</th><th>Estado</th></tr></thead><tbody>';
    conT.forEach(function (x) {
      h += '<tr data-lote="' + x.l.id + '"><td><b>Lote ' + esc(x.l.numero) + '</b></td><td><span class="dot" style="background:' + renta(x.l.renta).color + '"></span>' + esc(rentaCorta(x.l.renta)) + '</td>' +
        '<td class="num">' + fmt(x.l.n) + '</td><td>' + esc(x.t.desde) + '</td><td class="mono">' + fFecha(x.t.vence) + '</td><td><span class="estado ' + x.t.t + '">' + x.t.txt + '</span></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  return h + '</section>';
}
function medioCard(id, num, sub, inactivo) {
  return '<div class="medio' + (inactivo ? ' inactivo' : '') + '"><div class="medio-top"><div class="ico">' + ICONOS[id] + '</div><div><div class="medio-name">' + MEDIOS[id].nombre + '</div></div></div>' +
    '<div class="medio-num">' + fmt(num) + '</div><div class="medio-eff">' + esc(sub) + '</div></div>';
}
function barRow(alerta, label, v, total, color) {
  var p = pct(v, total);
  return '<button type="button" class="bar-row" data-ver-alerta="' + alerta + '"><span>' + label + '</span><div class="track"><div class="fill" style="width:' + p + '%;background:' + color + '"></div></div><span class="v">' + fmt(v) + ' (' + pctTxt(p) + ')</span></button>';
}

/* =========================================================
   Vista: Lotes
   ========================================================= */
function vistaLotes() {
  if (!S.lotes.length) {
    return '<section class="panel"><div class="empty"><h3>No hay lotes en este filtro</h3><button class="btn btn-gold" type="button" data-vista="montar">Montar lote</button></div></section>';
  }
  var h = '<section class="panel"><div class="panel-head"><h3>Lotes de ' + S.anio + '</h3><p>Toca un lote para ver su detalle y enlazar su PDF en Drive.</p></div>' +
    '<div class="table-wrap"><table class="data"><thead><tr><th>Lote</th><th>Renta</th><th>Medio</th><th>Mandamiento o masivo</th><th>Enviado</th><th>Publicación web</th><th class="num">Notificaciones</th><th class="num">Valor</th><th>PDF en Drive</th><th class="num">Alertas</th></tr></thead><tbody>';
  S.lotes.forEach(function (l) {
    h += '<tr data-lote="' + l.id + '">' +
      '<td><b>Lote ' + esc(l.numero) + '</b>' + (l.vigencia ? '<div class="sub">Vigencia ' + esc(l.vigencia) + '</div>' : '') + '</td>' +
      '<td><span class="dot" style="background:' + renta(l.renta).color + '"></span>' + esc(rentaCorta(l.renta)) + (l.concepto ? '<div class="sub">' + esc(l.concepto) + '</div>' : '') + '</td>' +
      '<td>' + esc(MEDIOS[l.medio] ? MEDIOS[l.medio].corto : l.medio) + '</td>' +
      '<td>' + esc(l.mandamiento || '') + (l.fecha_mandamiento ? '<div class="sub">' + fFecha(l.fecha_mandamiento) + '</div>' : '') + '</td>' +
      '<td class="mono">' + fFecha(l.fecha_envio) + (l.fecha_envio_aproximada ? '<div class="sub">aproximada</div>' : '') + '</td>' +
      '<td>' + (l.publicado_web ? '<span class="estado ok">' + fFecha(l.fecha_publicacion_web) + '</span>' : '<span class="estado mute">No</span>') + '</td>' +
      '<td class="num">' + fmt(l.n) + '</td><td class="num">' + pesosCorto(l.valor) + '</td>' +
      '<td>' + (!l.archivo_pdf ? '<span class="estado mute">Sin PDF</span>' : (l.drive_pdf_id ? '<span class="estado ok">Cargado</span>' : '<span class="estado warn">Pendiente</span>')) + '</td>' +
      '<td class="num">' + (Number(l.alertas_correo) + Number(l.alertas_registro) ? '<span class="estado warn">' + fmt(Number(l.alertas_correo) + Number(l.alertas_registro)) + '</span>' : '<span class="sub">0</span>') + '</td></tr>';
  });
  return h + '</tbody></table></div></section>';
}

/* =========================================================
   Vista: Notificaciones (búsqueda en el servidor)
   ========================================================= */
function vistaNotificaciones() {
  var opL = '<option value="">Todos los lotes</option>';
  S.lotes.forEach(function (l) { opL += '<option value="' + l.id + '"' + (String(S.f.lote) === String(l.id) ? ' selected' : '') + '>Lote ' + esc(l.numero) + ', ' + esc(rentaCorta(l.renta)) + '</option>'; });
  var opA = '<option value="">Sin filtro de alerta</option>';
  Object.keys(ALERTAS_FILTRO).forEach(function (k) { opA += '<option value="' + k + '"' + (S.f.alerta === k ? ' selected' : '') + '>' + ALERTAS_FILTRO[k].nombre + '</option>'; });
  return '<section class="panel"><div class="panel-head"><h3>Notificaciones de ' + S.anio + '</h3><p>Busca por radicado, documento, nombre, correo, guía o número de comparendo o resolución.</p></div>' +
    '<div class="toolbar"><input class="input" id="q" type="search" value="' + esc(S.f.q) + '" placeholder="Radicado, guía, documento, nombre, correo o comparendo">' +
    '<select class="select" id="fLote" aria-label="Lote">' + opL + '</select>' +
    '<select class="select" id="fAlerta" aria-label="Alerta">' + opA + '</select></div>' +
    '<div class="table-wrap"><table class="data" id="tablaActos"><tbody><tr><td><div class="cargando">Consultando…</div></td></tr></tbody></table></div>' +
    '<div class="pager" id="pager"></div></section>';
}

var _busqueda = 0;
function buscarActos() {
  if (!$('tablaActos')) return;
  var id = ++_busqueda;
  var sel = 'radicado,consecutivo,documento,nombre,email,alerta_correo,alerta_registro,referencias,n_referencias,valor_capital,intereses,total,detalle,verificacion,pagina_inicio,paginas,estado_correo,guia,direccion,ciudad,lote_id,' +
    'notif_lotes!inner(id,numero,renta,medio,vigencia,mandamiento,fecha_mandamiento,fecha_envio,fecha_envio_aproximada,anio_envio,concepto,publicado_web,fecha_publicacion_web,url_publicacion_web,drive_pdf_id,archivo_pdf)';
  var q = 'notif_actos?select=' + encodeURIComponent(sel) + '&notif_lotes.anio_envio=eq.' + S.anio;
  if (S.renta !== 'todas') q += '&notif_lotes.renta=eq.' + S.renta;
  if (S.f.lote) q += '&lote_id=eq.' + encodeURIComponent(S.f.lote);
  if (S.f.alerta && ALERTAS_FILTRO[S.f.alerta]) q += '&' + ALERTAS_FILTRO[S.f.alerta].filtro;
  var t = S.f.q.replace(/[^\p{L}\p{N}@._\- ]/gu, '').trim();
  if (t) {
    var c = '*' + t + '*';
    q += '&or=' + encodeURIComponent('(radicado.ilike.' + c + ',documento.ilike.' + c + ',nombre.ilike.' + c + ',email.ilike.' + c + ',referencias.ilike.' + c + ',guia.ilike.' + c + ')');
  }
  q += '&order=radicado.asc';
  var ini = (S.pagina - 1) * CFG.POR_PAGINA;
  supaFetch(q, { range: [ini, ini + CFG.POR_PAGINA - 1] }).then(function (r) {
    if (id !== _busqueda) return;
    S.actos = r.data || []; S.total = r.total || 0;
    pintarActos();
  }).catch(function (e) {
    if (id !== _busqueda) return;
    $('tablaActos').innerHTML = '<tbody><tr><td><div class="empty">' + esc(e.message) + '</div></td></tr></tbody>';
  });
}

function pintarActos() {
  var h = '<thead><tr><th>Radicado / guía</th><th>Notificado</th><th>Correo o dirección</th><th>Referencias</th><th class="num">Total</th><th>Lote</th><th>Oficio</th><th>Alertas</th></tr></thead><tbody>';
  if (!S.actos.length) h += '<tr><td colspan="8"><div class="empty">No hay notificaciones con estos filtros.</div></td></tr>';
  S.actos.forEach(function (a, i) {
    var l = a.notif_lotes || {};
    var al = [];
    if (a.alerta_correo) al.push('<span class="estado warn">' + esc(a.alerta_correo) + '</span>');
    if (a.alerta_registro) al.push('<span class="estado bad">' + esc(a.alerta_registro) + '</span>');
    h += '<tr data-acto="' + i + '" tabindex="0">' +
      '<td class="mono">' + esc(a.radicado) + (a.guia ? '<div class="sub">Guía ' + esc(a.guia) + '</div>' : '') + '</td>' +
      '<td>' + esc(a.nombre) + '<div class="sub">' + esc(a.documento || 'Sin documento') + '</div></td>' +
      '<td>' + (a.email ? esc(a.email) : esc(a.direccion || '') + (a.ciudad ? '<div class="sub">' + esc(a.ciudad) + '</div>' : '')) + '</td>' +
      '<td>' + esc(a.referencias || '') + '</td>' +
      '<td class="num">' + pesos(a.total) + '</td>' +
      '<td><span class="dot" style="background:' + renta(l.renta).color + '"></span>Lote ' + esc(l.numero) + '</td>' +
      '<td>' + (!l.archivo_pdf ? '<span class="estado mute">Sin PDF</span>' : (a.pagina_inicio ? '<span class="estado ' + (l.drive_pdf_id ? 'ok' : 'mute') + '">Pág. ' + fmt(a.pagina_inicio) + '</span>' : '<span class="estado bad">Sin página</span>')) + '</td>' +
      '<td><div class="chips">' + (al.join('') || '<span class="sub">Ninguna</span>') + '</div></td></tr>';
  });
  $('tablaActos').innerHTML = h + '</tbody>';
  var pags = Math.max(1, Math.ceil(S.total / CFG.POR_PAGINA)), ini = (S.pagina - 1) * CFG.POR_PAGINA;
  $('pager').innerHTML = '<span>' + (S.total ? fmt(ini + 1) + ' a ' + fmt(Math.min(ini + CFG.POR_PAGINA, S.total)) + ' de ' + fmt(S.total) : '0 resultados') + '</span>' +
    '<div class="btns"><button type="button" class="btn" data-pag="-1"' + (S.pagina <= 1 ? ' disabled' : '') + '>Anterior</button>' +
    '<span style="padding:0 8px">Página ' + S.pagina + ' de ' + pags + '</span>' +
    '<button type="button" class="btn" data-pag="1"' + (S.pagina >= pags ? ' disabled' : '') + '>Siguiente</button></div>';
}

/* =========================================================
   Ficha lateral
   ========================================================= */
var _focoPrevio = null, _actoFicha = null;
function abrirDrawer(html) {
  _focoPrevio = document.activeElement;
  var d = $('drawer');
  d.innerHTML = html; d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
  $('scrim').classList.add('open');
  var c = d.querySelector('.close'); if (c) c.focus();
}
function cerrarDrawer() {
  var d = $('drawer');
  if (!d.classList.contains('open')) return;
  d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
  $('scrim').classList.remove('open');
  if (_focoPrevio && _focoPrevio.focus) _focoPrevio.focus();
}

function fichaActo(a) {
  var l = a.notif_lotes || {}, t = terminoLote(l);
  var h = '<div class="drawer-head"><div><span class="estado info">' + esc(MEDIOS[l.medio] ? MEDIOS[l.medio].nombre : '') + '</span>' +
    '<h3 class="mono">' + esc(a.radicado) + '</h3><div class="who">' + esc(a.nombre) + ', ' + esc(a.documento || 'sin documento') + '</div></div>' +
    '<button class="close" type="button" data-cerrar="1" aria-label="Cerrar">&times;</button></div>';
  h += '<div class="dl">' +
    (l.medio === 'mensajeria' || a.guia ? '<div><small>Radicado de la Alcaldía</small><b class="mono">' + esc(a.radicado) + '</b></div><div><small>Guía de mensajería</small><b class="mono">' + esc(a.guia || 'Sin guía') + '</b></div>' : '') +
    (a.email ? '<div class="full"><small>Correo</small><b>' + esc(a.email) + '</b></div>' : '') +
    (a.direccion ? '<div class="full"><small>Dirección</small><b>' + esc(a.direccion) + (a.ciudad ? ', ' + esc(a.ciudad) : '') + '</b></div>' : '') +
    (l.concepto ? '<div class="full"><small>Concepto</small><b>' + esc(l.concepto) + '</b></div>' : '') +
    '<div><small>Renta</small><b><span class="dot" style="background:' + renta(l.renta).color + '"></span>' + esc(renta(l.renta).nombre) + '</b></div>' +
    '<div><small>Lote</small><b>Lote ' + esc(l.numero) + (a.consecutivo ? ', n.º ' + esc(a.consecutivo) : '') + '</b></div>' +
    '<div class="full"><small>Referencias' + (a.n_referencias ? ' (' + esc(a.n_referencias) + ')' : '') + '</small><b>' + esc(a.referencias || 'Sin referencias') + '</b></div>' +
    (a.valor_capital != null ? '<div><small>Capital</small><b>' + pesos(a.valor_capital) + '</b></div>' : '') +
    (a.intereses != null ? '<div><small>Intereses</small><b>' + pesos(a.intereses) + '</b></div>' : '') +
    '<div class="full"><small>Total notificado</small><b>' + pesos(a.total) + '</b></div></div>';

  if (a.alerta_correo) h += '<div class="box warn"><h4>' + esc(a.alerta_correo) + '</h4><p>Esta dirección probablemente no sirve como correo autorizado del contribuyente. Conviene reforzar la notificación por otro medio.</p></div>';
  if (a.alerta_registro) h += '<div class="box bad"><h4>' + esc(a.alerta_registro) + '</h4><p>El registro está incompleto. Una notificación sin identificación clara del destinatario es difícil de sostener.</p></div>';

  var fechaTxt = fFecha(l.fecha_envio) + (l.fecha_envio_aproximada ? ' (fecha aproximada)' : '');
  var pasoMedio = l.medio === 'mensajeria'
    ? '<div class="tl-item"><div class="tl-dot warn">' + ICONOS.mensajeria + '</div><h5>Empresa de mensajería <span class="estado warn">Enviado</span></h5>' +
      '<p>' + (a.guia ? 'Guía ' + esc(a.guia) + '. ' : 'Sin número de guía. ') + 'Enviado el ' + fechaTxt + '. Sin soporte de entrega cargado.</p></div>'
    : '<div class="tl-item"><div class="tl-dot warn">' + ICONOS.correo + '</div><h5>Correo electrónico <span class="estado warn">Enviado</span></h5>' +
      '<p>Enviado el ' + fechaTxt + '. Sin verificación de rebote.</p></div>';
  h += '<div class="section-title">Ruta de notificación</div><div class="tl">' + pasoMedio +
    '<div class="tl-item"><div class="tl-dot ' + (l.publicado_web ? 'ok' : 'mute') + '">' + ICONOS.web + '</div><h5>Publicación web ' +
    (l.publicado_web ? '<span class="estado ok">Publicada</span>' : '<span class="estado mute">No registrada</span>') + '</h5>' +
    (l.publicado_web ? '<p>Publicada el ' + fFecha(l.fecha_publicacion_web) + (l.url_publicacion_web ? '. <a href="' + esc(l.url_publicacion_web) + '" target="_blank" rel="noopener">Ver publicación</a>' : '') + '</p>' : '<p>El lote no tiene publicación web registrada.</p>') +
    '</div></div>';

  if (t) h += '<div class="box info"><h4>Término: ' + fFecha(t.vence) + ' (' + t.txt.toLowerCase() + ')</h4><p>Quince días hábiles contados desde ' + esc(t.desde) + '. Cálculo aproximado, sin festivos.</p></div>';
  if (l.mandamiento || l.fecha_mandamiento) h += '<div class="box"><h4>Mandamiento o masivo</h4><p>' + esc(l.mandamiento || '') + (l.fecha_mandamiento ? ' del ' + fFecha(l.fecha_mandamiento) : '') + '</p></div>';

  h += '<div class="section-title">Oficio</div>';
  if (!l.archivo_pdf) {
    h += '<div class="box"><h4>Lote cargado sin PDF de oficios</h4><p>Esta notificación se registró desde la planilla' + (a.guia ? ', con su radicado y su número de guía' : '') + '. El oficio no está en Teodoro.</p></div>';
  } else if (!a.pagina_inicio) {
    h += '<div class="box bad"><h4>Sin página en el PDF del lote</h4><p>Al montar el lote no se encontró el oficio de esta persona en el PDF.</p></div>';
  } else {
    h += '<div class="box ' + (l.drive_pdf_id ? 'ok' : 'warn') + '"><h4>Página ' + fmt(a.pagina_inicio) + (a.paginas > 1 ? ' a ' + fmt(a.pagina_inicio + a.paginas - 1) : '') + ' del PDF del lote ' + esc(l.numero) + '</h4>' +
      '<p>' + (l.drive_pdf_id ? 'Abre el PDF del lote y ve a esa página. Para entregar el oficio a un tercero (juez, tutela, petición) genera el oficio individual: así no se comparten los datos de las demás personas del lote.' : 'El PDF de este lote todavía no está enlazado en Drive. Puedes generar el oficio individual con el PDF del lote guardado en tu computador.') + '</p></div>' +
      '<div class="acciones">' + (l.drive_pdf_id ? '<a class="btn" href="' + driveArchivo(l.drive_pdf_id, a.pagina_inicio) + '" target="_blank" rel="noopener">Abrir PDF del lote</a>' : '') +
      '<button class="btn btn-gold" type="button" data-oficio="1">Generar oficio individual</button></div><div id="oficioRes"></div>';
  }
  _actoFicha = a;
  abrirDrawer(h);
}

function fichaLote(l) {
  var t = terminoLote(l);
  var h = '<div class="drawer-head"><div><span class="estado info"><span class="dot" style="background:' + renta(l.renta).color + '"></span>' + esc(renta(l.renta).nombre) + '</span>' +
    '<h3>Lote ' + esc(l.numero) + '</h3><div class="who">' + esc(MEDIOS[l.medio] ? MEDIOS[l.medio].nombre : l.medio) + ', enviado el ' + fFecha(l.fecha_envio) + '</div></div>' +
    '<button class="close" type="button" data-cerrar="1" aria-label="Cerrar">&times;</button></div>';
  h += '<div class="dl">' +
    '<div><small>Notificaciones</small><b>' + fmt(l.n) + '</b></div><div><small>Valor</small><b>' + pesos(l.valor) + '</b></div>' +
    '<div><small>Mandamiento</small><b>' + esc(l.mandamiento || 'No registrado') + '</b></div><div><small>Fecha del mandamiento</small><b>' + (l.fecha_mandamiento ? fFecha(l.fecha_mandamiento) : 'No registrada') + '</b></div>' +
    '<div><small>Vigencia</small><b>' + esc(l.vigencia || 'No registrada') + '</b></div>' +
    '<div><small>Concepto</small><b>' + esc(l.concepto || 'No registrado') + '</b></div>' +
    '<div><small>Fecha de envío</small><b>' + fFecha(l.fecha_envio) + (l.fecha_envio_aproximada ? ' (aproximada)' : '') + '</b></div>' +
    '<div><small>Publicación web</small><b>' + (l.publicado_web ? fFecha(l.fecha_publicacion_web) : 'No') + '</b></div>' +
    '<div class="full"><small>Archivos de origen</small><b>' + esc(l.archivo_excel || '') + (l.archivo_pdf ? ' y ' + esc(l.archivo_pdf) : '') + '</b></div>' +
    '<div class="full"><small>Montado por</small><b>' + esc(l.cargado_por || '') + ' el ' + fFecha(String(l.creado_en || '').slice(0, 10)) + '</b></div></div>';
  if (t) h += '<div class="box info"><h4>Término: ' + fFecha(t.vence) + ' (' + t.txt.toLowerCase() + ')</h4><p>Quince días hábiles contados desde ' + esc(t.desde) + '. Cálculo aproximado, sin festivos.</p></div>';
  if (Number(l.alertas_correo) + Number(l.alertas_registro)) {
    h += '<div class="box warn"><h4>' + fmt(l.alertas_correo) + ' correos de riesgo y ' + fmt(l.alertas_registro) + ' registros incompletos</h4><p>Revísalos en Notificaciones con el filtro de alerta.</p></div>';
  }
  if (!l.archivo_pdf) {
    h += '<div class="box"><h4>Lote cargado sin PDF de oficios</h4><p>Las notificaciones de este lote tienen radicado' + (l.medio === 'mensajeria' ? ' y número de guía' : '') + ', pero no oficio asociado.</p></div>';
  } else h += '<div class="box ' + (l.drive_pdf_id ? 'ok' : 'warn') + '" id="boxDrive"><h4>' + (l.drive_pdf_id ? 'PDF del lote en Google Drive' : 'Falta enlazar el PDF del lote en Drive') + '</h4>' +
    (l.drive_pdf_id ? '<p><a href="' + driveArchivo(l.drive_pdf_id) + '" target="_blank" rel="noopener">Abrir el PDF del lote</a>' + (l.archivo_pdf ? ' (' + esc(l.archivo_pdf) + ')' : '') + '</p>'
      : '<p>Sube a Drive el PDF completo del lote' + (l.archivo_pdf ? ' (' + esc(l.archivo_pdf) + ')' : '') + ', ábrelo y copia su enlace. Pégalo aquí.</p>') +
    '<div class="fila"><input class="input" id="drivePdf" placeholder="Enlace del PDF en Drive (…/file/d/…)" value="' + esc(l.drive_pdf_id ? driveArchivo(l.drive_pdf_id) : '') + '">' +
    '<button class="btn btn-gold" type="button" id="btnPdfLote" data-lote-id="' + l.id + '">' + (l.drive_pdf_id ? 'Cambiar enlace' : 'Guardar enlace') + '</button></div><div id="driveRes"></div></div>';
  h += '<div class="acciones"><button class="btn" type="button" data-ver-lote="' + l.id + '">Ver notificaciones del lote</button></div>';
  abrirDrawer(h);
}

/* =========================================================
   PDF del lote en Google Drive
   ========================================================= */
function guardarPdfLote(loteId) {
  var out = $('driveRes'), btn = $('btnPdfLote');
  var id = idArchivoDrive($('drivePdf').value);
  if (!id) { out.innerHTML = '<div class="note bad">Pega el enlace del archivo PDF (el que contiene /file/d/). Si pegaste el de una carpeta, abre el PDF y copia el enlace del archivo.</div>'; return; }
  btn.disabled = true;
  supaFetch('notif_lotes?id=eq.' + loteId, { method: 'PATCH', body: { drive_pdf_id: id }, headers: { Prefer: 'return=minimal' } })
    .then(function () {
      toast('Enlace del PDF guardado', 'ok');
      return Promise.all([cargarResumen(), cargarLotes()]);
    })
    .then(function () {
      renderAnios(); renderHero(); renderTabs(); if (S.vista !== 'montar') renderVista();
      var l = S.lotes.filter(function (x) { return String(x.id) === String(loteId); })[0];
      if (l) fichaLote(l);
      if ($('driveRes')) $('driveRes').innerHTML = '<div class="note ok">Listo. Cada notificación del lote abre este PDF y muestra en qué página está su oficio.</div>';
    })
    .catch(function (e) { if ($('driveRes')) $('driveRes').innerHTML = '<div class="note bad">' + esc(e.message) + '</div>'; })
    .then(function () { if ($('btnPdfLote')) $('btnPdfLote').disabled = false; });
}

/* =========================================================
   Oficio individual: se extrae del PDF del lote en el navegador
   ========================================================= */
var PDF_LOTES = {};   // loteId -> { bytes, nombre } mientras la página esté abierta
function oficioIndividual() {
  var a = _actoFicha; if (!a || !a.pagina_inicio) return;
  var loteId = a.lote_id, out = $('oficioRes');
  if (!PDF_LOTES[loteId] && M && M.guardado && String(M.guardado.loteId) === String(loteId) && M.pdfBytes) {
    PDF_LOTES[loteId] = { bytes: M.pdfBytes, nombre: M.pdfNombre };
  }
  if (PDF_LOTES[loteId]) { extraerOficio(a, PDF_LOTES[loteId], false); return; }
  var l = a.notif_lotes || {};
  out.innerHTML = '<div class="note info">Selecciona el PDF completo del lote ' + esc(l.numero) + '. Si está en Drive, descárgalo primero. Se pide una sola vez por lote mientras tengas la página abierta.</div>';
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf'; inp.style.display = 'none';
  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0]; inp.remove();
    if (!f) return;
    if ($('oficioRes')) $('oficioRes').innerHTML = '<div class="note info">Leyendo el PDF…</div>';
    f.arrayBuffer().then(function (buf) {
      return extraerOficio(a, { bytes: new Uint8Array(buf), nombre: f.name }, true);
    }).catch(function (e) { if ($('oficioRes')) $('oficioRes').innerHTML = '<div class="note bad">' + esc(e.message || String(e)) + '</div>'; });
  });
  document.body.appendChild(inp);
  inp.click();
}

/* Antes de entregar la página, verifica que corresponda a la persona (cédula o correo) */
function extraerOficio(a, datos, recordar) {
  var loteId = a.lote_id;
  var paginas = []; for (var k = 0; k < (a.paginas || 1); k++) paginas.push(a.pagina_inicio + k);
  return cargarLibs().then(function () {
    return pdfjsLib.getDocument({ data: datos.bytes.slice(), cMapUrl: CFG.PDF_CMAPS, cMapPacked: true }).promise;
  }).then(function (doc) {
    if (doc.numPages < paginas[paginas.length - 1]) {
      doc.destroy();
      throw new Error('Ese PDF tiene ' + fmt(doc.numPages) + ' páginas y el oficio está en la página ' + fmt(a.pagina_inicio) + '. Revisa que sea el PDF del lote correcto.');
    }
    return doc.getPage(a.pagina_inicio).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
      doc.destroy();
      var t = tc.items.map(function (i) { return i.str; }).join(' ').toLowerCase();
      var tSin = t.replace(/[.\s]/g, '');
      var ok = (a.email && t.indexOf(a.email.toLowerCase()) > -1) || (a.documento && tSin.indexOf(String(a.documento)) > -1);
      if (!ok && !window.confirm('La página ' + a.pagina_inicio + ' de «' + datos.nombre + '» no muestra la cédula ni el correo de ' + a.nombre + '. Puede que no sea el PDF de este lote. ¿Generar el oficio de todos modos?')) {
        throw new Error('CANCELADO');
      }
      if (recordar && ok) PDF_LOTES[loteId] = datos;
    });
  }).then(function () {
    return PDFLib.PDFDocument.load(datos.bytes, { ignoreEncryption: true });
  }).then(function (src) {
    return PDFLib.PDFDocument.create().then(function (nd) {
      return nd.copyPages(src, paginas.map(function (p) { return p - 1; })).then(function (pgs) { pgs.forEach(function (p) { nd.addPage(p); }); return nd.save(); });
    });
  }).then(function (bytes) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var el = document.createElement('a');
    el.href = URL.createObjectURL(blob); el.download = a.radicado + '.pdf';
    document.body.appendChild(el); el.click(); el.remove();
    setTimeout(function () { URL.revokeObjectURL(el.href); }, 4000);
    if ($('oficioRes')) $('oficioRes').innerHTML = '<div class="note ok">Oficio descargado como ' + esc(a.radicado) + '.pdf (' + paginas.length + (paginas.length > 1 ? ' páginas' : ' página') + ').</div>';
  }).catch(function (e) {
    if (!$('oficioRes')) return;
    $('oficioRes').innerHTML = e.message === 'CANCELADO' ? '' : '<div class="note bad">' + esc(e.message || String(e)) + '</div>';
  });
}

/* =========================================================
   Montar lote
   ========================================================= */
var M = null;
function nuevoMontaje() {
  M = { excelNombre: '', filas: [], mapa: {}, extras: [], pdfNombre: '', pdfBytes: null, numPages: 0, textos: [],
        asign: null, sinAsignar: [], repetidas: [], modoAsignacion: '', guardado: null, ocupado: false, form: {} };
}
nuevoMontaje();

/* Carga perezosa de librerías (alojadas en /lib porque la red bloquea CDN) */
var _libs = null;
function cargarLibs() {
  if (_libs) return _libs;
  _libs = CFG.LIBS.reduce(function (p, src) {
    return p.then(function () {
      return new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = src; s.onload = res;
        s.onerror = function () { rej(new Error('No se pudo cargar ' + src + '. Verifica que la carpeta lib/ esté publicada junto al módulo.')); };
        document.head.appendChild(s);
      });
    });
  }, Promise.resolve()).then(function () {
    if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = CFG.PDF_WORKER;
  }).catch(function (e) { _libs = null; throw e; });
  return _libs;
}

function vistaMontar() {
  var anioActual = hoy().getFullYear();
  var opR = RENTA_IDS.map(function (id) { return '<option value="' + id + '">' + esc(renta(id).nombre) + '</option>'; }).join('');
  var opV = '<option value="">Sin especificar</option>';
  for (var y = anioActual; y >= 2010; y--) opV += '<option value="' + y + '">' + y + '</option>';
  return '' +
  '<section class="panel paso" id="paso1"><div class="panel-head"><h3><span class="paso-num">1</span>Datos del lote</h3><p>Lo que identifica el envío. El año de notificación sale de la fecha de envío.</p></div>' +
  '<div class="form-grid">' +
    '<label class="campo"><span>Renta</span><select class="select" id="mRenta">' + opR + '</select></label>' +
    '<label class="campo"><span>Medio</span><select class="select" id="mMedio"><option value="correo">Correo electrónico</option><option value="mensajeria">Empresa de mensajería</option><option value="web">Solo publicación web</option></select></label>' +
    '<label class="campo"><span>Número de lote</span><input class="input" id="mNumero" type="number" min="1" step="1" placeholder="34"></label>' +
    '<label class="campo"><span>Vigencia de la obligación</span><select class="select" id="mVigencia">' + opV + '</select></label>' +
    '<label class="campo"><span>Mandamiento o masivo</span><input class="input" id="mMandamiento" placeholder="M 86-2024"></label>' +
    '<label class="campo"><span>Concepto</span><select class="select" id="mConcepto"><option value="">Sin especificar</option><option>Multas de tránsito</option><option>Acuerdo de pago incumplido</option><option>Impuesto predial</option><option>Industria y comercio</option><option>Obligaciones urbanísticas</option><option>Otro</option></select></label>' +
    '<label class="campo"><span>Fecha del mandamiento</span><input class="input" id="mFechaMand" type="date"></label>' +
    '<label class="campo"><span>Fecha de envío (radicado)</span><input class="input" id="mFechaEnvio" type="date"></label>' +
    '<label class="campo check span2"><input type="checkbox" id="mWeb"> El lote también se publicó en la página web</label>' +
    '<label class="campo"><span>Fecha de publicación web</span><input class="input" id="mFechaWeb" type="date" disabled></label>' +
    '<label class="campo"><span>Enlace de la publicación</span><input class="input" id="mUrlWeb" type="url" placeholder="https://" disabled></label>' +
    '<label class="campo check span2"><input type="checkbox" id="mFechaAprox"> La fecha de envío es aproximada (no hay fecha exacta de despacho)</label>' +
  '</div></section>' +
  '<section class="panel paso" id="paso2"><div class="panel-head"><h3><span class="paso-num">2</span>Excel del lote</h3><p>Una fila por notificado, con el radicado de despacho.</p></div>' +
    '<div class="drop"><div>Selecciona el Excel (.xlsx)</div><input type="file" id="mExcel" accept=".xlsx,.xls"></div><div id="resExcel"></div></section>' +
  '<section class="panel paso bloqueado" id="paso3"><div class="panel-head"><h3><span class="paso-num">3</span>PDF de oficios</h3><p>Opcional. Si lo cargas, Teodoro lee cada página, encuentra a quién pertenece por su cédula o correo y verifica contra el Excel. Las planillas de mensajería se pueden guardar sin PDF.</p></div>' +
    '<div class="drop"><div>Selecciona el PDF con todos los oficios del lote</div><input type="file" id="mPdf" accept=".pdf"></div><div id="resPdf"></div></section>' +
  '<section class="panel paso bloqueado" id="paso4"><div class="panel-head"><h3><span class="paso-num">4</span>Guardar</h3><p>Guarda el lote y la página de cada notificación. Después sube el PDF completo a Drive y pega su enlace en la ficha del lote.</p></div>' +
    '<div class="acciones"><button class="btn btn-gold" type="button" id="btnGuardar">Guardar lote en Teodoro</button></div>' +
    '<div id="resFinal"></div></section>';
}

/* Conserva lo digitado en el paso 1 si se cambia de pestaña y se vuelve */
var CAMPOS_FORM = ['mRenta', 'mMedio', 'mNumero', 'mVigencia', 'mMandamiento', 'mConcepto', 'mFechaMand', 'mFechaEnvio', 'mFechaAprox', 'mWeb', 'mFechaWeb', 'mUrlWeb'];
function guardarForm() {
  CAMPOS_FORM.forEach(function (id) { var el = $(id); if (el) M.form[id] = el.type === 'checkbox' ? el.checked : el.value; });
}
function restaurarForm() {
  CAMPOS_FORM.forEach(function (id) { var el = $(id); if (!el || !(id in M.form)) return; if (el.type === 'checkbox') el.checked = M.form[id]; else el.value = M.form[id]; });
  if ($('mWeb')) { $('mFechaWeb').disabled = !$('mWeb').checked; $('mUrlWeb').disabled = !$('mWeb').checked; }
}

function pintarMontar() {
  restaurarForm();
  if (M.excelNombre) pintarResumenExcel();
  if (M.numPages) pintarResumenPdf();
  actualizarPasos();
}
function actualizarPasos() {
  var p3 = $('paso3'), p4 = $('paso4');
  if (p3) p3.classList.toggle('bloqueado', !M.filas.length);
  if (p4) p4.classList.toggle('bloqueado', !M.filas.length || M.ocupado && !M.asign);
}

function leerFormulario() {
  var d = {
    renta: $('mRenta').value,
    medio: $('mMedio').value,
    numero: parseInt($('mNumero').value, 10),
    vigencia: $('mVigencia').value ? parseInt($('mVigencia').value, 10) : null,
    mandamiento: $('mMandamiento').value.trim() || null,
    concepto: $('mConcepto').value || null,
    fecha_mandamiento: $('mFechaMand').value || null,
    fecha_envio: $('mFechaEnvio').value || null,
    fecha_envio_aproximada: $('mFechaAprox').checked,
    publicado_web: $('mWeb').checked,
    fecha_publicacion_web: $('mWeb').checked ? ($('mFechaWeb').value || null) : null,
    url_publicacion_web: $('mWeb').checked ? ($('mUrlWeb').value.trim() || null) : null
  };
  var err = [];
  if (!d.numero || d.numero < 1) err.push('el número de lote');
  if (!d.fecha_envio) err.push('la fecha de envío');
  if (d.publicado_web && !d.fecha_publicacion_web) err.push('la fecha de publicación web');
  if (err.length) { toast('Falta ' + err.join(', ') + ' en los datos del lote.', 'bad'); $('paso1').scrollIntoView({ behavior: 'smooth' }); return null; }
  return d;
}

/* ---------- Excel ---------- */
var SINONIMOS = {
  radicado:      ['RADICADO', 'N RADICADO', 'NO RADICADO', 'NUMERO RADICADO', 'RADICADO SALIDA'],
  consecutivo:   ['#', 'NO', 'N', 'CONSECUTIVO', 'ITEM'],
  documento:     ['CEDULA', 'DOCUMENTO', 'NIT', 'IDENTIFICACION', 'CC', 'CEDULA NIT', 'NUMERO DOCUMENTO', 'CC NIT'],
  nombre:        ['NOMBRES Y APELLIDOS', 'NOMBRE', 'NOMBRES', 'CONTRIBUYENTE', 'RAZON SOCIAL', 'PROPIETARIO', 'NOMBRE O RAZON SOCIAL'],
  email:         ['EMAIL', 'CORREO', 'CORREO ELECTRONICO', 'E MAIL', 'MAIL'],
  referencias:   ['RESOLUCIONES', 'RESOLUCION', 'COMPARENDOS', 'COMPARENDO', 'MATRICULA', 'FICHA', 'FICHA CATASTRAL', 'REFERENCIA', 'REFERENCIAS', 'EXPEDIENTE', 'OBSERVACION', 'OBSERVACIONES'],
  guia:          ['GUIA', 'N GUIA', 'NO GUIA', 'NUMERO GUIA', 'NUMERO DE GUIA', 'GUIA 472'],
  direccion:     ['DIRECCION', 'DIRECCION NOTIFICACION', 'DIRECCION DE NOTIFICACION'],
  ciudad:        ['CIUDAD', 'MUNICIPIO', 'NOMBRE CIUDAD'],
  n_referencias: ['N COMP', 'NO COMP', 'CANTIDAD', 'N RESOLUCIONES', 'NUMERO COMPARENDOS'],
  valor_capital: ['VALOR MULTAS', 'VALOR MULTA', 'CAPITAL', 'VALOR CAPITAL', 'VALOR IMPUESTO', 'VALOR'],
  intereses:     ['INTERESES', 'INTERES', 'INTERESES MORATORIOS'],
  total:         ['TOTAL A PAGAR', 'TOTAL', 'VALOR TOTAL', 'TOTAL DEUDA']
};
var CAMPO_NOMBRE = { radicado: 'Radicado', consecutivo: 'Consecutivo', documento: 'Documento', nombre: 'Nombre', email: 'Correo', referencias: 'Referencias', guia: 'Guía', direccion: 'Dirección', ciudad: 'Ciudad', n_referencias: 'Cantidad de referencias', valor_capital: 'Capital', intereses: 'Intereses', total: 'Total' };
var OBLIGATORIOS = ['radicado', 'nombre'];

function normCol(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[°º]/g, '').replace(/[^A-Z0-9#]+/g, ' ').trim();
}
function aTexto(v) {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toFixed(0) : String(v);
  return String(v).trim();
}
function aNumero(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s) return null;
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else s = s.replace(',', '.');
  var n = parseFloat(s);
  return isFinite(n) ? n : null;
}
var DOMINIOS_COMUNES = ['gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'yahoo.es', 'yahoo.com', 'yahoo.com.co', 'live.com', 'live.com.co', 'icloud.com', 'msn.com', 'hotmail.co', 'outlook.com.co', 'protonmail.com', 'une.net.co', 'telmex.net.co', 'me.com', 'aol.com'];
var DESECHABLES = ['yopmail.com', 'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'trashmail.com'];
function alertaCorreo(email) {
  if (!email) return 'Sin correo';
  var e = email.toLowerCase(), i = e.indexOf('@');
  if (i < 1 || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) return 'Correo mal formado';
  var loc = e.slice(0, i), dom = e.slice(i + 1);
  if (/sincorreo|sin_correo|poractualizar|por_actualizar|notiene|no_tiene|noreporta|nocorreo|notengo|actualizar|ninguno/.test(loc)) return 'Correo de relleno';
  if (DESECHABLES.indexOf(dom) > -1) return 'Buzón desechable';
  if (/\.(cm|con|om|cpm|comm)$/.test(dom) || /gmial|gmal\.|gamil|hotmal|hotmial|hotmai\.|outlok|yaho\./.test(dom)) return 'Posible error de digitación';
  if (loc.length <= 3) return 'Usuario sospechosamente corto';
  if (DOMINIOS_COMUNES.indexOf(dom) < 0) return 'Correo corporativo o institucional';
  return null;
}
function alertaRegistro(f, medio) {
  if (!f.nombre || /SIN INFORM|SIN NOMBRE|NO REGISTRA/i.test(f.nombre)) return 'Nombre sin información';
  if (!f.documento) return 'Sin documento';
  if (!/^\d{5,11}$/.test(f.documento)) return 'Documento dudoso';
  if (medio === 'mensajeria' && !f.guia) return 'Sin guía';
  return null;
}

/* Arma el mapa columna → campo. En las planillas de mensajería el radicado de la
   Alcaldía viene en la columna «Referencia»: si no hay columna «Radicado», se usa esa. */
function mapearColumnas(headers) {
  var normas = headers.map(normCol), mapa = {}, usadas = {};
  var sin = {}; Object.keys(SINONIMOS).forEach(function (k) { sin[k] = SINONIMOS[k].slice(); });
  var hayRadicado = normas.some(function (h) { return sin.radicado.indexOf(h) > -1; });
  if (!hayRadicado && normas.indexOf('REFERENCIA') > -1) {
    sin.radicado.push('REFERENCIA');
    sin.referencias = sin.referencias.filter(function (x) { return x !== 'REFERENCIA'; });
  }
  Object.keys(sin).forEach(function (campo) {
    for (var i = 0; i < headers.length; i++) {
      if (usadas[headers[i]]) continue;
      if (sin[campo].indexOf(normas[i]) > -1) { mapa[campo] = headers[i]; usadas[headers[i]] = 1; break; }
    }
  });
  return { mapa: mapa, usadas: usadas };
}

/* Elige la hoja del libro: la que tenga radicado y nombre, prefiriendo la que trae
   guía en mensajería, y luego la de más filas */
function elegirHoja(wb, medio) {
  var mejor = null;
  wb.SheetNames.forEach(function (nombre) {
    var raw = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { defval: '', raw: true });
    raw = raw.filter(function (r) { return Object.keys(r).some(function (k) { return String(r[k]).trim() !== ''; }); });
    if (!raw.length) return;
    var headers = Object.keys(raw[0]), m = mapearColumnas(headers);
    var ok = OBLIGATORIOS.every(function (c) { return m.mapa[c]; });
    var puntos = (ok ? 1000000 : 0) + (medio === 'mensajeria' && m.mapa.guia ? 100000 : 0) + (medio === 'correo' && m.mapa.email ? 100000 : 0) + raw.length;
    if (!mejor || puntos > mejor.puntos) mejor = { nombre: nombre, raw: raw, headers: headers, m: m, ok: ok, puntos: puntos };
  });
  return mejor;
}

function procesarExcel(file) {
  var out = $('resExcel');
  out.innerHTML = '<div class="note info">Leyendo el Excel…</div>';
  return cargarLibs().then(function () { return file.arrayBuffer(); }).then(function (buf) {
    var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    var medio = $('mMedio').value;
    var hoja = elegirHoja(wb, medio);
    if (!hoja) throw new Error('El Excel no tiene filas con datos.');
    var raw = hoja.raw, headers = hoja.headers, mapa = hoja.m.mapa, usadas = hoja.m.usadas;
    M.hoja = wb.SheetNames.length > 1 ? hoja.nombre : '';
    var faltan = OBLIGATORIOS.filter(function (c) { return !mapa[c]; });
    if (faltan.length) throw new Error('El Excel no tiene la columna de ' + faltan.map(function (c) { return CAMPO_NOMBRE[c].toLowerCase(); }).join(' ni de ') + '. Columnas encontradas: ' + headers.join(', ') + '.');
    var extras = headers.filter(function (h) { return !usadas[h]; });
    var vistos = {};
    var filas = raw.map(function (r, i) {
      var f = {
        fila: i + 2,
        radicado: aTexto(r[mapa.radicado]).replace(/\s+/g, ''),
        consecutivo: mapa.consecutivo ? aTexto(r[mapa.consecutivo]) : null,
        documento: mapa.documento ? aTexto(r[mapa.documento]).replace(/[.\s]/g, '') : '',
        nombre: aTexto(r[mapa.nombre]).replace(/\s+/g, ' '),
        email: mapa.email ? aTexto(r[mapa.email]).replace(/\s+/g, '').toLowerCase() : '',
        referencias: mapa.referencias ? aTexto(r[mapa.referencias]) : null,
        valor_capital: mapa.valor_capital ? aNumero(r[mapa.valor_capital]) : null,
        intereses: mapa.intereses ? aNumero(r[mapa.intereses]) : null,
        total: mapa.total ? aNumero(r[mapa.total]) : null,
        guia: mapa.guia ? aTexto(r[mapa.guia]).replace(/\s+/g, '').toUpperCase() : '',
        direccion: mapa.direccion ? aTexto(r[mapa.direccion]).replace(/\s+/g, ' ') : '',
        ciudad: mapa.ciudad ? aTexto(r[mapa.ciudad]).replace(/\s+/g, ' ').toUpperCase() : '',
        detalle: {}
      };
      f.n_referencias = mapa.n_referencias ? (aNumero(r[mapa.n_referencias]) || null) :
        (f.referencias ? f.referencias.split(/[,;]+/).filter(function (x) { return x.trim(); }).length : null);
      extras.forEach(function (h) { var v = r[h]; if (v !== '' && v != null) f.detalle[h] = v; });
      if (!f.radicado) f.error = 'Sin radicado';
      else if (vistos[f.radicado]) f.error = 'Radicado repetido (fila ' + vistos[f.radicado] + ')';
      else vistos[f.radicado] = f.fila;
      f.alerta_correo = (mapa.email && medio === 'correo') ? alertaCorreo(f.email) : null;
      f.alerta_registro = alertaRegistro(f, medio);
      return f;
    });
    M.excelNombre = file.name; M.filas = filas; M.mapa = mapa; M.extras = extras;
    M.asign = null; M.numPages = 0; M.textos = []; M.guardado = null; M.pdfNombre = ''; M.pdfBytes = null;
    if (!mapa.email && medio === 'correo') toast('El Excel no trae columna de correo. Revisa el medio del lote.', 'bad');
    if (!mapa.guia && medio === 'mensajeria') toast('El Excel no trae columna de guía. Revisa el medio del lote.', 'bad');
    pintarResumenExcel();
    if ($('resPdf')) $('resPdf').innerHTML = '';
    if ($('resFinal')) $('resFinal').innerHTML = '';
    actualizarPasos();
  }).catch(function (e) {
    M.filas = []; actualizarPasos();
    out.innerHTML = '<div class="note bad">' + esc(e.message) + '</div>';
  });
}

function contar(lista, campo) { var c = {}; lista.forEach(function (x) { if (x[campo]) c[x[campo]] = (c[x[campo]] || 0) + 1; }); return c; }

function pintarResumenExcel() {
  var f = M.filas, err = f.filter(function (x) { return x.error; });
  var aC = contar(f, 'alerta_correo'), aR = contar(f, 'alerta_registro');
  var nAC = f.filter(function (x) { return x.alerta_correo; }).length, nAR = f.filter(function (x) { return x.alerta_registro; }).length;
  var total = 0; f.forEach(function (x) { total += Number(x.total || 0); });
  var h = '<div class="resumen-grid">' +
    '<div><b>' + fmt(f.length) + '</b><small>Filas en «' + esc(M.excelNombre) + '»' + (M.hoja ? ', hoja «' + esc(M.hoja) + '»' : '') + '</small></div>' +
    '<div><b>' + pesosCorto(total) + '</b><small>Valor total</small></div>' +
    '<div class="' + (nAC ? 'warn' : 'ok') + '"><b>' + fmt(nAC) + '</b><small>Correos de riesgo</small></div>' +
    '<div class="' + (err.length ? 'bad' : (nAR ? 'warn' : 'ok')) + '"><b>' + fmt(err.length + nAR) + '</b><small>Errores y registros incompletos</small></div></div>';
  h += '<div class="mapa">';
  Object.keys(CAMPO_NOMBRE).forEach(function (c) {
    h += '<div class="' + (!M.mapa[c] && OBLIGATORIOS.indexOf(c) > -1 ? 'falta' : '') + '">' + CAMPO_NOMBRE[c] + ': ' + (M.mapa[c] ? '<b>' + esc(M.mapa[c]) + '</b>' : '<span>no encontrada</span>') + '</div>';
  });
  h += '</div>';
  if (M.extras.length) h += '<div class="note info">Columnas adicionales que se guardan como detalle: ' + M.extras.map(esc).join(', ') + '.</div>';
  if (err.length) h += '<div class="note bad">' + fmt(err.length) + ' filas no se van a guardar: ' + err.slice(0, 10).map(function (x) { return 'fila ' + x.fila + ' (' + esc(x.error) + ')'; }).join(', ') + (err.length > 10 ? '…' : '') + '</div>';
  if (nAC || nAR) {
    h += '<div class="note">' + Object.keys(aC).map(function (k) { return esc(k) + ': ' + fmt(aC[k]); }).concat(Object.keys(aR).map(function (k) { return esc(k) + ': ' + fmt(aR[k]); })).join('. ') + '.</div>';
    var muestra = f.filter(function (x) { return x.alerta_correo && x.alerta_correo !== 'Correo corporativo o institucional' || x.alerta_registro; }).slice(0, 25);
    if (muestra.length) {
      h += '<div class="table-wrap"><table class="data" style="min-width:700px"><thead><tr><th>Fila</th><th>Radicado</th><th>Nombre</th><th>Correo</th><th>Alerta</th></tr></thead><tbody>' +
        muestra.map(function (x) { return '<tr><td class="mono">' + x.fila + '</td><td class="mono">' + esc(x.radicado) + '</td><td>' + esc(x.nombre) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.alerta_correo || x.alerta_registro) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    }
  }
  $('resExcel').innerHTML = h;
}

/* ---------- PDF ---------- */
function progreso(el, actual, total, texto) {
  var p = total ? Math.round(actual * 100 / total) : 0;
  el.innerHTML = '<div class="progreso"><div class="track"><div class="fill" style="width:' + p + '%"></div></div><p>' + esc(texto) + ' ' + fmt(actual) + ' de ' + fmt(total) + '</p></div>';
}

function procesarPdf(file) {
  var out = $('resPdf');
  if (M.ocupado) return;
  M.ocupado = true;
  out.innerHTML = '<div class="note info">Abriendo el PDF…</div>';
  var doc;
  return cargarLibs().then(function () { return file.arrayBuffer(); }).then(function (buf) {
    M.pdfBytes = new Uint8Array(buf);
    M.pdfNombre = file.name;
    return pdfjsLib.getDocument({ data: M.pdfBytes.slice(), cMapUrl: CFG.PDF_CMAPS, cMapPacked: true }).promise;
  }).then(function (d) {
    doc = d; M.numPages = d.numPages; M.textos = [];
    var i = 0;
    function siguiente() {
      i++;
      if (i > M.numPages) return Promise.resolve();
      return doc.getPage(i).then(function (pg) {
        return pg.getTextContent().then(function (tc) {
          M.textos.push(tc.items.map(function (it) { return it.str; }).join(' '));
          pg.cleanup();
          if (i % 10 === 0 || i === M.numPages) progreso(out, i, M.numPages, 'Leyendo páginas:');
          return (i % 25 === 0 ? tick() : Promise.resolve()).then(siguiente);
        });
      });
    }
    return siguiente();
  }).then(function () {
    if (doc) doc.destroy();
    asignarPaginas();
    pintarResumenPdf();
    actualizarPasos();
  }).catch(function (e) {
    M.asign = null; actualizarPasos();
    out.innerHTML = '<div class="note bad">No se pudo leer el PDF: ' + esc(e.message || String(e)) + '</div>';
  }).then(function () { M.ocupado = false; });
}

/* Asigna páginas a filas. Una página abre bloque si contiene el correo o el documento
   (rotulado como cédula, NIT o documento) de una fila; las siguientes páginas sin
   identificación se suman a ese bloque (anexos). */
var RX_EMAIL = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
var RX_DOC = /(?:C[ÉE]DULA|C\.\s?C\.?|NIT|DOCUMENTO|IDENTIFICACI[ÓO]N)\s*(?:No\.?|N[°º]\.?|:)?\s*([\d][\d.\s]{3,16}\d)/gi;
function asignarPaginas() {
  var porEmail = {}, porDoc = {};
  M.filas.forEach(function (f, i) {
    if (f.error) return;
    if (f.email) porEmail[f.email] = porEmail[f.email] === undefined ? i : -1;     // -1 = ambiguo
    if (f.documento) porDoc[f.documento] = porDoc[f.documento] === undefined ? i : -1;
  });
  var asign = {}, sinAsignar = [], repetidas = [], actual = null, encontrados = 0;
  M.textos.forEach(function (t, k) {
    var pag = k + 1, idx = null, m;
    var emails = (t.match(RX_EMAIL) || []).map(function (s) { return s.toLowerCase(); });
    for (var j = 0; j < emails.length && idx === null; j++) { if (porEmail[emails[j]] >= 0) idx = porEmail[emails[j]]; }
    if (idx === null) {
      RX_DOC.lastIndex = 0;
      while ((m = RX_DOC.exec(t)) && idx === null) {
        var d = m[1].replace(/[.\s]/g, '');
        if (porDoc[d] >= 0) idx = porDoc[d];
      }
    }
    if (idx !== null) {
      encontrados++;
      if (idx === actual) { asign[idx].push(pag); }
      else if (asign[idx]) { repetidas.push({ pag: pag, fila: M.filas[idx].fila }); actual = null; }
      else { asign[idx] = [pag]; actual = idx; }
    } else if (actual !== null) { asign[actual].push(pag); }
    else { sinAsignar.push(pag); }
  });
  M.modoAsignacion = 'texto';
  var validas = M.filas.filter(function (f) { return !f.error; });
  // Respaldo: si ninguna página tiene texto identificable y el PDF es divisible por las filas, se asigna por orden.
  if (!encontrados && validas.length && M.numPages % validas.length === 0) {
    var porFila = M.numPages / validas.length, p = 1;
    asign = {}; sinAsignar = []; repetidas = [];
    M.filas.forEach(function (f, i) {
      if (f.error) return;
      asign[i] = []; for (var q = 0; q < porFila; q++) asign[i].push(p++);
    });
    M.modoAsignacion = 'orden';
  }
  M.asign = asign; M.sinAsignar = sinAsignar; M.repetidas = repetidas;
  M.filas.forEach(function (f, i) {
    if (f.error) { f.verificacion = 'No se guarda: ' + f.error; f.paginas = null; return; }
    if (asign[i]) {
      f.pagina_inicio = asign[i][0]; f.paginas = asign[i].length;
      f.verificacion = M.modoAsignacion === 'orden' ? 'Asignada por orden, sin texto para verificar' : 'OK';
    } else { f.pagina_inicio = null; f.paginas = null; f.verificacion = 'Sin página en el PDF'; }
  });
}

function pintarResumenPdf() {
  var validas = M.filas.filter(function (f) { return !f.error; });
  var con = validas.filter(function (f) { return f.paginas; }), sin = validas.filter(function (f) { return !f.paginas; });
  var h = '<div class="resumen-grid">' +
    '<div><b>' + fmt(M.numPages) + '</b><small>Páginas en «' + esc(M.pdfNombre) + '»</small></div>' +
    '<div class="' + (con.length === validas.length ? 'ok' : 'warn') + '"><b>' + fmt(con.length) + '</b><small>Notificaciones con su oficio</small></div>' +
    '<div class="' + (sin.length ? 'bad' : 'ok') + '"><b>' + fmt(sin.length) + '</b><small>Sin página en el PDF</small></div>' +
    '<div class="' + (M.sinAsignar.length + M.repetidas.length ? 'warn' : 'ok') + '"><b>' + fmt(M.sinAsignar.length + M.repetidas.length) + '</b><small>Páginas sin asignar o repetidas</small></div></div>';
  if (M.modoAsignacion === 'orden') h += '<div class="note">Las páginas no tienen texto que permita identificar a cada persona (puede ser un PDF escaneado). Se asignaron por orden, así que revisa una muestra antes de guardar.</div>';
  else if (!sin.length && !M.sinAsignar.length && !M.repetidas.length) h += '<div class="note ok">Cada notificación quedó con su oficio y todas las páginas fueron verificadas contra el Excel por cédula o correo.</div>';
  if (sin.length) h += '<div class="lista-corta"><b>Sin página:</b> ' + sin.slice(0, 100).map(function (f) { return 'fila ' + f.fila + ' ' + esc(f.nombre); }).join(', ') + (sin.length > 100 ? '…' : '') + '</div>';
  if (M.sinAsignar.length) h += '<div class="lista-corta"><b>Páginas sin dueño:</b> ' + M.sinAsignar.slice(0, 100).join(', ') + (M.sinAsignar.length > 100 ? '…' : '') + '</div>';
  if (M.repetidas.length) h += '<div class="lista-corta"><b>Páginas que repiten a alguien ya asignado:</b> ' + M.repetidas.slice(0, 100).map(function (r) { return 'pág. ' + r.pag + ' (fila ' + r.fila + ')'; }).join(', ') + '</div>';
  $('resPdf').innerHTML = h;
}

/* ---------- Guardar en Supabase ---------- */
function guardarLote() {
  if (M.ocupado || !M.filas.length) return;
  var d = leerFormulario(); if (!d) return;
  if (!M.asign && !window.confirm('El lote se guardará sin PDF de oficios. Cada notificación quedará con su radicado' + (d.medio === 'mensajeria' ? ' y su guía' : '') + ', pero sin página asociada. ¿Continuar?')) return;
  var anioLote = aFecha(d.fecha_envio).getFullYear();
  var out = $('resFinal'), btn = $('btnGuardar');
  var filas = M.filas.filter(function (f) { return !f.error; });
  if (!filas.length) { toast('No hay filas válidas para guardar.', 'bad'); return; }
  M.ocupado = true; btn.disabled = true;
  var loteId, nuevos = 0;
  out.innerHTML = '<div class="note info">Verificando si el lote ya existe…</div>';
  supaFetch('notif_lotes?select=id&renta=eq.' + d.renta + '&medio=eq.' + d.medio + '&numero=eq.' + d.numero + '&anio_envio=eq.' + anioLote).then(function (r) {
    if (r.data && r.data.length && !window.confirm('El lote ' + d.numero + ' de ' + renta(d.renta).nombre + ' ya existe. Se actualizarán sus datos y solo se agregarán las notificaciones nuevas. ¿Continuar?')) {
      throw new Error('CANCELADO');
    }
    var body = Object.assign({}, d, { archivo_excel: M.excelNombre, archivo_pdf: M.asign ? M.pdfNombre : null });
    return supaFetch('notif_lotes?on_conflict=renta,medio,anio_envio,numero', { method: 'POST', body: [body], headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
  }).then(function (r) {
    loteId = r.data[0].id;
    var registros = filas.map(function (f) {
      return {
        radicado: f.radicado, lote_id: loteId, consecutivo: f.consecutivo || null, documento: f.documento || null,
        nombre: f.nombre || 'Sin nombre', email: f.email || null, alerta_correo: f.alerta_correo, alerta_registro: f.alerta_registro || (!M.asign || f.paginas ? null : 'Sin oficio en el PDF'),
        guia: f.guia || null, direccion: f.direccion || null, ciudad: f.ciudad || null,
        referencias: f.referencias, n_referencias: f.n_referencias, valor_capital: f.valor_capital, intereses: f.intereses, total: f.total,
        detalle: f.detalle, pagina_inicio: M.asign ? f.pagina_inicio : null, paginas: M.asign ? f.paginas : null, verificacion: M.asign ? f.verificacion : 'Lote sin PDF'
      };
    });
    var cadena = Promise.resolve(), hechos = 0;
    for (var i = 0; i < registros.length; i += CFG.LOTE_INSERT) {
      (function (chunk) {
        cadena = cadena.then(function () {
          return supaFetch('notif_actos?on_conflict=radicado&select=radicado', { method: 'POST', body: chunk, headers: { Prefer: 'resolution=ignore-duplicates,return=representation' } })
            .then(function (res) { nuevos += (res.data || []).length; hechos += chunk.length; progreso(out, hechos, registros.length, 'Guardando notificaciones:'); });
        });
      })(registros.slice(i, i + CFG.LOTE_INSERT));
    }
    return cadena.then(function () { return registros.length; });
  }).then(function (totalReg) {
    M.guardado = { loteId: loteId };
    var ya = totalReg - nuevos;
    out.innerHTML = '<div class="note ok">Lote guardado. ' + fmt(nuevos) + ' notificaciones nuevas' + (ya ? ' y ' + fmt(ya) + ' que ya existían (no se modificaron)' : '') + '.</div>' +
      (M.asign ? '<div class="note info">Siguiente paso: sube «' + esc(M.pdfNombre) + '» a Drive (nombre sugerido: ' + esc(nombreSugerido(d)) + '), copia su enlace y pégalo en la ficha del lote.</div>' : '<div class="note info">El lote quedó guardado sin PDF: cada notificación tiene su radicado' + (d.medio === 'mensajeria' ? ' y su número de guía' : '') + '.</div>') + botonIrLote();
    toast('Lote ' + d.numero + ' guardado', 'ok');
    S.anio = anioLote;
    return cargarResumen().then(cargarLotes).then(function () { renderAnios(); renderHero(); renderTabs(); });
  }).catch(function (e) {
    if (e.message === 'CANCELADO') { out.innerHTML = ''; return; }
    out.innerHTML = '<div class="note bad">No se pudo guardar: ' + esc(e.message) + (loteId ? ' El lote quedó creado; puedes volver a guardar y solo se agregarán las notificaciones que falten.' : '') + '</div>';
  }).then(function () { M.ocupado = false; btn.disabled = false; });
}
function nombreSugerido(d) { return rentaCorta(d.renta) + ' - ' + (d.mandamiento ? d.mandamiento + ' - ' : '') + 'Lote ' + d.numero + '.pdf'; }
function botonIrLote() { return '<div class="acciones"><button class="btn btn-gold" type="button" data-abrir-lote="' + M.guardado.loteId + '">Abrir la ficha del lote</button></div>'; }

/* =========================================================
   Eventos
   ========================================================= */
document.addEventListener('click', function (e) {
  var el;
  if ((el = e.target.closest('[data-cerrar]'))) { cerrarDrawer(); return; }
  if ((el = e.target.closest('[data-anio]'))) { S.anio = +el.dataset.anio; S.pagina = 1; S.f.lote = ''; cargarLotes().then(renderTodo).catch(function (er) { toast(er.message, 'bad'); }); return; }
  if ((el = e.target.closest('[data-renta]'))) { S.renta = el.dataset.renta; S.pagina = 1; S.f.lote = ''; cargarLotes().then(renderTodo).catch(function (er) { toast(er.message, 'bad'); }); return; }
  if ((el = e.target.closest('[data-vista]'))) { S.vista = el.dataset.vista; renderTabs(); renderVista(); return; }
  if ((el = e.target.closest('[data-ver-alerta]'))) { S.f = { q: '', lote: '', alerta: el.dataset.verAlerta }; S.pagina = 1; S.vista = 'notificaciones'; renderTabs(); renderVista(); return; }
  if ((el = e.target.closest('[data-ver-lote]'))) { cerrarDrawer(); S.f = { q: '', lote: el.dataset.verLote, alerta: '' }; S.pagina = 1; S.vista = 'notificaciones'; renderTabs(); renderVista(); return; }
  if ((el = e.target.closest('[data-abrir-lote]'))) {
    var idL = el.dataset.abrirLote, l = S.lotes.filter(function (x) { return String(x.id) === String(idL); })[0];
    if (l) fichaLote(l); else toast('El lote está en otro año o renta. Búscalo en la pestaña Lotes.', 'bad');
    return;
  }
  if ((el = e.target.closest('tr[data-lote]'))) { var lt = S.lotes.filter(function (x) { return String(x.id) === el.dataset.lote; })[0]; if (lt) fichaLote(lt); return; }
  if ((el = e.target.closest('tr[data-acto]'))) { var a = S.actos[+el.dataset.acto]; if (a) fichaActo(a); return; }
  if ((el = e.target.closest('[data-pag]'))) { if (el.disabled) return; S.pagina += +el.dataset.pag; buscarActos(); return; }
  if (e.target.id === 'btnPdfLote') { guardarPdfLote(e.target.dataset.loteId); return; }
  if ((el = e.target.closest('[data-oficio]'))) { oficioIndividual(); return; }
  if (e.target.id === 'btnGuardar') { guardarLote(); return; }
  if (e.target.id === 'btnSalir') { Auth.salir(); mostrarLogin(); return; }
  if (e.target.id === 'btnRecargar') { recargarTodo().then(function () { toast('Datos actualizados', 'ok'); }); return; }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { cerrarDrawer(); return; }
  if (e.key === 'Enter' && e.target.closest) {
    var tr = e.target.closest('tr[data-acto]');
    if (tr) { var a = S.actos[+tr.dataset.acto]; if (a) fichaActo(a); }
  }
});
var _tBusca = null;
document.addEventListener('input', function (e) {
  if (CAMPOS_FORM.indexOf(e.target.id) > -1) guardarForm();
  if (e.target.id === 'q') { clearTimeout(_tBusca); var v = e.target.value; _tBusca = setTimeout(function () { S.f.q = v; S.pagina = 1; buscarActos(); }, 400); }
});
document.addEventListener('change', function (e) {
  var id = e.target.id;
  if (CAMPOS_FORM.indexOf(id) > -1) guardarForm();
  if (id === 'fLote') { S.f.lote = e.target.value; S.pagina = 1; buscarActos(); }
  else if (id === 'fAlerta') { S.f.alerta = e.target.value; S.pagina = 1; buscarActos(); }
  else if (id === 'mWeb') { $('mFechaWeb').disabled = !e.target.checked; $('mUrlWeb').disabled = !e.target.checked; }
  else if (id === 'mExcel' && e.target.files[0]) { procesarExcel(e.target.files[0]); }
  else if (id === 'mPdf' && e.target.files[0]) {
    if (!M.filas.length) { toast('Primero carga el Excel del lote.', 'bad'); e.target.value = ''; return; }
    procesarPdf(e.target.files[0]);
  }
});

/* =========================================================
   Arranque
   ========================================================= */
function mostrarLogin(msg) {
  $('app').hidden = true; $('login').hidden = false;
  $('loginMsg').textContent = msg || '';
  setTimeout(function () { $('loginEmail').focus(); }, 50);
}
function sesionVencida() { Auth.salir(); cerrarDrawer(); mostrarLogin('La sesión expiró. Ingresa de nuevo.'); }
function iniciarApp() {
  $('login').hidden = true; $('app').hidden = false;
  $('usuario').textContent = Auth.email();
  $('vista').innerHTML = '<div class="cargando">Cargando notificaciones…</div>';
  recargarTodo().then(function () {
    if (!aniosDisponibles().length) { S.vista = 'montar'; renderTabs(); renderVista(); }
  });
}
$('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (CFG.SUPA_KEY.indexOf('PEGAR_') === 0) { $('loginMsg').textContent = 'Falta configurar la publishable key en notificaciones.js (CFG.SUPA_KEY).'; return; }
  var btn = $('loginBtn'); btn.disabled = true; $('loginMsg').textContent = '';
  Auth.login($('loginEmail').value.trim(), $('loginPass').value).then(function () { $('loginPass').value = ''; iniciarApp(); })
    .catch(function (err) { $('loginMsg').textContent = err.message; })
    .then(function () { btn.disabled = false; });
});
window.addEventListener('beforeunload', function (e) { if (M && M.ocupado) { e.preventDefault(); e.returnValue = ''; } });

if (Auth.vigente()) iniciarApp(); else { Auth.salir(); mostrarLogin(); }
