/* ════════════════════════════════════════════════════════════
   TEODORO · TÍTULOS ICA REMITIDOS — módulo compartido
   Es el mismo código del panel "ICA 2026" de Seguimiento (sin cambios de
   lógica), empaquetado para usarlo también desde Expedientes. Trabaja sobre
   ica_titulos_remitidos e ica_titulos_bitacora, igual que Seguimiento.
   Uso: un contenedor <div id="ica-root"></div> y llamar icaMontar().
   Requiere: supabase-js (sbAuth), xlsx (para exportar) e ica_titulos.css.
   Desarrollado por Jeison Maya · 2026
   ════════════════════════════════════════════════════════════ */

/* ── Adaptadores: si la página no trae estas piezas (Expedientes), se crean
      con las equivalentes. En Seguimiento ya existen y no se tocan. ── */
(function () {
  var w = window;
  if (typeof SUPA_URL === "undefined") w.SUPA_URL = (typeof SUPABASE_URL !== "undefined") ? SUPABASE_URL : "https://bmurdtfztsltcgwsfbgf.supabase.co";
  if (typeof supaHeaders === "undefined") w.supaHeaders = function (extra) { return getAuthHeaders(extra); };
  if (typeof supaFetchAll === "undefined") {
    w.supaFetchAll = async function (ruta, lote) {
      lote = lote || 1000;
      var sep = ruta.indexOf("?") === -1 ? "?" : "&", desde = 0, todo = [];
      for (var vuelta = 0; vuelta < 50; vuelta++) {
        var res = await fetch(SUPA_URL + "/rest/v1/" + ruta + sep + "limit=" + lote + "&offset=" + desde, {
          headers: await supaHeaders({ "Accept": "application/json", "Range-Unit": "items", "Range": desde + "-" + (desde + lote - 1) })
        });
        if (!res.ok) { var txt = await res.text(); throw new Error("Supabase " + res.status + ": " + txt.slice(0, 120)); }
        var parte = await res.json();
        todo = todo.concat(parte);
        if (!Array.isArray(parte) || parte.length < lote) break;
        desde += lote;
      }
      return todo;
    };
  }
  if (typeof usuarioSesion === "undefined") w.usuarioSesion = null;
  if (typeof nombreSesion === "undefined") {
    // Mismo criterio de Seguimiento: el nombre sale de la sesión, no se escribe a mano
    w.nombreSesion = function () {
      if (!w.usuarioSesion) return "";
      var meta = w.usuarioSesion.user_metadata || {};
      if (meta.full_name) return meta.full_name;
      if (meta.nombre) return meta.nombre;
      var local = (w.usuarioSesion.email || "").split("@")[0].replace(/[._-]+/g, " ");
      return local.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    };
  }
  if (typeof fmt === "undefined") w.fmt = function (n) { if (!n) return "$0"; return "$ " + Math.round(n).toLocaleString("es-CO"); };
  if (typeof ouEsc === "undefined") w.ouEsc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
})();

/* ── Montaje: dibuja el panel (mismo marcado de Seguimiento) y carga los títulos ── */
const ICA_MARKUP = "  <div id=\"ica-vista-2026\">\n    <div class=\"loader\" id=\"i26-loading\" style=\"display:none\">\n      <div class=\"load-spin\"></div>\n      <p>Cargando títulos remitidos...</p>\n    </div>\n    <div id=\"i26-error\" style=\"display:none;background:rgba(220,38,38,.12);border:1.5px solid rgba(220,38,38,.3);border-radius:14px;padding:24px;text-align:center;color:#fca5a5;margin-bottom:16px\"></div>\n\n    <div id=\"i26-contenido\" style=\"display:none\">\n      <div class=\"i26-head\">\n        <div>\n          <div class=\"i26-head-t\">Recaudo coactivo · ICA 2026</div>\n          <div class=\"i26-head-s\">Títulos remitidos a Ejecuciones Fiscales (remisiones 2025–2026) · <span id=\"i26-actualizado\"></span></div>\n        </div>\n        <div class=\"i26-head-r\">\n          <span class=\"i26-vivo off\" id=\"i26-vivo\">○ Conectando…</span>\n          <button class=\"cl-btn\" onclick=\"i26Cargar()\">🔄 Recargar</button>\n          <button class=\"cl-btn\" onclick=\"i26Exportar()\">⬇️ Excel</button>\n          <button class=\"cl-btn primary\" onclick=\"i26Abrir(null)\">➕ Nuevo título</button>\n        </div>\n      </div>\n\n      <div class=\"cartera-card\" id=\"i26-cartera\"></div>\n      <div class=\"stats-grid\" id=\"i26-stats\"></div>\n\n      <div class=\"section-title\">🚨 Qué requiere atención</div>\n      <div class=\"i26-alertas\" id=\"i26-alertas\"></div>\n\n      <div class=\"gr-grid\">\n        <div class=\"gr-card\">\n          <div class=\"gr-t\">Valor recuperable por área</div>\n          <div class=\"i26-bars\" id=\"i26-bar-area\"></div>\n          <div class=\"i26-conc\" id=\"i26-conc\"></div>\n        </div>\n        <div class=\"gr-card\">\n          <div class=\"gr-t\">12 títulos de mayor valor</div>\n          <div class=\"i26-bars\" id=\"i26-bar-top\"></div>\n        </div>\n      </div>\n\n      <div class=\"i26-nota\">\n        <b>Cómo se calcula.</b> El valor recuperable suma solo los títulos <b>Recuperables</b>. La <b>prescripción</b> se estima en\n        5 años (art. 817 E.T.) contados desde la ejecutoria o, si ya se notificó el mandamiento de pago, desde esa notificación\n        (art. 818 E.T.); <b>no descuenta suspensiones</b>, así que es una alerta, no un cómputo definitivo. Sin fecha de ejecutoria\n        no hay cálculo: por eso cargar esas fechas es la primera tarea.\n      </div>\n\n      <div class=\"section-title\">📑 Detalle y gestión de títulos</div>\n      <div class=\"ou-toolbar\">\n        <input type=\"text\" id=\"i26-q\" placeholder=\"🔍 Contribuyente, NIT, radicado, factura, correo…\" oninput=\"i26Filtro('q',this.value)\">\n        <select id=\"i26-f-foco\"   onchange=\"i26Filtro('foco',this.value)\"></select>\n        <select id=\"i26-f-area\"   onchange=\"i26Filtro('area',this.value)\"><option value=\"\">Todas las áreas</option></select>\n        <select id=\"i26-f-clasif\" onchange=\"i26Filtro('clasif',this.value)\"><option value=\"\">Toda clasificación</option></select>\n        <select id=\"i26-f-estado\" onchange=\"i26Filtro('estado',this.value)\"><option value=\"\">Todo estado</option></select>\n        <select id=\"i26-f-resp\"   onchange=\"i26Filtro('resp',this.value)\"><option value=\"\">Todo responsable</option></select>\n        <label class=\"ou-chk i26-chk-mios\"><input type=\"checkbox\" id=\"i26-f-mios\" onchange=\"i26Filtro('mios',this.checked)\"> 👤 Mis títulos</label>\n        <span class=\"ou-conteo\" id=\"i26-conteo\"></span>\n      </div>\n\n      <div class=\"i26-bulk\" id=\"i26-bulk\">\n        <span>☑️ <b id=\"i26-bulk-n\">0</b> seleccionados · <b id=\"i26-bulk-v\">$0</b></span>\n        <button class=\"cl-btn primary\" onclick=\"i26AbrirAsignar()\">👤 Asignar responsable…</button>\n        <button class=\"cl-btn\" onclick=\"i26SelLimpiar()\">✕ Quitar selección</button>\n      </div>\n\n      <div class=\"table-wrap\">\n        <table class=\"i26-tabla\">\n          <thead><tr>\n            <th class=\"i26-ck\"><input type=\"checkbox\" id=\"i26-ck-all\" title=\"Seleccionar todos los filtrados\" onclick=\"i26SelTodos(this.checked)\"></th>\n            <th class=\"i26-th\" onclick=\"i26Orden('contribuyente')\">Contribuyente</th>\n            <th class=\"i26-th\" onclick=\"i26Orden('area')\">Área · Vigencia</th>\n            <th class=\"i26-th\" onclick=\"i26Orden('valor')\" style=\"text-align:right\">Valor ($)</th>\n            <th class=\"i26-th\" onclick=\"i26Orden('estado_proceso')\">Estado</th>\n            <th class=\"i26-th\" onclick=\"i26Orden('prioridad')\">Prescripción ↕</th>\n            <th class=\"i26-th\" onclick=\"i26Orden('responsable')\">Responsable</th>\n            <th>Acción</th>\n          </tr></thead>\n          <tbody id=\"i26-tbody\"></tbody>\n        </table>\n      </div>\n      <div class=\"ou-pager\" id=\"i26-pager\"></div>\n    </div>\n  </div>\n<div class=\"ou-modal-bg\" id=\"i26-modal-bg\" style=\"display:none\" onclick=\"if(event.target===this)i26Cerrar()\">\n  <div class=\"ou-modal\">\n    <div class=\"ou-modal-head\">\n      <div>\n        <div class=\"ou-modal-title\" id=\"i26-m-titulo\">Título</div>\n        <div class=\"ou-modal-sub\" id=\"i26-m-sub\"></div>\n      </div>\n      <button class=\"ou-modal-x\" onclick=\"i26Cerrar()\" aria-label=\"Cerrar\">✕</button>\n    </div>\n    <div class=\"ou-modal-body\">\n      <div class=\"ou-fgroup-title\">⚖️ Gestión del proceso <span>— lo que se actualiza día a día</span></div>\n      <div class=\"ou-grid2\">\n        <label>Estado del proceso\n          <select id=\"i26-f-estado-p\"></select></label>\n        <label>Etapa\n          <select id=\"i26-f-etapa\"></select></label>\n        <label>Responsable\n          <input type=\"text\" id=\"i26-f-resp-p\" list=\"i26-dl-resp\" placeholder=\"Abogado a cargo\"></label>\n        <label>Fecha última gestión\n          <input type=\"date\" id=\"i26-f-fecha\"></label>\n        <label>Valor recaudado ($)\n          <input type=\"number\" id=\"i26-f-recaudo\" min=\"0\" step=\"1\" oninput=\"i26PintarSaldo()\"></label>\n        <label>Clasificación\n          <select id=\"i26-f-clasif-p\" onchange=\"i26PintarSaldo()\"></select></label>\n        <label class=\"ou-full\">Observaciones\n          <textarea id=\"i26-f-obs\" rows=\"3\" placeholder=\"Actuaciones, requerimientos, pendientes…\"></textarea></label>\n      </div>\n      <div class=\"i26-saldo\" id=\"i26-saldo\"></div>\n\n      <div class=\"ou-fgroup-title\">📅 Términos <span>— base del cálculo de prescripción</span></div>\n      <div class=\"ou-grid2\">\n        <label>Fecha de ejecutoria del título\n          <input type=\"date\" id=\"i26-f-ejec\" oninput=\"i26PintarPresc()\"></label>\n        <label>Notificación del mandamiento de pago\n          <input type=\"date\" id=\"i26-f-mand\" oninput=\"i26PintarPresc()\"></label>\n      </div>\n      <div class=\"i26-presc-box\" id=\"i26-presc\"></div>\n\n      <div class=\"ou-fgroup-title\">📨 Requerimiento a otra área <span>— cuando el título depende de un tercero</span></div>\n      <div class=\"ou-grid2\">\n        <label class=\"ou-full\">Requerido a\n          <input type=\"text\" id=\"i26-f-reqa\" list=\"i26-dl-reqa\" placeholder=\"Ej.: Rentas — estado de cuenta\"></label>\n        <label>Fecha del requerimiento\n          <input type=\"date\" id=\"i26-f-freq\"></label>\n        <label>Fecha de respuesta\n          <input type=\"date\" id=\"i26-f-fresp\"></label>\n      </div>\n\n      <div class=\"ou-fgroup-title\">🧾 Datos del título <span>— tal como se remitió</span></div>\n      <div class=\"ou-grid2\">\n        <label>N.º (fila de la base)\n          <input type=\"number\" id=\"i26-f-n\" disabled></label>\n        <label>Área que remite\n          <select id=\"i26-f-area-p\"></select></label>\n        <label class=\"ou-full\">Contribuyente *\n          <input type=\"text\" id=\"i26-f-contrib\"></label>\n        <label>NIT\n          <input type=\"text\" id=\"i26-f-nit\"></label>\n        <label>Vigencias\n          <input type=\"text\" id=\"i26-f-vig\" placeholder=\"2020 2021 2022\" oninput=\"i26PintarPresc()\"></label>\n        <label>Valor remitido ($)\n          <input type=\"number\" id=\"i26-f-valor\" step=\"1\" oninput=\"i26PintarSaldo()\"></label>\n        <label>Factura\n          <input type=\"text\" id=\"i26-f-factura\" oninput=\"i26ChequearFactura()\"></label>\n        <label>Radicado de remisión\n          <input type=\"text\" id=\"i26-f-rad\"></label>\n        <label>Remisión (carpeta)\n          <input type=\"text\" id=\"i26-f-remision\" list=\"i26-dl-rem\"></label>\n        <label>Correo\n          <input type=\"text\" id=\"i26-f-correo\"></label>\n        <label>Alerta ⚠ (verificar)\n          <input type=\"text\" id=\"i26-f-alerta-p\" placeholder=\"Vacío si la cifra está verificada\"></label>\n        <label class=\"ou-full\">Link del expediente (Drive)\n          <input type=\"text\" id=\"i26-f-url\" placeholder=\"https://drive.google.com/…\"></label>\n      </div>\n      <div class=\"i26-aviso\" id=\"i26-aviso-fact\"></div>\n      <div class=\"ou-m-msg\" id=\"i26-m-msg\"></div>\n\n      <div class=\"ou-fgroup-title\" id=\"i26-log-t\">🕓 Historial de cambios</div>\n      <div class=\"ou-log-wrap\" id=\"i26-log\"></div>\n    </div>\n    <div class=\"ou-modal-foot\">\n      <button class=\"ou-btn-sec\" onclick=\"i26Cerrar()\">Cancelar</button>\n      <button class=\"ou-btn-pri\" id=\"i26-btn-guardar\" onclick=\"i26Guardar()\">💾 Guardar</button>\n    </div>\n  </div>\n</div>\n<div class=\"ou-modal-bg\" id=\"i26a-bg\" style=\"display:none\" onclick=\"if(event.target===this)i26CerrarAsignar()\">\n  <div class=\"ou-modal\" style=\"max-width:600px\">\n    <div class=\"ou-modal-head\">\n      <div>\n        <div class=\"ou-modal-title\">Asignar responsable</div>\n        <div class=\"ou-modal-sub\" id=\"i26a-sub\"></div>\n      </div>\n      <button class=\"ou-modal-x\" onclick=\"i26CerrarAsignar()\" aria-label=\"Cerrar\">✕</button>\n    </div>\n    <div class=\"ou-modal-body\">\n      <div class=\"i26-modo\">\n        <label><input type=\"radio\" name=\"i26a-modo\" value=\"uno\" checked onchange=\"i26PrevAsignar()\"> Todos a una persona</label>\n        <label><input type=\"radio\" name=\"i26a-modo\" value=\"reparto\" onchange=\"i26PrevAsignar()\"> Reparto equilibrado por valor</label>\n      </div>\n      <label id=\"i26a-l-uno\">Responsable\n        <input type=\"text\" id=\"i26a-uno\" list=\"i26-dl-resp\" placeholder=\"Nombre del abogado\" oninput=\"i26PrevAsignar()\"></label>\n      <label id=\"i26a-l-rep\" style=\"display:none\">Equipo (un nombre por línea)\n        <textarea id=\"i26a-equipo\" rows=\"5\" placeholder=\"Nombre Apellido&#10;Nombre Apellido\" oninput=\"i26PrevAsignar()\"></textarea></label>\n      <div class=\"i26-prev\" id=\"i26a-prev\"></div>\n      <div class=\"ou-m-msg\" id=\"i26a-msg\"></div>\n    </div>\n    <div class=\"ou-modal-foot\">\n      <button class=\"ou-btn-sec\" onclick=\"i26CerrarAsignar()\">Cancelar</button>\n      <button class=\"ou-btn-pri\" id=\"i26a-btn\" onclick=\"i26AplicarAsignar()\">✅ Aplicar asignación</button>\n    </div>\n  </div>\n</div>\n<datalist id=\"i26-dl-resp\"></datalist>\n<datalist id=\"i26-dl-rem\"></datalist>";
let icaMontado = false;
async function icaMontar() {
  const raiz = document.getElementById("ica-root");
  if (!raiz) return;
  if (!icaMontado) {
    raiz.innerHTML = ICA_MARKUP;
    if (window.ICA_TARJETAS) icaActivarTarjetas();
    icaMontado = true;
  }
  try {
    if (typeof sbAuth !== "undefined" && sbAuth && !window.usuarioSesion) {
      const { data } = await sbAuth.auth.getSession();
      if (data && data.session) window.usuarioSesion = data.session.user;
    }
  } catch (e) {}
  if (!i26Datos) await i26Cargar();
}

/* ═══════════════════════════════════════════════════════════════════
   TEODORO · SEGUIMIENTO → ICA 2026
   Títulos remitidos a cobro coactivo: tablero + gestión en línea.
   Fuente: Supabase · ica_titulos_remitidos (+ ica_titulos_bitacora)
   Reutiliza: SUPA_URL, supaHeaders, supaFetch, supaFetchAll, sbAuth,
              nombreSesion, fmt, ouEsc (definidos en el script principal).
   Desarrollado por Jeison Maya · 2026
   ═══════════════════════════════════════════════════════════════════ */
const I26_TABLA = 'ica_titulos_remitidos';
const I26_BITA  = 'ica_titulos_bitacora';
const I26_CLASIF = ['Recuperable','Sin valor / pendiente','Mismo título (factura repetida)','No remitido'];
const I26_CLASIF_CSS = {'Recuperable':'rec','Sin valor / pendiente':'pen','Mismo título (factura repetida)':'dup','No remitido':'no'};
const I26_ESTADOS = ['Sin iniciar','Activo','Convenio','Cancelado','Terminado'];
const I26_ESTADO_CSS = {'Sin iniciar':'sin','Activo':'act','Convenio':'conv','Cancelado':'canc','Terminado':'term'};
const I26_ESTADO_CARD = {'Sin iniciar':'navy','Activo':'blue','Convenio':'gold','Cancelado':'green','Terminado':'purple'};
const I26_AREAS = {
  'FISCALIZACION':'Fiscalización',
  'TITULOS - COBRO COACTIVO':'Títulos ICA (Rentas)',
  'JURIDICA REQUIERE':'Jurídica requiere',
  'REQUIERE JURIDICA':'Jurídica requiere',
  'AUTORRETENCION':'Autorretención',
  'DECLARACIONES':'Declaraciones',
  'PERMANENTES':'Permanentes',
  'OCASIONALES':'Ocasionales'
};
const I26_ETAPAS_BASE = [
  {codigo:'ejecutoria',           nombre:'Ejecutoria del título',   grupo:'Título'},
  {codigo:'cobro_persuasivo',     nombre:'Cobro persuasivo',        grupo:'Persuasivo'},
  {codigo:'mandamiento_pago',     nombre:'Mandamiento de pago',     grupo:'Persuasivo'},
  {codigo:'investigacion_bienes', nombre:'Investigación de bienes', grupo:'Cautelar'},
  {codigo:'medida_cautelar',      nombre:'Medida cautelar',         grupo:'Cautelar'}
];
// Filtros de foco (alertas). La clave es la misma en tarjetas y en el select.
const I26_FOCOS = [
  {k:'',          t:'Todos los títulos'},
  {k:'presc',     t:'⏳ Prescripción vencida o < 6 meses'},
  {k:'sinfecha',  t:'📅 Sin fecha de ejecutoria'},
  {k:'sinresp',   t:'👤 Sin responsable'},
  {k:'sinmov',    t:'💤 Sin gestión > 30 días'},
  {k:'esperando', t:'📨 Pendientes de otra área'},
  {k:'verificar', t:'⚠ Cifra por verificar'}
];
const I26_POR_PAG = 50;
const I26_DIAS_SIN_MOV = 30;
const I26_KEY_EQUIPO = 'i26_equipo_v1';

let i26Datos = null, i26Etapas = I26_ETAPAS_BASE, i26Edit = null, i26Nuevo = false;
let i26Canal = null, i26Guardando = false, i26Timer = null;
const i26Sel = new Set();
const i26F = { q:'', foco:'', area:'', clasif:'', estado:'', resp:'', mios:false, pag:1, sortK:'prioridad', sortDir:1 };

const i26$ = id => document.getElementById(id);
const i26Num = v => (v === null || v === undefined || v === '') ? null : Number(v);
const i26Txt = v => (v === null || v === undefined) ? '' : String(v);
const i26AreaLbl = a => a ? (I26_AREAS[a] || a) : 'Sin área';
const i26NitNorm = n => i26Txt(n).replace(/[^0-9]/g, '').replace(/^0+/, '');
const i26Clave = s => i26Txt(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
function i26EtapaNombre(c){ if(!c) return ''; const e = i26Etapas.find(x => x.codigo === c); return e ? e.nombre : c; }
function i26Saldo(r){ return Math.max(0, (r.valor || 0) - (r.valor_recaudado || 0)); }
function i26UrlOk(u){ return /^https:\/\/[^\s"'<>]+$/i.test(i26Txt(u).trim()); }

/* ── Fechas (siempre en hora local, sin desfase de zona) ── */
function i26Fecha(s){ const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(i26Txt(s)); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function i26Hoy(){ const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function i26Dias(desde, hasta){ return Math.round((hasta - desde) / 86400000); }
function i26FmtF(d){ return d ? d.toLocaleDateString('es-CO', {day:'2-digit', month:'2-digit', year:'numeric'}) : ''; }
function i26VigMin(v){ const a = (i26Txt(v).match(/\b(19|20)\d{2}\b/g) || []).map(Number); return a.length ? Math.min(...a) : null; }

/* ── Reglas de negocio ── */
// Un título "en gestión": recuperable y con proceso no cerrado
function i26EnGestion(r){ return r.clasificacion === 'Recuperable' && !['Cancelado','Terminado'].includes(r.estado_proceso || 'Sin iniciar'); }

// Prescripción: 5 años (art. 817 E.T.) desde la ejecutoria; la notificación
// del mandamiento interrumpe y el término corre de nuevo (art. 818 E.T.).
// No descuenta suspensiones: es una alerta, no un cómputo definitivo.
function i26Presc(r){
  if(!i26EnGestion(r) && r.clasificacion !== 'Sin valor / pendiente') return {nivel:'na'};
  if(['Cancelado','Terminado'].includes(r.estado_proceso || '')) return {nivel:'na'};
  const mand = i26Fecha(r.fecha_mandamiento), ejec = i26Fecha(r.fecha_ejecutoria);
  const base = mand || ejec;
  if(!base){
    const anio = i26VigMin(r.vigencias);
    return {nivel:'sinfecha', anio, antigua: !!anio && anio <= new Date().getFullYear() - 5};
  }
  const vence = new Date(base); vence.setFullYear(vence.getFullYear() + 5);
  const dias = i26Dias(i26Hoy(), vence);
  const nivel = dias < 0 ? 'venc' : dias <= 180 ? 'crit' : dias <= 365 ? 'alrt' : 'ok';
  return {nivel, vence, dias, interrumpida: !!mand};
}
const I26_RANGO = {venc:0, crit:1, alrt:2, sinfecha:3, ok:4, na:9};
function i26Rango(r){
  const p = i26Presc(r);
  let k = I26_RANGO[p.nivel];
  if(p.nivel === 'sinfecha' && !p.antigua) k = 3.5;
  if(r.clasificacion !== 'Recuperable') k += 10;       // lo recuperable primero
  return k;
}
function i26DiasSinGestion(r){ const f = i26Fecha(r.fecha_gestion); return f ? i26Dias(f, i26Hoy()) : null; }
function i26Esperando(r){
  if(r.fecha_requerimiento && !r.fecha_respuesta) return i26Dias(i26Fecha(r.fecha_requerimiento), i26Hoy()) > I26_DIAS_SIN_MOV;
  return r.clasificacion === 'Sin valor / pendiente' && !r.fecha_requerimiento;
}
function i26EsMio(r){ const yo = i26Clave(typeof nombreSesion === 'function' ? nombreSesion() : ''); return !!yo && i26Clave(r.responsable) === yo; }
function i26CumpleFoco(r, foco){
  switch(foco){
    case 'presc':     { const n = i26Presc(r).nivel; return i26EnGestion(r) && (n === 'venc' || n === 'crit'); }
    case 'sinfecha':  return i26EnGestion(r) && i26Presc(r).nivel === 'sinfecha';
    case 'sinresp':   return i26EnGestion(r) && !i26Txt(r.responsable).trim();
    case 'sinmov':    { const d = i26DiasSinGestion(r); return i26EnGestion(r) && (d === null || d > I26_DIAS_SIN_MOV); }
    case 'esperando': return i26Esperando(r);
    case 'verificar': return !!i26Txt(r.alerta).trim();
    default:          return true;
  }
}

function i26Norm(r){
  return Object.assign({}, r, {
    valor: i26Num(r.valor),
    valor_recaudado: i26Num(r.valor_recaudado) || 0,
    n_fila: Number(r.n_fila)
  });
}

/* ── Selector de vista dentro del panel ICA ── */
function i26Vista(v){
  i26$('ica-vista-cartera').style.display = v === 'cartera' ? '' : 'none';
  i26$('ica-vista-2026').style.display    = v === '2026'    ? '' : 'none';
  document.querySelectorAll('.i26-sw button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if(v === '2026' && !i26Datos) i26Cargar();
}
function i26Refrescar(){ if(i26Datos) i26Cargar(); }

/* ── Carga ── */
async function i26Cargar(){
  const load = i26$('i26-loading'), err = i26$('i26-error'), cont = i26$('i26-contenido');
  load.style.display = 'block'; err.style.display = 'none';
  if(!i26Datos) cont.style.display = 'none';
  try{
    const [filas, etapas] = await Promise.all([
      supaFetchAll(I26_TABLA + '?select=*&order=n_fila.asc'),
      supaFetch('etapas_coactivo?select=codigo,nombre,grupo,orden&activo=eq.true&order=orden.asc').catch(() => null)
    ]);
    if(!Array.isArray(filas) || !filas.length){
      throw new Error('La tabla ' + I26_TABLA + ' respondió vacía. Verifica la carga inicial y que tu sesión esté activa (RLS solo permite usuarios autenticados).');
    }
    i26Datos = filas.map(i26Norm);
    if(Array.isArray(etapas) && etapas.length) i26Etapas = etapas;
    [...i26Sel].forEach(id => { if(!i26Datos.some(r => r.id === id)) i26Sel.delete(id); });
    i26LlenarSelects();
    i26Render();
    cont.style.display = '';
    i26$('i26-actualizado').textContent = 'cargado ' + new Date().toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'});
    const mios = i26$('i26-f-mios');
    if(mios && !(typeof nombreSesion === 'function' && nombreSesion())){ mios.disabled = true; mios.parentElement.title = 'Requiere sesión'; }
    i26Suscribir();
  }catch(e){
    console.warn('[ICA 2026]', e);
    err.innerHTML = '<div style="font-size:32px;margin-bottom:10px">🔌</div>'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:6px">No se pudieron cargar los títulos ICA 2026</div>'
      + '<div style="font-size:12px;color:rgba(252,165,165,.75);margin-bottom:12px">' + ouEsc(e.message) + '</div>'
      + '<button onclick="i26Cargar()" style="background:#2d8de8;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer">Reintentar</button>';
    err.style.display = 'block';
  }finally{
    load.style.display = 'none';
  }
}

/* ── Opciones de filtros y de los modales ── */
function i26Opciones(sel, valores, primera, etiqueta){
  const actual = sel.value;
  sel.innerHTML = (primera != null ? '<option value="">' + ouEsc(primera) + '</option>' : '')
    + valores.map(v => '<option value="' + ouEsc(v) + '">' + ouEsc(etiqueta ? etiqueta(v) : v) + '</option>').join('');
  if([...sel.options].some(o => o.value === actual)) sel.value = actual;
}
function i26Responsables(){
  const s = new Set(i26Datos.map(r => i26Txt(r.responsable).trim()).filter(Boolean));
  const yo = typeof nombreSesion === 'function' ? nombreSesion() : '';
  if(yo && ![...s].some(x => i26Clave(x) === i26Clave(yo))) s.add(yo);
  return [...s].sort((a, b) => a.localeCompare(b, 'es'));
}
function i26LlenarSelects(){
  const areas = [...new Set(Object.keys(I26_AREAS).filter(a => a !== 'REQUIERE JURIDICA')
                 .concat(i26Datos.map(r => r.area).filter(Boolean)))];
  const areasData = [...new Set(i26Datos.map(r => r.area).filter(Boolean))].sort();
  i26$('i26-f-foco').innerHTML = I26_FOCOS.map(f => '<option value="' + f.k + '">' + ouEsc(f.t) + '</option>').join('');
  i26$('i26-f-foco').value = i26F.foco;
  i26Opciones(i26$('i26-f-area'), areasData, 'Todas las áreas', i26AreaLbl);
  i26Opciones(i26$('i26-f-clasif'), I26_CLASIF, 'Toda clasificación');
  i26Opciones(i26$('i26-f-estado'), I26_ESTADOS, 'Todo estado');
  const respsData = [...new Set(i26Datos.map(r => i26Txt(r.responsable).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  i26Opciones(i26$('i26-f-resp'), ['__sin'].concat(respsData), 'Todo responsable', v => v === '__sin' ? 'Sin asignar' : v);
  i26Opciones(i26$('i26-f-estado-p'), I26_ESTADOS, null);
  i26Opciones(i26$('i26-f-clasif-p'), I26_CLASIF, null);
  i26Opciones(i26$('i26-f-area-p'), areas, '— Sin área —', i26AreaLbl);
  const grupos = {};
  i26Etapas.forEach(e => { const g = e.grupo || 'Otras'; (grupos[g] = grupos[g] || []).push(e); });
  i26$('i26-f-etapa').innerHTML = '<option value="">— Sin etapa —</option>' + Object.entries(grupos).map(([g, es]) =>
    '<optgroup label="' + ouEsc(g) + '">' + es.map(e => '<option value="' + ouEsc(e.codigo) + '">' + ouEsc(e.nombre) + '</option>').join('') + '</optgroup>').join('');
  i26$('i26-dl-resp').innerHTML = i26Responsables().map(r => '<option value="' + ouEsc(r) + '">').join('');
  const rems = [...new Set(i26Datos.map(r => r.remision).filter(Boolean))].sort();
  i26$('i26-dl-rem').innerHTML = rems.map(r => '<option value="' + ouEsc(r) + '">').join('');
}

/* ── Render general ── */
function i26Render(){
  if(!i26Datos) return;
  i26RenderResumen();
  i26RenderAlertas();
  i26RenderTabla();
}

function i26RenderResumen(){
  const todos = i26Datos;
  const rec = todos.filter(r => r.clasificacion === 'Recuperable');
  const total   = rec.reduce((s, r) => s + (r.valor || 0), 0);
  const recaudo = rec.reduce((s, r) => s + (r.valor_recaudado || 0), 0);
  const saldo   = rec.reduce((s, r) => s + i26Saldo(r), 0);
  const nCon = new Set(rec.map(r => i26NitNorm(r.nit) || i26Clave(r.contribuyente)).filter(Boolean)).size;
  const nRem = new Set(todos.map(r => r.remision).filter(Boolean)).size;
  const pRec = total > 0 ? (recaudo / total * 100) : 0;

  i26$('i26-cartera').innerHTML =
    '<div class="cartera-main"><div class="cartera-label">Valor recuperable · ICA remitido a coactivo</div>'
    + '<div class="cartera-value">' + fmt(total) + '</div>'
    + '<div class="cartera-sub">' + rec.length + ' títulos recuperables de ' + todos.length + ' registros · '
    + nCon + ' contribuyentes · ' + nRem + ' remisiones</div></div>'
    + '<div class="cartera-recaudo"><div class="cartera-recaudo-label">Recaudado</div>'
    + '<div class="cartera-recaudo-val">' + fmt(recaudo) + '</div>'
    + '<div class="cartera-pct">' + pRec.toFixed(1) + '% · saldo ' + fmt(saldo) + '</div></div>';

  i26$('i26-stats').innerHTML = I26_ESTADOS.map(est => {
    const g = rec.filter(r => (r.estado_proceso || 'Sin iniciar') === est);
    const v = g.reduce((s, r) => s + (r.valor || 0), 0);
    const on = i26F.estado === est && i26F.clasif === 'Recuperable';
    return '<div class="stat-card ' + I26_ESTADO_CARD[est] + ' clic' + (on ? ' on' : '') + '" onclick="i26FiltrarEstado(\'' + est + '\')">'
      + '<div class="stat-label">' + est + '</div>'
      + '<div class="stat-value">' + g.length.toLocaleString('es-CO') + '</div>'
      + '<div class="stat-sub">' + fmt(v) + '</div>'
      + '<span class="stat-ver">' + (on ? '✓ filtrando — clic para quitar' : 'Ver títulos →') + '</span></div>';
  }).join('');

  // Barras: ancho = participación en el total recuperable (no relativo al máximo)
  const porArea = {};
  rec.forEach(r => { const k = i26AreaLbl(r.area); porArea[k] = (porArea[k] || 0) + (r.valor || 0); });
  i26Barras(i26$('i26-bar-area'), Object.entries(porArea).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({n, v})), total);
  const orden = rec.slice().sort((a, b) => (b.valor || 0) - (a.valor || 0));
  i26Barras(i26$('i26-bar-top'), orden.slice(0, 12).map(r => ({n: '#' + r.n_fila + '  ' + i26Txt(r.contribuyente).slice(0, 38), v: r.valor || 0})), total);

  // Concentración de la cartera
  const acum = n => orden.slice(0, n).reduce((s, r) => s + (r.valor || 0), 0);
  let n80 = 0, s80 = 0;
  for(const r of orden){ s80 += (r.valor || 0); n80++; if(total > 0 && s80 / total >= 0.8) break; }
  const cortes = [5, 12, 20].filter(n => n < orden.length);
  i26$('i26-conc').innerHTML = total > 0
    ? '<div class="i26-conc-t">📌 <b>' + n80 + ' de ' + orden.length + ' títulos</b> concentran el <b>80%</b> del valor recuperable. '
      + 'Gestionar bien los 12 mayores mueve el <b>' + (acum(12) / total * 100).toFixed(0) + '%</b> de la cartera.</div>'
      + '<div class="i26-bars">' + cortes.map(n => {
          const p = acum(n) / total * 100;
          return '<div><div class="i26-bl"><span class="nm">Top ' + n + ' títulos</span><span class="vv">' + fmt(acum(n)) + '<span class="pp">' + p.toFixed(1) + '%</span></span></div>'
            + '<div class="i26-track"><div class="i26-fill" style="width:' + p.toFixed(2) + '%"></div></div></div>';
        }).join('') + '</div>'
    : '';
}

function i26Barras(host, filas, total){
  if(!filas.length){ host.innerHTML = '<div class="gr-vacio">Sin títulos recuperables</div>'; return; }
  host.innerHTML = filas.map(f => {
    const p = total > 0 ? f.v / total * 100 : 0;
    return '<div><div class="i26-bl"><span class="nm" title="' + ouEsc(f.n) + '">' + ouEsc(f.n) + '</span>'
      + '<span class="vv">' + fmt(f.v) + '<span class="pp">' + p.toFixed(1) + '%</span></span></div>'
      + '<div class="i26-track"><div class="i26-fill" style="width:' + p.toFixed(2) + '%"></div></div></div>';
  }).join('');
}

function i26RenderAlertas(){
  const D = i26Datos;
  const grupo = k => D.filter(r => i26CumpleFoco(r, k));
  const val = g => g.reduce((s, r) => s + (r.clasificacion === 'Recuperable' ? (r.valor || 0) : 0), 0);
  const presc = grupo('presc'), venc = presc.filter(r => i26Presc(r).nivel === 'venc');
  const sinf = grupo('sinfecha'), sinfAnt = sinf.filter(r => i26Presc(r).antigua);
  const sinr = grupo('sinresp'), sinm = grupo('sinmov');
  const esp = grupo('esperando');
  const espReq = esp.filter(r => r.fecha_requerimiento), espSin = esp.length - espReq.length;
  const ver = grupo('verificar');
  const tarjetas = [
    {k:'presc',     c:'#ef4444', t:'Prescripción',          n:presc.length, s: presc.length ? fmt(val(presc)) + (venc.length ? ' · ' + venc.length + ' ya vencidos' : ' en riesgo') : 'Nada vence en 6 meses'},
    {k:'sinfecha',  c:'#f59e0b', t:'Sin fecha de ejecutoria', n:sinf.length, s: sinfAnt.length ? sinfAnt.length + ' con vigencias de hace 5+ años' : 'Sin base para calcular términos'},
    {k:'sinresp',   c:'#60a5fa', t:'Sin responsable',       n:sinr.length,  s: sinr.length ? fmt(val(sinr)) + ' sin dueño' : 'Todo asignado'},
    {k:'sinmov',    c:'#a78bfa', t:'Sin gestión > ' + I26_DIAS_SIN_MOV + ' días', n:sinm.length, s:'Incluye los que no tienen gestión registrada'},
    {k:'esperando', c:'#2dd4bf', t:'Pendientes de otra área', n:esp.length, s: espReq.length + ' requeridos sin respuesta > ' + I26_DIAS_SIN_MOV + ' d · ' + espSin + ' sin requerimiento registrado'},
    {k:'verificar', c:'#f5c050', t:'Cifra por verificar ⚠', n:ver.length,   s:'Validar contra declaración o estado de cuenta'}
  ];
  i26$('i26-alertas').innerHTML = tarjetas.map(a =>
    '<div class="i26-al' + (a.n ? '' : ' cero') + (i26F.foco === a.k ? ' on' : '') + '" style="--c:' + a.c + '" onclick="i26FiltrarFoco(\'' + a.k + '\')">'
    + '<div class="i26-al-t">' + ouEsc(a.t) + '</div><div class="i26-al-n">' + a.n + '</div><div class="i26-al-s">' + ouEsc(a.s) + '</div></div>').join('');
}

/* ── Filtros, orden y tabla ── */
function i26Filtro(k, v){ i26F[k] = v; i26F.pag = 1; i26RenderTabla(); if(k === 'estado' || k === 'clasif') i26RenderResumen(); if(k === 'foco') i26RenderAlertas(); }
function i26IrTabla(){ i26$('i26-tbody').closest('.table-wrap').scrollIntoView({behavior:'smooth', block:'start'}); }
function i26FiltrarEstado(est){
  const quitar = i26F.estado === est && i26F.clasif === 'Recuperable';
  i26F.estado = quitar ? '' : est;
  i26F.clasif = quitar ? '' : 'Recuperable';
  i26$('i26-f-estado').value = i26F.estado;
  i26$('i26-f-clasif').value = i26F.clasif;
  i26F.pag = 1;
  i26Render();
  i26IrTabla();
}
function i26FiltrarFoco(k){
  i26F.foco = i26F.foco === k ? '' : k;
  i26$('i26-f-foco').value = i26F.foco;
  i26F.pag = 1;
  i26RenderAlertas(); i26RenderTabla();
  if(i26F.foco) i26IrTabla();
}
function i26Orden(k){
  if(i26F.sortK === k) i26F.sortDir *= -1;
  else { i26F.sortK = k; i26F.sortDir = (k === 'valor') ? -1 : 1; }
  i26RenderTabla();
}
function i26Filtrados(){
  const t = i26F.q.toLowerCase().trim();
  const filas = i26Datos.filter(r => {
    if(i26F.foco   && !i26CumpleFoco(r, i26F.foco)) return false;
    if(i26F.mios   && !i26EsMio(r)) return false;
    if(i26F.area   && r.area !== i26F.area) return false;
    if(i26F.clasif && r.clasificacion !== i26F.clasif) return false;
    if(i26F.estado && (r.estado_proceso || 'Sin iniciar') !== i26F.estado) return false;
    if(i26F.resp === '__sin' && i26Txt(r.responsable).trim()) return false;
    if(i26F.resp && i26F.resp !== '__sin' && i26Txt(r.responsable).trim() !== i26F.resp) return false;
    if(t){
      const hay = [r.contribuyente, r.nit, i26NitNorm(r.nit), r.radicado, r.factura, r.correo, r.n_fila, r.remision]
        .map(i26Txt).join(' ').toLowerCase();
      if(!hay.includes(t)) return false;
    }
    return true;
  });
  const k = i26F.sortK, d = i26F.sortDir;
  filas.sort((a, b) => {
    if(k === 'prioridad'){
      const ra = i26Rango(a), rb = i26Rango(b);
      if(ra !== rb) return (ra - rb) * d;
      const pa = i26Presc(a), pb = i26Presc(b);
      if(pa.dias != null && pb.dias != null && pa.dias !== pb.dias) return (pa.dias - pb.dias) * d;
      return (b.valor || 0) - (a.valor || 0);
    }
    let x = a[k], y = b[k];
    if(k === 'valor' || k === 'n_fila'){ x = x || 0; y = y || 0; } else { x = i26Txt(x).toLowerCase(); y = i26Txt(y).toLowerCase(); }
    return x < y ? -d : x > y ? d : 0;
  });
  return filas;
}

function i26CeldaPresc(r){
  const p = i26Presc(r);
  if(p.nivel === 'na') return '<span style="color:var(--muted)">—</span>';
  if(p.nivel === 'sinfecha'){
    return '<span class="i26-p sinf">Sin fecha</span>'
      + (p.antigua ? '<div class="i26-sub i26-ambar">Vigencia ' + p.anio + ' · revisar</div>' : '');
  }
  const txt = p.nivel === 'venc' ? 'Vencida hace ' + Math.abs(p.dias) + ' d'
            : p.nivel === 'crit' ? 'Vence en ' + p.dias + ' d'
            : p.nivel === 'alrt' ? 'Vence en ' + Math.round(p.dias / 30) + ' meses'
            : 'Vigente';
  return '<span class="i26-p ' + p.nivel + '">' + txt + '</span>'
    + '<div class="i26-sub">' + i26FmtF(p.vence) + (p.interrumpida ? ' · interrumpida' : '') + '</div>';
}

function i26RenderTabla(){
  if(!i26Datos) return;
  const filas = i26Filtrados();
  const paginas = Math.max(1, Math.ceil(filas.length / I26_POR_PAG));
  if(i26F.pag > paginas) i26F.pag = paginas;
  const desde = (i26F.pag - 1) * I26_POR_PAG;
  const vista = filas.slice(desde, desde + I26_POR_PAG);
  const sumaV = filas.reduce((s, r) => s + (r.clasificacion === 'Recuperable' ? (r.valor || 0) : 0), 0);
  i26$('i26-conteo').textContent = filas.length + ' de ' + i26Datos.length + ' títulos · recuperable ' + fmt(sumaV);

  i26$('i26-tbody').innerHTML = vista.length ? vista.map(r => {
    const est = r.estado_proceso || 'Sin iniciar';
    const etapa = i26EtapaNombre(r.etapa);
    const alerta = i26Txt(r.alerta).trim();
    const sg = i26DiasSinGestion(r);
    const sel = i26Sel.has(r.id);
    const drive = i26UrlOk(r.expediente_url)
      ? '<a class="i26-ico" href="' + ouEsc(r.expediente_url.trim()) + '" target="_blank" rel="noopener" title="Abrir carpeta: ' + ouEsc(r.remision) + '" onclick="event.stopPropagation()">📂</a>'
      : '';
    const gestion = !i26EnGestion(r) ? ''
      : sg === null ? '<div class="i26-sub i26-rojo">Sin gestión registrada</div>'
      : '<div class="i26-sub ' + (sg > I26_DIAS_SIN_MOV ? 'i26-rojo' : '') + '">Gestión hace ' + sg + ' d</div>';
    return '<tr class="' + (sel ? 'sel' : '') + '" onclick="i26Abrir(' + Number(r.id) + ')">'
      + '<td class="i26-ck" onclick="event.stopPropagation()"><input type="checkbox" ' + (sel ? 'checked' : '') + ' onchange="i26SelFila(' + Number(r.id) + ',this.checked)"></td>'
      + '<td><div class="i26-nom" title="' + ouEsc(r.contribuyente) + '">' + ouEsc(r.contribuyente || '—') + '</div>'
      +   '<div class="i26-sub">#' + r.n_fila + (r.nit ? ' · NIT ' + ouEsc(r.nit) : '') + (r.radicado ? ' · Rad. ' + ouEsc(r.radicado) : '') + '</div></td>'
      + '<td style="font-size:12px">' + ouEsc(i26AreaLbl(r.area)) + '<div class="i26-sub">' + ouEsc(r.vigencias || 'Sin vigencia') + '</div></td>'
      + '<td style="text-align:right;white-space:nowrap"><span style="font-weight:600;color:#fff">' + (r.valor != null ? fmt(r.valor) : '—') + '</span>'
      +   (alerta ? '<span class="i26-flag" title="' + ouEsc(alerta) + '">⚠</span>' : '')
      +   (r.valor_recaudado ? '<div class="i26-sub" style="color:#86efac">Recaudado ' + fmt(r.valor_recaudado) + '</div>' : '') + '</td>'
      + '<td><div class="i26-dos"><span class="i26-chip ' + (I26_CLASIF_CSS[r.clasificacion] || 'dup') + '">' + ouEsc(r.clasificacion) + '</span>'
      +   '<span class="i26-e ' + (I26_ESTADO_CSS[est] || 'sin') + '">' + ouEsc(est) + (etapa ? ' · ' + ouEsc(etapa) : '') + '</span></div></td>'
      + '<td>' + i26CeldaPresc(r) + '</td>'
      + '<td style="font-size:12px">' + (r.responsable ? '<span style="color:#fff">' + ouEsc(r.responsable) + '</span>' : '<span style="color:var(--muted)">Sin asignar</span>') + gestion + '</td>'
      + '<td><div class="i26-acc"><button class="ou-edit-btn" onclick="event.stopPropagation();i26Abrir(' + Number(r.id) + ')">✏️ Gestionar</button>' + drive + '</div></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:22px">Ningún título coincide con los filtros</td></tr>';

  const todosSel = filas.length > 0 && filas.every(r => i26Sel.has(r.id));
  i26$('i26-ck-all').checked = todosSel;
  i26PintarBulk();

  const pg = i26$('i26-pager');
  if(paginas <= 1){ pg.innerHTML = ''; return; }
  let h = '<button ' + (i26F.pag === 1 ? 'disabled' : '') + ' onclick="i26Pag(' + (i26F.pag - 1) + ')">‹</button>';
  for(let p = 1; p <= paginas; p++) h += '<button class="' + (p === i26F.pag ? 'act' : '') + '" onclick="i26Pag(' + p + ')">' + p + '</button>';
  h += '<button ' + (i26F.pag === paginas ? 'disabled' : '') + ' onclick="i26Pag(' + (i26F.pag + 1) + ')">›</button>';
  pg.innerHTML = h;
}
function i26Pag(p){ i26F.pag = p; i26RenderTabla(); i26IrTabla(); }

/* ── Selección múltiple ── */
function i26SelFila(id, on){ if(on) i26Sel.add(id); else i26Sel.delete(id); i26RenderTabla(); }
function i26SelTodos(on){ i26Filtrados().forEach(r => on ? i26Sel.add(r.id) : i26Sel.delete(r.id)); i26RenderTabla(); }
function i26SelLimpiar(){ i26Sel.clear(); i26RenderTabla(); }
function i26PintarBulk(){
  const b = i26$('i26-bulk');
  const filas = i26Datos.filter(r => i26Sel.has(r.id));
  b.classList.toggle('on', filas.length > 0);
  i26$('i26-bulk-n').textContent = filas.length;
  i26$('i26-bulk-v').textContent = fmt(filas.reduce((s, r) => s + (r.valor || 0), 0));
}

/* ── Asignación masiva ── */
function i26AbrirAsignar(){
  if(!i26Sel.size) return;
  let equipo = '';
  try{ equipo = localStorage.getItem(I26_KEY_EQUIPO) || ''; }catch(e){}
  if(!equipo) equipo = i26Responsables().join('\n');
  i26$('i26a-equipo').value = equipo;
  i26$('i26a-uno').value = '';
  i26$('i26a-msg').className = 'ou-m-msg'; i26$('i26a-msg').textContent = '';
  document.querySelector('input[name="i26a-modo"][value="uno"]').checked = true;
  i26$('i26a-sub').textContent = i26Sel.size + ' títulos seleccionados';
  i26PrevAsignar();
  i26$('i26a-bg').style.display = 'flex';
}
function i26CerrarAsignar(){ i26$('i26a-bg').style.display = 'none'; }
function i26PlanAsignar(){
  const modo = document.querySelector('input[name="i26a-modo"]:checked').value;
  const filas = i26Datos.filter(r => i26Sel.has(r.id));
  const plan = new Map();                                   // id → responsable
  if(modo === 'uno'){
    const n = i26$('i26a-uno').value.trim();
    if(n) filas.forEach(r => plan.set(r.id, n));
    return {modo, plan, filas};
  }
  const equipo = [...new Set(i26$('i26a-equipo').value.split('\n').map(s => s.trim()).filter(Boolean))];
  if(!equipo.length) return {modo, plan, filas, equipo};
  // Reparto equilibrado: mayor valor primero, siempre a quien lleva menos valor acumulado
  const carga = equipo.map(n => ({n, v:0, c:0}));
  filas.slice().sort((a, b) => (b.valor || 0) - (a.valor || 0)).forEach(r => {
    carga.sort((a, b) => a.v - b.v || a.c - b.c);
    carga[0].v += (r.valor || 0); carga[0].c++;
    plan.set(r.id, carga[0].n);
  });
  return {modo, plan, filas, equipo};
}
function i26PrevAsignar(){
  const modo = document.querySelector('input[name="i26a-modo"]:checked').value;
  i26$('i26a-l-uno').style.display = modo === 'uno' ? '' : 'none';
  i26$('i26a-l-rep').style.display = modo === 'reparto' ? '' : 'none';
  const {plan, filas} = i26PlanAsignar();
  const prev = i26$('i26a-prev');
  if(!plan.size){ prev.innerHTML = '<div>Escribe ' + (modo === 'uno' ? 'el responsable' : 'al menos un nombre') + ' para ver la vista previa.</div>'; return; }
  const res = {};
  filas.forEach(r => { const n = plan.get(r.id); res[n] = res[n] || {c:0, v:0}; res[n].c++; res[n].v += (r.valor || 0); });
  prev.innerHTML = Object.entries(res).sort((a, b) => b[1].v - a[1].v).map(([n, x]) =>
    '<div><span><b>' + ouEsc(n) + '</b></span><span>' + x.c + ' títulos · ' + fmt(x.v) + '</span></div>').join('');
}
async function i26AplicarAsignar(){
  const msg = i26$('i26a-msg'), btn = i26$('i26a-btn');
  const usuario = (typeof nombreSesion === 'function') ? nombreSesion() : '';
  if(!usuario){ msg.className = 'ou-m-msg err'; msg.textContent = 'No hay sesión activa.'; return; }
  const {modo, plan, filas, equipo} = i26PlanAsignar();
  if(!plan.size){ msg.className = 'ou-m-msg err'; msg.textContent = 'Falta indicar el responsable.'; return; }
  if(modo === 'reparto'){ try{ localStorage.setItem(I26_KEY_EQUIPO, equipo.join('\n')); }catch(e){} }

  // Agrupar por responsable destino y omitir los que no cambian
  const grupos = {};
  filas.forEach(r => {
    const nuevo = plan.get(r.id);
    if(i26Txt(r.responsable).trim() === nuevo) return;
    (grupos[nuevo] = grupos[nuevo] || []).push(r);
  });
  const total = Object.values(grupos).reduce((s, g) => s + g.length, 0);
  if(!total){ msg.className = 'ou-m-msg'; msg.textContent = 'Los títulos ya tienen ese responsable.'; return; }

  btn.disabled = true; msg.className = 'ou-m-msg'; msg.textContent = 'Asignando ' + total + ' títulos…';
  let hechos = 0;
  try{
    for(const [resp, g] of Object.entries(grupos)){
      const ids = g.map(r => r.id).join(',');
      const res = await fetch(SUPA_URL + '/rest/v1/' + I26_TABLA + '?id=in.(' + ids + ')', { method:'PATCH',
        headers: await supaHeaders({'Content-Type':'application/json', Prefer:'return=representation'}),
        body: JSON.stringify({ responsable: resp, actualizado_por: usuario }) });
      if(!res.ok) throw new Error('HTTP ' + res.status + ' · ' + (await res.text()).slice(0, 120));
      const act = await res.json();
      act.forEach(x => { const i = i26Datos.findIndex(y => y.id === x.id); if(i >= 0) i26Datos[i] = i26Norm(x); });
      const bit = g.map(r => ({ titulo_id: r.id, n_fila: r.n_fila, usuario,
        cambios: 'Responsable: "' + (i26Txt(r.responsable) || '∅') + '" → "' + resp + '" (asignación masiva' + (modo === 'reparto' ? ', reparto equilibrado' : '') + ')' }));
      const rb = await fetch(SUPA_URL + '/rest/v1/' + I26_BITA, { method:'POST',
        headers: await supaHeaders({'Content-Type':'application/json', Prefer:'return=minimal'}),
        body: JSON.stringify(bit) });
      if(!rb.ok) console.warn('[bitácora asignación]', rb.status);
      hechos += g.length;
    }
    msg.className = 'ou-m-msg ok'; msg.textContent = '✅ ' + hechos + ' títulos asignados.';
    i26Sel.clear();
    i26LlenarSelects(); i26Render();
    setTimeout(i26CerrarAsignar, 900);
  }catch(e){
    console.warn('[ICA 2026 asignar]', e);
    msg.className = 'ou-m-msg err';
    msg.textContent = '❌ Se asignaron ' + hechos + ' de ' + total + '. Error: ' + e.message;
    i26LlenarSelects(); i26Render();
  }finally{
    btn.disabled = false;
  }
}

/* ── Modal de gestión ── */
function i26Abrir(id){
  i26Nuevo = (id === null);
  const r = i26Nuevo ? null : i26Datos.find(x => Number(x.id) === Number(id));
  if(!i26Nuevo && !r) return;
  i26Edit = r;
  const msg = i26$('i26-m-msg'); msg.className = 'ou-m-msg'; msg.textContent = ''; delete msg.dataset.confirmado;
  const sig = i26Datos.reduce((m, x) => Math.max(m, x.n_fila || 0), 0) + 1;
  const v = (id, val) => { i26$(id).value = (val === null || val === undefined) ? '' : val; };

  i26$('i26-m-titulo').textContent = i26Nuevo ? 'Nuevo título remitido' : ('#' + r.n_fila + ' · ' + (r.contribuyente || ''));
  i26$('i26-m-sub').textContent = i26Nuevo ? 'Se agrega a la base ICA 2026'
    : ((r.remision || 'Sin remisión') + (r.actualizado_por ? ' · última edición: ' + r.actualizado_por : ''));

  v('i26-f-estado-p', r ? (r.estado_proceso || 'Sin iniciar') : 'Sin iniciar');
  v('i26-f-etapa',    r ? r.etapa : '');
  v('i26-f-resp-p',   r ? r.responsable : '');
  v('i26-f-fecha',    r ? r.fecha_gestion : '');
  v('i26-f-recaudo',  r ? (r.valor_recaudado || 0) : 0);
  v('i26-f-clasif-p', r ? r.clasificacion : 'Recuperable');
  v('i26-f-obs',      r ? r.observaciones : '');
  v('i26-f-ejec',     r ? r.fecha_ejecutoria : '');
  v('i26-f-mand',     r ? r.fecha_mandamiento : '');
  v('i26-f-reqa',     r ? r.requerido_a : '');
  v('i26-f-freq',     r ? r.fecha_requerimiento : '');
  v('i26-f-fresp',    r ? r.fecha_respuesta : '');
  v('i26-f-n',        r ? r.n_fila : sig);
  v('i26-f-area-p',   r ? r.area : '');
  v('i26-f-contrib',  r ? r.contribuyente : '');
  v('i26-f-nit',      r ? r.nit : '');
  v('i26-f-vig',      r ? r.vigencias : '');
  v('i26-f-valor',    r ? r.valor : '');
  v('i26-f-factura',  r ? r.factura : '');
  v('i26-f-rad',      r ? r.radicado : '');
  v('i26-f-remision', r ? r.remision : '');
  v('i26-f-correo',   r ? r.correo : '');
  v('i26-f-alerta-p', r ? r.alerta : '');
  v('i26-f-url',      r ? r.expediente_url : '');
  if(r && r.etapa && ![...i26$('i26-f-etapa').options].some(o => o.value === r.etapa)){
    const o = document.createElement('option'); o.value = r.etapa; o.textContent = r.etapa; i26$('i26-f-etapa').appendChild(o);
    i26$('i26-f-etapa').value = r.etapa;
  }
  i26PintarSaldo();
  i26PintarPresc();
  i26ChequearFactura();
  i26$('i26-log-t').style.display = i26Nuevo ? 'none' : '';
  i26$('i26-log').innerHTML = '';
  i26$('i26-modal-bg').style.display = 'flex';
  if(!i26Nuevo) i26CargarBitacora(r.id);
}
function i26Cerrar(){ i26$('i26-modal-bg').style.display = 'none'; i26Edit = null; i26Nuevo = false; i26Guardando = false; }

function i26PintarSaldo(){
  const valor = Number(i26$('i26-f-valor').value || 0);
  const rec = Number(i26$('i26-f-recaudo').value || 0);
  const saldo = Math.max(0, valor - rec);
  const pctR = valor > 0 ? Math.min(100, rec / valor * 100) : 0;
  const extra = (rec > valor && valor > 0) ? ' <span style="color:#fca5a5">· el recaudo supera el valor remitido</span>' : '';
  i26$('i26-saldo').innerHTML = '<span>Recaudado <b style="color:#86efac">' + pctR.toFixed(1) + '%</b>' + extra + '</span><span>Saldo por recuperar <b>' + fmt(saldo) + '</b></span>';
}
function i26PintarPresc(){
  const r = {
    clasificacion: 'Recuperable', estado_proceso: 'Activo',
    fecha_ejecutoria: i26$('i26-f-ejec').value, fecha_mandamiento: i26$('i26-f-mand').value,
    vigencias: i26$('i26-f-vig').value
  };
  const p = i26Presc(r), box = i26$('i26-presc');
  if(r.fecha_ejecutoria && r.fecha_mandamiento && r.fecha_mandamiento < r.fecha_ejecutoria){
    box.innerHTML = '<span class="i26-rojo">⚠️ La notificación del mandamiento no puede ser anterior a la ejecutoria.</span>'; return;
  }
  if(p.nivel === 'sinfecha'){
    box.innerHTML = 'Sin fecha de ejecutoria no se puede calcular la prescripción.'
      + (p.antigua ? ' <span class="i26-ambar">La vigencia más antigua es ' + p.anio + ': conviene verificar el término cuanto antes.</span>' : '');
    return;
  }
  const est = p.nivel === 'venc' ? '<span class="i26-p venc">Vencida hace ' + Math.abs(p.dias) + ' días</span>'
            : '<span class="i26-p ' + p.nivel + '">Faltan ' + p.dias + ' días</span>';
  box.innerHTML = est + ' &nbsp;Término hasta el <b style="color:#fff">' + i26FmtF(p.vence) + '</b> '
    + (p.interrumpida ? '(5 años desde la notificación del mandamiento, art. 818 E.T.)' : '(5 años desde la ejecutoria, art. 817 E.T.; al notificar el mandamiento se interrumpe)')
    + '. No descuenta suspensiones.';
}
function i26ChequearFactura(){
  const f = i26$('i26-f-factura').value.trim();
  const av = i26$('i26-aviso-fact');
  if(!f || /^n\/?a$/i.test(f)){ av.textContent = ''; return; }
  const otros = i26Datos.filter(x => i26Txt(x.factura).trim() === f && (!i26Edit || x.id !== i26Edit.id));
  av.textContent = otros.length
    ? '⚠️ La factura ' + f + ' ya está en el título #' + otros.map(o => o.n_fila).join(', #') + '. Si es el mismo título, clasifícalo como «Mismo título (factura repetida)» para no contarlo dos veces.'
    : '';
}

function i26LeerForm(){
  const t = id => { const s = i26$(id).value.trim(); return s === '' ? null : s; };
  return {
    estado_proceso:      i26$('i26-f-estado-p').value || 'Sin iniciar',
    etapa:               t('i26-f-etapa'),
    responsable:         t('i26-f-resp-p'),
    fecha_gestion:       t('i26-f-fecha'),
    valor_recaudado:     Number(i26$('i26-f-recaudo').value || 0),
    clasificacion:       i26$('i26-f-clasif-p').value,
    observaciones:       t('i26-f-obs'),
    fecha_ejecutoria:    t('i26-f-ejec'),
    fecha_mandamiento:   t('i26-f-mand'),
    requerido_a:         t('i26-f-reqa'),
    fecha_requerimiento: t('i26-f-freq'),
    fecha_respuesta:     t('i26-f-fresp'),
    area:                t('i26-f-area-p'),
    contribuyente:       t('i26-f-contrib'),
    nit:                 t('i26-f-nit'),
    vigencias:           t('i26-f-vig'),
    valor:               i26$('i26-f-valor').value === '' ? null : Number(i26$('i26-f-valor').value),
    factura:             t('i26-f-factura'),
    radicado:            t('i26-f-rad'),
    remision:            t('i26-f-remision'),
    correo:              t('i26-f-correo'),
    alerta:              t('i26-f-alerta-p'),
    expediente_url:      t('i26-f-url')
  };
}
const I26_ETIQ = {estado_proceso:'Estado', etapa:'Etapa', responsable:'Responsable', fecha_gestion:'Fecha gestión',
  valor_recaudado:'Recaudado', clasificacion:'Clasificación', observaciones:'Observaciones',
  fecha_ejecutoria:'Ejecutoria', fecha_mandamiento:'Notif. mandamiento', requerido_a:'Requerido a',
  fecha_requerimiento:'Fecha requerimiento', fecha_respuesta:'Fecha respuesta', area:'Área',
  contribuyente:'Contribuyente', nit:'NIT', vigencias:'Vigencias', valor:'Valor', factura:'Factura',
  radicado:'Radicado', remision:'Remisión', correo:'Correo', alerta:'Alerta', expediente_url:'Link expediente'};
function i26Mostrar(k, v){
  if(v === null || v === undefined || v === '') return '∅';
  if(k === 'valor' || k === 'valor_recaudado') return fmt(Number(v)) || '$0';
  if(k === 'etapa') return i26EtapaNombre(v);
  return String(v);
}

async function i26Guardar(){
  const msg = i26$('i26-m-msg'), btn = i26$('i26-btn-guardar');
  const usuario = (typeof nombreSesion === 'function') ? nombreSesion() : '';
  const err = t => { msg.className = 'ou-m-msg err'; msg.textContent = t; };
  if(!usuario) return err('No hay sesión activa. Vuelve a iniciar sesión.');
  const nuevo = i26LeerForm();
  const hoyISO = new Date().toLocaleDateString('en-CA');
  if(!nuevo.contribuyente) return err('El contribuyente es obligatorio.');
  if(nuevo.valor !== null && !isFinite(nuevo.valor)) return err('El valor remitido no es un número válido.');
  if(!isFinite(nuevo.valor_recaudado) || nuevo.valor_recaudado < 0) return err('El valor recaudado debe ser un número mayor o igual a 0.');
  if(nuevo.expediente_url && !i26UrlOk(nuevo.expediente_url)) return err('El link del expediente debe empezar por https://');
  if(nuevo.clasificacion === 'Recuperable' && (nuevo.valor === null || nuevo.valor <= 0))
    return err('Un título «Recuperable» necesita un valor remitido mayor a 0.');
  if(nuevo.fecha_ejecutoria && nuevo.fecha_mandamiento && nuevo.fecha_mandamiento < nuevo.fecha_ejecutoria)
    return err('La notificación del mandamiento no puede ser anterior a la ejecutoria.');
  if(nuevo.fecha_requerimiento && nuevo.fecha_respuesta && nuevo.fecha_respuesta < nuevo.fecha_requerimiento)
    return err('La fecha de respuesta no puede ser anterior al requerimiento.');
  for(const k of ['fecha_gestion','fecha_ejecutoria','fecha_mandamiento','fecha_requerimiento','fecha_respuesta']){
    if(nuevo[k] && nuevo[k] > hoyISO) return err('La fecha «' + I26_ETIQ[k] + '» no puede ser futura.');
  }
  if(nuevo.estado_proceso === 'Cancelado' && nuevo.valor && nuevo.valor_recaudado < nuevo.valor && !msg.dataset.confirmado){
    msg.dataset.confirmado = '1';
    return err('⚠️ Marcaste «Cancelado» pero el recaudo no cubre el valor. Pulsa Guardar otra vez para confirmar.');
  }
  delete msg.dataset.confirmado;

  btn.disabled = true; i26Guardando = true;
  msg.className = 'ou-m-msg'; msg.textContent = 'Guardando…';
  try{
    let guardado, cambios = [];
    if(i26Nuevo){
      nuevo.n_fila = i26Datos.reduce((m, x) => Math.max(m, x.n_fila || 0), 0) + 1;
      nuevo.actualizado_por = usuario;
      const res = await fetch(SUPA_URL + '/rest/v1/' + I26_TABLA, { method:'POST',
        headers: await supaHeaders({'Content-Type':'application/json', Prefer:'return=representation'}),
        body: JSON.stringify(nuevo) });
      if(res.status === 409) throw new Error('Otro usuario acaba de crear el título #' + nuevo.n_fila + '. Cierra, pulsa Recargar e inténtalo de nuevo.');
      if(!res.ok) throw new Error('HTTP ' + res.status + ' · ' + (await res.text()).slice(0, 140));
      guardado = (await res.json())[0];
      cambios.push('Título creado: ' + nuevo.contribuyente + ' · ' + i26Mostrar('valor', nuevo.valor) + ' · ' + nuevo.clasificacion);
    }else{
      const r = i26Edit;
      for(const k in nuevo){
        const esNum = (k === 'valor' || k === 'valor_recaudado');
        const viejo = esNum ? i26Num(r[k]) : (r[k] === '' ? null : r[k]);
        const nv = nuevo[k];
        const igual = esNum
          ? (viejo === null ? nv === null : nv !== null && Number(viejo) === Number(nv))
          : i26Txt(viejo) === i26Txt(nv);
        if(!igual) cambios.push(I26_ETIQ[k] + ': "' + i26Mostrar(k, viejo) + '" → "' + i26Mostrar(k, nv) + '"');
      }
      if(!cambios.length){ msg.className = 'ou-m-msg'; msg.textContent = 'No hay cambios para guardar.'; btn.disabled = false; i26Guardando = false; return; }
      nuevo.actualizado_por = usuario;
      const url = SUPA_URL + '/rest/v1/' + I26_TABLA + '?id=eq.' + encodeURIComponent(r.id)
        + '&actualizado_en=eq.' + encodeURIComponent(r.actualizado_en);
      const res = await fetch(url, { method:'PATCH',
        headers: await supaHeaders({'Content-Type':'application/json', Prefer:'return=representation'}),
        body: JSON.stringify(nuevo) });
      if(!res.ok) throw new Error('HTTP ' + res.status + ' · ' + (await res.text()).slice(0, 140));
      const arr = await res.json();
      if(!arr.length) throw new Error('Otro usuario modificó este título mientras lo editabas. Cierra y vuelve a abrirlo para ver la versión actual (tus cambios no se guardaron).');
      guardado = arr[0];
    }

    const g = i26Norm(guardado);
    const i = i26Datos.findIndex(x => x.id === g.id);
    if(i >= 0) i26Datos[i] = g; else i26Datos.push(g);
    i26LlenarSelects();
    i26Render();

    try{
      const rb = await fetch(SUPA_URL + '/rest/v1/' + I26_BITA, { method:'POST',
        headers: await supaHeaders({'Content-Type':'application/json', Prefer:'return=minimal'}),
        body: JSON.stringify({ titulo_id: g.id, n_fila: g.n_fila, usuario: usuario, cambios: cambios.join(' | ') }) });
      if(!rb.ok) throw new Error('HTTP ' + rb.status);
      msg.className = 'ou-m-msg ok'; msg.textContent = '✅ Guardado correctamente.';
      setTimeout(i26Cerrar, 900);
    }catch(eb){
      console.warn('[bitácora ICA 2026]', eb);
      msg.className = 'ou-m-msg err';
      msg.textContent = '⚠️ El título se guardó, pero NO se registró en la bitácora (' + eb.message + ').';
      i26Guardando = false;
    }
  }catch(e){
    console.warn('[ICA 2026 guardar]', e);
    err('❌ No se pudo guardar: ' + e.message);
    i26Guardando = false;
  }finally{
    btn.disabled = false;
  }
}

async function i26CargarBitacora(id){
  const cont = i26$('i26-log');
  cont.innerHTML = '<div style="font-size:11px;color:#8b95a7;padding:6px 0">Cargando historial…</div>';
  try{
    const rows = await supaFetch(I26_BITA + '?titulo_id=eq.' + encodeURIComponent(id) + '&order=fecha.desc&select=usuario,cambios,fecha&limit=50');
    cont.innerHTML = rows.length ? rows.map(b =>
      '<div class="ou-log-item"><div class="ou-log-top"><span class="ou-log-user">' + ouEsc(b.usuario) + '</span>'
      + '<span class="ou-log-fecha">' + new Date(b.fecha).toLocaleString('es-CO', {timeZone:'America/Bogota'}) + '</span></div>'
      + '<div class="ou-log-cambios">' + ouEsc(b.cambios).replace(/ \| /g, '<br>') + '</div></div>').join('')
      : '<div style="font-size:11.5px;color:#8b95a7;padding:6px 0">Sin cambios registrados todavía.</div>';
  }catch(e){
    cont.innerHTML = '<div style="font-size:11.5px;color:#fca5a5;padding:6px 0">No se pudo cargar el historial.</div>';
  }
}

/* ── Tiempo real ── */
function i26Suscribir(){
  if(i26Canal || !sbAuth || typeof sbAuth.channel !== 'function') return;
  try{
    i26Canal = sbAuth.channel('i26-titulos')
      .on('postgres_changes', { event:'*', schema:'public', table:I26_TABLA }, i26Cambio)
      .subscribe(st => {
        const e = i26$('i26-vivo'); if(!e) return;
        const ok = st === 'SUBSCRIBED';
        e.className = 'i26-vivo ' + (ok ? 'on' : 'off');
        e.textContent = ok ? '● En vivo' : '○ Sin tiempo real';
        e.title = ok ? 'Los cambios de otros usuarios se reflejan automáticamente'
                     : 'Usa «Recargar» para ver cambios de otros usuarios (estado: ' + st + ')';
      });
  }catch(e){ console.warn('[ICA 2026 realtime]', e); }
}
function i26Cambio(p){
  if(!i26Datos) return;
  if(p.eventType === 'DELETE'){
    const id = p.old && p.old.id;
    i26Datos = i26Datos.filter(r => r.id !== id);
    i26Sel.delete(id);
  }else if(p.new){
    const r = i26Norm(p.new);
    const i = i26Datos.findIndex(x => x.id === r.id);
    if(i >= 0){
      if(i26Edit && i26Edit.id === r.id && !i26Guardando && r.actualizado_en !== i26Edit.actualizado_en){
        const msg = i26$('i26-m-msg');
        msg.className = 'ou-m-msg err';
        msg.textContent = '⚠️ ' + (r.actualizado_por || 'Otro usuario') + ' acaba de modificar este título. Cierra y vuelve a abrirlo antes de guardar.';
      }
      i26Datos[i] = r;
    }else i26Datos.push(r);
  }
  clearTimeout(i26Timer);
  i26Timer = setTimeout(() => { i26LlenarSelects(); i26Render(); }, 300);
}

/* ── Exportar a Excel lo filtrado ── */
function i26Exportar(){
  if(!i26Datos) return;
  if(typeof XLSX === 'undefined'){ alert('No se pudo cargar la librería de Excel.'); return; }
  const filas = i26Filtrados().map(r => {
    const p = i26Presc(r);
    return {
      '#': r.n_fila, 'Contribuyente': r.contribuyente || '', 'NIT': r.nit || '', 'Área': i26AreaLbl(r.area),
      'Vigencias': r.vigencias || '', 'Valor remitido': r.valor, 'Recaudado': r.valor_recaudado || 0,
      'Saldo': r.clasificacion === 'Recuperable' ? i26Saldo(r) : null,
      'Clasificación': r.clasificacion, 'Estado proceso': r.estado_proceso || 'Sin iniciar',
      'Etapa': i26EtapaNombre(r.etapa), 'Responsable': r.responsable || '', 'Fecha gestión': r.fecha_gestion || '',
      'Ejecutoria': r.fecha_ejecutoria || '', 'Notif. mandamiento': r.fecha_mandamiento || '',
      'Vence prescripción': p.vence ? p.vence.toLocaleDateString('en-CA') : '',
      'Días para prescribir': p.dias != null ? p.dias : '',
      'Requerido a': r.requerido_a || '', 'Fecha requerimiento': r.fecha_requerimiento || '', 'Fecha respuesta': r.fecha_respuesta || '',
      'Factura': r.factura || '', 'Radicado': r.radicado || '', 'Remisión': r.remision || '', 'Correo': r.correo || '',
      'Alerta': r.alerta || '', 'Observaciones': r.observaciones || '', 'Expediente': r.expediente_url || '',
      'Actualizado por': r.actualizado_por || ''
    };
  });
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ICA 2026');
  XLSX.writeFile(wb, 'ICA2026_titulos_remitidos_' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

/* ════════════════════════════════════════════════════════════
   VISTA EN TARJETAS (opcional) — la usa Expedientes para que los títulos
   se vean como los procesos de cobro. Misma información que la fila de la
   tabla y las mismas acciones (seleccionar, ordenar, gestionar, carpeta).
   Se activa con window.ICA_TARJETAS = true antes de icaMontar().
   ════════════════════════════════════════════════════════════ */
const I26C_ORDENES = [
  { k: 'prioridad',      t: 'Prioridad (prescripción)' },
  { k: 'valor',          t: 'Valor' },
  { k: 'n_fila',         t: 'N.º de título' },
  { k: 'contribuyente',  t: 'Contribuyente' },
  { k: 'area',           t: 'Área' },
  { k: 'estado_proceso', t: 'Estado' },
  { k: 'responsable',    t: 'Responsable' }
];
function i26cNombre(s){ return typeof nombrePropio === 'function' ? nombrePropio(s) : i26Txt(s); }

function i26Tarjeta(r){
  const est = r.estado_proceso || 'Sin iniciar';
  const etapa = i26EtapaNombre(r.etapa);
  const alerta = i26Txt(r.alerta).trim();
  const sg = i26DiasSinGestion(r);
  const sel = i26Sel.has(r.id);
  const id = Number(r.id);
  const drive = i26UrlOk(r.expediente_url)
    ? '<a class="i26c-ico" href="' + ouEsc(r.expediente_url.trim()) + '" target="_blank" rel="noopener" title="Abrir carpeta: ' + ouEsc(r.remision) + '" onclick="event.stopPropagation()">📂</a>'
    : '<span class="i26c-ico off" title="Sin carpeta registrada">📂</span>';
  const gestion = !i26EnGestion(r) ? ''
    : sg === null ? '<div class="i26-rojo">Sin gestión registrada</div>'
    : '<div class="' + (sg > I26_DIAS_SIN_MOV ? 'i26-rojo' : '') + '">Gestión hace ' + sg + ' d</div>';
  const rad = i26Txt(r.radicado).trim();
  const lineaVig = [r.vigencias ? 'Vig. ' + ouEsc(r.vigencias) : 'Sin vigencia', rad && !/^n\/?a$/i.test(rad) ? 'Rad. ' + ouEsc(rad) : '']
    .filter(Boolean).join(' · ');
  return '<article class="i26c ' + (sel ? 'sel ' : '') + 'e-' + (I26_ESTADO_CSS[est] || 'sin') + '" onclick="i26Abrir(' + id + ')">'
    + '<div class="i26c-top">'
    +   '<label class="i26c-ck" onclick="event.stopPropagation()" title="Seleccionar para asignar">'
    +     '<input type="checkbox" ' + (sel ? 'checked' : '') + ' onchange="i26SelFila(' + id + ',this.checked)"></label>'
    +   '<span class="i26c-area">' + ouEsc(i26AreaLbl(r.area)) + '</span>'
    +   '<span class="i26c-est"><span class="i26c-dot"></span>' + ouEsc(est) + '</span>'
    + '</div>'
    + '<div class="i26c-num"><span>Título</span> #' + ouEsc(r.n_fila) + '</div>'
    + '<div class="i26c-nom" title="' + ouEsc(r.contribuyente) + '">' + ouEsc(i26cNombre(r.contribuyente || '—')) + '</div>'
    + '<div class="i26c-id">' + (r.nit ? 'NIT ' + ouEsc(r.nit) : '&nbsp;') + '</div>'
    + '<div class="i26c-extra">'
    +   '<div>' + lineaVig + '</div>'
    +   '<div>' + (r.responsable ? 'Responsable: <b>' + ouEsc(r.responsable) + '</b>' : '<span class="i26c-muted">Sin responsable asignado</span>') + '</div>'
    +   gestion
    + '</div>'
    + '<div class="i26c-chips">'
    +   '<span class="i26-chip ' + (I26_CLASIF_CSS[r.clasificacion] || 'dup') + '">' + ouEsc(r.clasificacion || 'Sin clasificar') + '</span>'
    +   (etapa ? '<span class="i26-e ' + (I26_ESTADO_CSS[est] || 'sin') + '">' + ouEsc(etapa) + '</span>' : '')
    +   (alerta ? '<span class="i26c-alerta" title="' + ouEsc(alerta) + '">⚠ Cifra por verificar</span>' : '')
    + '</div>'
    + '<div class="i26c-presc">' + i26CeldaPresc(r) + '</div>'
    + '<div class="i26c-foot">'
    +   '<div class="i26c-valor">' + (r.valor != null ? fmt(r.valor) : '—')
    +     (r.valor_recaudado ? '<div class="i26c-rec">Recaudado ' + fmt(r.valor_recaudado) + '</div>' : '') + '</div>'
    +   '<div class="i26c-acc">' + drive
    +     '<button class="i26c-btn" onclick="event.stopPropagation();i26Abrir(' + id + ')">Gestionar</button></div>'
    + '</div>'
    + '</article>';
}

function i26RenderTarjetas(){
  if(!i26Datos) return;
  const filas = i26Filtrados();
  const paginas = Math.max(1, Math.ceil(filas.length / I26_POR_PAG));
  if(i26F.pag > paginas) i26F.pag = paginas;
  const desde = (i26F.pag - 1) * I26_POR_PAG;
  const vista = filas.slice(desde, desde + I26_POR_PAG);
  const sumaV = filas.reduce((s, r) => s + (r.clasificacion === 'Recuperable' ? (r.valor || 0) : 0), 0);
  i26$('i26-conteo').textContent = filas.length + ' de ' + i26Datos.length + ' títulos · recuperable ' + fmt(sumaV);
  i26$('i26-grid').innerHTML = vista.length ? vista.map(i26Tarjeta).join('')
    : '<div class="i26c-vacio">Ningún título coincide con los filtros</div>';
  i26$('i26-ck-all').checked = filas.length > 0 && filas.every(r => i26Sel.has(r.id));
  const so = i26$('i26c-orden'); if(so) so.value = i26F.sortK;
  const sd = i26$('i26c-dir'); if(sd) sd.textContent = i26F.sortDir === 1 ? '↑' : '↓';
  i26PintarBulk();
  const pg = i26$('i26-pager');
  if(paginas <= 1){ pg.innerHTML = ''; return; }
  let h = '<button ' + (i26F.pag === 1 ? 'disabled' : '') + ' onclick="i26Pag(' + (i26F.pag - 1) + ')">‹</button>';
  for(let p = 1; p <= paginas; p++) h += '<button class="' + (p === i26F.pag ? 'act' : '') + '" onclick="i26Pag(' + p + ')">' + p + '</button>';
  h += '<button ' + (i26F.pag === paginas ? 'disabled' : '') + ' onclick="i26Pag(' + (i26F.pag + 1) + ')">›</button>';
  pg.innerHTML = h;
}
function i26cOrdenar(k){ i26F.sortK = k; i26F.sortDir = (k === 'valor') ? -1 : 1; i26F.pag = 1; i26RenderTabla(); }
function i26cInvertir(){ i26F.sortDir *= -1; i26F.pag = 1; i26RenderTabla(); }

// Cambia la tabla por la cuadrícula de tarjetas (una sola vez)
function icaActivarTarjetas(){
  const wrap = document.querySelector('#ica-root .table-wrap');
  if(!wrap || i26$('i26-grid')) return;
  wrap.insertAdjacentHTML('beforebegin',
    '<div class="i26c-barra">'
    + '<label class="i26c-todos"><input type="checkbox" id="i26-ck-all" onclick="i26SelTodos(this.checked)"> Seleccionar los filtrados</label>'
    + '<div class="i26c-ord"><span>Ordenar por</span>'
    +   '<select id="i26c-orden" onchange="i26cOrdenar(this.value)">' + I26C_ORDENES.map(o => '<option value="' + o.k + '">' + o.t + '</option>').join('') + '</select>'
    +   '<button id="i26c-dir" type="button" title="Invertir el orden" onclick="i26cInvertir()">↑</button></div>'
    + '</div>');
  wrap.outerHTML = '<div class="i26c-grid" id="i26-grid"></div>';
  i26RenderTabla = i26RenderTarjetas;
  // Si la lista no está a la vista (por ejemplo, se filtró desde Estadísticas), la página la muestra primero
  i26IrTabla = function(){
    const grid = i26$('i26-grid');
    if (grid && grid.offsetParent === null && typeof window.icaMostrarLista === 'function') window.icaMostrarLista();
    setTimeout(() => { const g = i26$('i26-grid'); if (g) g.scrollIntoView({behavior:'smooth', block:'start'}); }, 60);
  };
  icaMoverTablero();
}

// Tablero (cifras, alertas, gráficos y nota) a otro contenedor, p. ej. la pestaña Estadísticas.
// Las funciones lo siguen encontrando por sus id, así que todo sigue funcionando igual.
function icaMoverTablero(){
  const destino = document.getElementById('ica-stats');
  if (!destino || destino.childElementCount) return;
  const alertas = i26$('i26-alertas');
  const piezas = [
    i26$('i26-cartera'),
    i26$('i26-stats'),
    alertas ? alertas.previousElementSibling : null,   // título «Qué requiere atención»
    alertas,
    document.querySelector('.ica-scope .gr-grid'),
    document.querySelector('.ica-scope .i26-nota')
  ].filter(Boolean);
  piezas.forEach(n => destino.appendChild(n));
}
