// ════════════════════════════════════════════════════════════
// TEODORO · EXPEDIENTES DIGITALES  (expedientes.js)
// Desarrollado por Jeison Maya · 2026
//
// Requiere en Supabase: expedientes_fase1.sql (tablas exp_*, vistas
// v_exp_*, funciones exp_* y bucket privado 'expedientes').
// Todo el acceso es con la sesión de Supabase Auth (rol authenticated);
// la llave anon no tiene permisos sobre este módulo.
// ════════════════════════════════════════════════════════════

const SUPABASE_URL  = "https://bmurdtfztsltcgwsfbgf.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdXJkdGZ6dHNsdGNnd3NmYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjU2NzYsImV4cCI6MjA5NjcwMTY3Nn0.2Md6ymram4kv82Lirk2ICl9ZOXUsI5Gve02q7FUCHvs";
const BUCKET        = "expedientes";
const MAX_BYTES     = 50 * 1024 * 1024;   // igual al límite del bucket
const URL_FIRMADA_S = 600;                // vigencia de las URL firmadas (10 min)

// Se reemplaza con el catálogo exp_carteras al iniciar; esto es solo el respaldo
let CARTERAS = { predial: "Predial", ou: "Obligaciones Urbanísticas", transito: "Tránsito",
                 policia: "Sanciones de policía", acuerdos: "Acuerdos de pago",
                 acuerdos_predial: "Acuerdos Predial", acuerdos_ica: "Acuerdos ICA" };
// Carteras de convenios de pago sin proceso de cobro (radicado AP-<número del convenio>)
const CARTERAS_ACUERDOS = ["acuerdos_predial", "acuerdos_ica", "acuerdos"];
function esCarteraAcuerdos(c) { return CARTERAS_ACUERDOS.includes(c); }
const ACCIONES = {
  crear_expediente: "Creó el expediente",
  incorporar:       "Incorporó documento",
  anular:           "Anuló documento",
  cerrar:           "Cerró el expediente",
  reabrir:          "Reabrió el expediente",
  consultar:        "Consultó",
  descargar:        "Vio / descargó documento",
  exportar_indice:  "Exportó",
  novedad:          "Registró novedad del proceso"
};

// ════════════════════════════════════════════════════════════
// AUTENTICACIÓN — Supabase Auth (mismo patrón que Tutelas / Buscador)
// ════════════════════════════════════════════════════════════
let sbAuth = null;
try {
  if (window.supabase && window.supabase.createClient) {
    sbAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  } else {
    console.error("La librería de Supabase no cargó. Revisa la conexión.");
  }
} catch (e) {
  console.error("Error creando cliente Supabase Auth:", e);
}

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

let USUARIO_EMAIL = "";
let authToken = SUPABASE_ANON;

async function getAuthHeaders(extra) {
  let token = SUPABASE_ANON;
  try {
    if (sbAuth) {
      const { data } = await sbAuth.auth.getSession();
      if (data && data.session && data.session.access_token) {
        token = data.session.access_token;
        authToken = token;
      }
    }
  } catch (e) { token = authToken; }
  return Object.assign({ apikey: SUPABASE_ANON, Authorization: "Bearer " + token }, extra || {});
}

async function hacerLogin() {
  if (!sbAuth) { mostrarLoginError("Error de conexión con el servidor. Recarga la página."); return; }
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-pass").value;
  const btn   = document.getElementById("login-btn");
  document.getElementById("login-error").style.display = "none";
  if (!email || !pass) { mostrarLoginError("Ingresa correo y contraseña."); return; }
  btn.textContent = "Ingresando..."; btn.style.pointerEvents = "none";
  try {
    const { error } = await sbAuth.auth.signInWithPassword({ email, password: pass });
    if (error) {
      mostrarLoginError("Correo o contraseña incorrectos.");
      btn.textContent = "Ingresar"; btn.style.pointerEvents = "auto";
      return;
    }
    entrarAlSistema();
  } catch (e) {
    mostrarLoginError("Error de conexión. Intenta de nuevo.");
    btn.textContent = "Ingresar"; btn.style.pointerEvents = "auto";
  }
}
function mostrarLoginError(msg) {
  const e = document.getElementById("login-error");
  e.textContent = msg; e.style.display = "block";
}
async function entrarAlSistema() {
  try {
    if (sbAuth) {
      const { data } = await sbAuth.auth.getSession();
      if (data.session && data.session.user) USUARIO_EMAIL = data.session.user.email || "";
    }
  } catch (e) { /* sin correo visible; la BD igual registra el usuario del token */ }
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("nav-user").textContent = USUARIO_EMAIL;
  iniciarApp();
}
async function cerrarSesion() {
  if (COLA.some(q => q.estado === "subiendo") || (typeof CM !== "undefined" && CM.corriendo)) {
    if (!confirm("Hay documentos incorporándose. ¿Salir de todos modos?")) return;
  }
  if (sbAuth) { try { await sbAuth.auth.signOut(); } catch (e) {} }
  location.reload();
}
(async function verificarSesionInicial() {
  if (!sbAuth) return;
  try {
    const { data } = await sbAuth.auth.getSession();
    if (data.session) entrarAlSistema();
  } catch (e) { /* sin sesión: se queda el login */ }
})();

// ════════════════════════════════════════════════════════════
// CAPA DE DATOS (PostgREST con el token de la sesión)
// ════════════════════════════════════════════════════════════
async function supaFetch(path, opts) {
  opts = opts || {};
  const headers = await getAuthHeaders(Object.assign({ "Content-Type": "application/json" }, opts.headers || {}));
  let res;
  try {
    res = await fetch(SUPABASE_URL + "/rest/v1/" + path, Object.assign({}, opts, { headers }));
  } catch (e) {
    throw new Error("Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.");
  }
  if (!res.ok) {
    let msg = "HTTP " + res.status;
    try { const j = await res.json(); if (j && j.message) msg = j.message; } catch (e) {}
    if (res.status === 401 || /JWT/i.test(msg)) msg = "Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.";
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const txt = await res.text();
  if (!txt) return null;
  try { return JSON.parse(txt); } catch (e) { return txt; }
}
function rpc(fn, body) {
  return supaFetch("rpc/" + fn, { method: "POST", body: JSON.stringify(body || {}) });
}
// Bitácora de consultas/descargas: no bloquea la interfaz si falla
function registrarEvento(accion, documentoId, detalle) {
  if (!EXP) return;
  rpc("exp_registrar_evento", {
    p_expediente_id: EXP.id, p_accion: accion,
    p_documento_id: documentoId || null, p_detalle: detalle || null
  }).catch(e => console.warn("Bitácora:", e.message));
}

// ════════════════════════════════════════════════════════════
// ESTADO
// ════════════════════════════════════════════════════════════
let TIPOS = [];          // exp_tipos_documentales activos
let TIPOS_MAP = {};
let ETAPAS = [];         // etapas_coactivo activas
let ETAPAS_MAP = {};
let EXP = null;          // fila de v_exp_digital abierta
let INDICE = [];         // filas de v_exp_indice
let COLA = [];           // archivos pendientes de incorporar
let docAnular = null;
let RESULTADOS = [];     // última búsqueda
let appIniciada = false;

// ════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function esc(s) {
  return (s === null || s === undefined ? "" : String(s))
    .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function normRad(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
// Clave de cruce: letras + número sin ceros a la izquierda (FP-003, FP003 y FP3 → FP3)
function claveRadicado(s) {
  const n = normRad(s);
  const m = n.match(/^([A-Z]*)0*(\d+)$/);
  return m ? m[1] + m[2] : n;
}
// Todas las formas en que puede estar guardado un radicado en radicado_norm (FP996, FP0996, FP00996…)
function variantesRadicado(s) {
  const n = normRad(s);
  const m = n.match(/^([A-Z]*)0*(\d+)$/);
  if (!m) return n ? [n] : [];
  const out = new Set([m[1] + m[2]]);
  for (let k = m[2].length + 1; k <= 6; k++) out.add(m[1] + m[2].padStart(k, "0"));
  out.add(n);
  return [...out];
}
// Orden natural: prefijo y luego número (FP-2 antes de FP-10, FP0996 junto a FP-996)
function partesRad(r) {
  const n = normRad(r);
  const m = n.match(/^([A-Z]*)0*(\d+)/);
  return m ? { p: m[1], n: Number(m[2]), t: n } : { p: n, n: 0, t: n };
}
function ordenRadicado(a, b) {
  const x = partesRad(a), y = partesRad(b);
  return x.p.localeCompare(y.p) || (x.n - y.n) || x.t.localeCompare(y.t);
}
// Radicado en formato oficial para mostrar (los datos de cartera no se modifican)
function radVista(r) { return formatearRadicado(r); }
// Formato oficial del radicado: FP-1212
function formatearRadicado(s) {
  const t = String(s || "").trim().toUpperCase();
  const m = t.match(/^([A-Z]{1,5})[^A-Z0-9]*0*(\d+)$/);
  return m ? m[1] + "-" + m[2] : t;
}
// Situación del proceso a partir del estado en cartera
const SITUACIONES = {
  sin_iniciar: "Sin iniciar",
  activo:    "Activo",
  acuerdo:   "En acuerdo de pago",
  cancelado: "Cancelado",
  terminado: "Terminado",
  sin:       "Sin dato en cartera"
};
// Última novedad registrada por expediente (exp_novedades). Manda sobre el estado en cartera.
let NOV = {};
function idExpDe(f) { return f ? (("exp_id" in f) ? f.exp_id : f.id) : null; }
function situacionDe(f) {
  const n = f ? NOV[idExpDe(f)] : null;
  if (n) {
    if (n.tipo === "terminacion") return causalEsPago(n.causal) ? "cancelado" : "terminado";
    if (n.tipo === "acuerdo_pago") return "acuerdo";
    if (n.tipo === "acuerdo_incumplido") return "activo";
  }
  const s = String((f && f.estado_cartera) || "").toLowerCase();
  if (/cancel/.test(s)) return "cancelado";
  if (/termin|archiv/.test(s)) return "terminado";
  if ((f && f.en_acuerdo) || /convenio|acuerdo/.test(s)) return "acuerdo";
  if (/sin iniciar/.test(s)) return "sin_iniciar";
  if (s) return "activo";
  return "sin";
}
// CSV para Excel en español: separador ; y BOM UTF-8
function descargarCSV(nombre, cols, filas) {
  const celda = v => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[";\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const lineas = [cols.map(c => celda(c.t)).join(";")]
    .concat(filas.map(f => cols.map(c => celda(typeof c.v === "function" ? c.v(f) : f[c.v])).join(";")));
  const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function fechaArchivo() { return hoyISO().replace(/-/g, ""); }
function fmtFecha(d) {
  if (!d) return "—";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + "/" + m[2] + "/" + m[1] : String(d);
}
function fmtFechaHora(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  const p = n => String(n).padStart(2, "0");
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function fmtMoneda(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return isNaN(n) ? String(v) : "$ " + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}
function fmtBytes(b) {
  if (!b && b !== 0) return "—";
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}
function hoyISO() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function toast(msg, esError) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (esError ? " err" : "");
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = "toast" + (esError ? " err" : ""); }, esError ? 6000 : 3200);
}
function abrirModal(id) { $(id).classList.add("open"); }
function cerrarModal(id) {
  $(id).classList.remove("open");
  if (id === "m-visor") $("visor-frame").src = "about:blank";
}
function progreso(abrir, titulo, sub, pct) {
  const p = $("prog");
  if (!abrir) { p.classList.remove("open"); return; }
  p.classList.add("open");
  if (titulo !== undefined) $("prog-t").textContent = titulo;
  $("prog-s").textContent = sub || "";
  $("prog-fill").style.width = Math.max(0, Math.min(100, pct || 0)) + "%";
}
function descargarBlob(bytes, nombre) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function nombreArchivoSeguro(s) { return String(s || "").replace(/[^A-Za-z0-9_-]+/g, "_"); }

window.addEventListener("beforeunload", function (e) {
  if (COLA.some(q => q.estado === "subiendo") || (typeof CM !== "undefined" && CM.corriendo) ||
      (typeof POL !== "undefined" && POL.listo && (POL.edit || polConDatos()))) { e.preventDefault(); e.returnValue = ""; }
});

// ════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ════════════════════════════════════════════════════════════
function irPanel(n) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
  $("panel-" + n).classList.add("active");
  $("tab-" + n).classList.add("active");
  if (n === "buscar") cargarRecientes();
  if (n === "policia") polMontar();
  if (n === "estadisticas") { if (ST_VISTA === "acuerdos") cargarEstAcuerdos(); else if (ST_VISTA === "ica") montarICA(); else cargarEstadisticas(); }
}
function irSub(n) {
  ["indice", "incorporar", "novedades", "bitacora"].forEach(k => {
    $("sub-" + k).classList.toggle("active", k === n);
    $("st-" + k).classList.toggle("active", k === n);
  });
  if (n === "bitacora") cargarBitacora();
  if (n === "novedades") renderNovedades();
}

// ════════════════════════════════════════════════════════════
// INICIO
// ════════════════════════════════════════════════════════════
async function iniciarApp() {
  if (appIniciada) return;
  appIniciada = true;
  configurarDropzone();
  configurarCargaMasiva();
  try {
    const [tipos, etapas, carteras] = await Promise.all([
      supaFetch("exp_tipos_documentales?select=*&activo=eq.true&order=orden.asc"),
      supaFetch("etapas_coactivo?select=codigo,nombre,grupo,orden&activo=eq.true&order=orden.asc"),
      supaFetch("exp_carteras?select=codigo,nombre&activo=eq.true&order=orden.asc").catch(() => null)
    ]);
    if (carteras && carteras.length) {
      CARTERAS = {};
      carteras.forEach(k => { CARTERAS[k.codigo] = k.nombre; });
    }
    TIPOS = tipos || [];
    TIPOS.forEach(t => { TIPOS_MAP[t.codigo] = t; });
    ETAPAS = etapas || [];
    ETAPAS.forEach(e => { ETAPAS_MAP[e.codigo] = e; });
    const grupos = [...new Set(ETAPAS.map(e => e.grupo))];
    $("f-grupo").innerHTML = '<option value="">Todas las etapas</option>' +
      grupos.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("") +
      '<option value="__sin">Sin etapa</option>';
  } catch (e) {
    toast("No se pudieron cargar los catálogos: " + e.message, true);
  }
  llenarSelectCarteras();
  cargarRecientes();

  // Apertura directa: expedientes.html?cartera=predial&radicado=FP-19279
  const qs = new URLSearchParams(location.search);
  const c = (qs.get("cartera") || "").toLowerCase();
  const r = qs.get("radicado");
  if (r && CARTERAS[c]) abrirPorRadicado(c, r, false);
  // Búsqueda directa desde el home: expedientes.html?buscar=FP-1212
  const qb = (qs.get("buscar") || "").trim();
  if (!r && qb) { $("f-q").value = qb; buscar(); }
}

function llenarSelectCarteras() {
  const ops = Object.keys(CARTERAS).map(k => `<option value="${esc(k)}">${esc(CARTERAS[k])}</option>`).join("");
  const opsProc = Object.keys(CARTERAS).filter(k => !esCarteraAcuerdos(k))
    .map(k => `<option value="${esc(k)}">${esc(CARTERAS[k])}</option>`).join("");
  $("f-cartera").innerHTML = '<option value="">Todas las carteras</option>' + opsProc;
  $("r-cartera").innerHTML = '<option value="">Todas las carteras</option>' + opsProc;
  $("man-cartera").innerHTML = ops;
  if ($("cm-cartera")) $("cm-cartera").innerHTML = ops;
  if ($("cm-cartera") && CARTERAS.predial) $("cm-cartera").value = "predial";
}
function chipCartera(c) {
  return `<span class="chip chip-${esc(c)}">${esc(CARTERAS[c] || c)}</span>`;
}
function chipSituacion(f) {
  const s = situacionDe(f);
  const n = NOV[idExpDe(f)];
  let txt = SITUACIONES[s];
  if (n && n.tipo === "acuerdo_pago" && n.numero) txt = "Acuerdo de pago N.º " + n.numero;
  const tit = n ? ' title="' + esc(textoNovedad(n)) + '"' : "";
  let extra = "";
  if (n && n.tipo === "acuerdo_incumplido") extra = ' <span class="chip chip-embargo">Acuerdo incumplido</span>';
  return `<span class="chip chip-sit-${s}"${tit}>${esc(txt)}</span>${extra}`;
}
function chipsSituacion(f) {
  const out = [];
  if (f.estado_cartera || f.en_acuerdo || NOV[idExpDe(f)]) out.push(chipSituacion(f));
  if (f.embargos > 0) out.push(`<span class="chip chip-embargo">${f.embargos} embargo${f.embargos === 1 ? "" : "s"}</span>`);
  // En las carteras de acuerdos todo es manual por diseño: la etiqueta no aporta
  if (f.origen === "manual" && !esCarteraAcuerdos(f.cartera)) out.push('<span class="chip chip-manual">Manual</span>');
  return out.join(" ");
}

// ════════════════════════════════════════════════════════════
// BÚSQUEDA
// ════════════════════════════════════════════════════════════
async function buscar() {
  const q = $("f-q").value.trim();
  const cartera = $("f-cartera").value;
  const info = $("res-info");
  if (q.length < 3) { info.textContent = "Escribe al menos 3 caracteres."; return; }

  const limpio = q.replace(/[,()*"\\:.%]/g, " ").replace(/\s+/g, " ").trim();
  const patron = "*" + limpio.replace(/ /g, "*") + "*";
  const rn = normRad(q);
  const filtros = [];
  if (rn.length >= 2) filtros.push("radicado_norm.ilike.*" + rn + "*");
  // FP-996 también debe encontrar FP0996 (y al revés): variantes exactas del número
  const vars = /^[A-Z]*\d+$/.test(rn) ? variantesRadicado(rn).filter(v => v !== rn) : [];
  if (vars.length) filtros.push("radicado_norm.in.(" + vars.join(",") + ")");
  filtros.push("id_contribuyente.ilike." + patron);
  filtros.push("contribuyente.ilike." + patron);

  let path = "v_exp_buscar?select=*&or=" + encodeURIComponent("(" + filtros.join(",") + ")") +
             "&order=radicado.asc&limit=60";
  if (cartera) path += "&cartera=eq." + cartera;
  else path += "&cartera=not.in.(" + CARTERAS_ACUERDOS.join(",") + ")";

  $("btn-buscar").disabled = true;
  info.textContent = "Buscando…";
  try {
    const filas = (await supaFetch(path) || [])
      .sort((a, b) => String(a.cartera).localeCompare(String(b.cartera)) || ordenRadicado(a.radicado, b.radicado));
    await cargarNovedades(filas.map(f => f.exp_id));
    info.textContent = filas.length
      ? filas.length + (filas.length === 60 ? "+ resultados (afina la búsqueda si no ves el tuyo)" : " resultado(s)")
      : "Sin resultados para «" + q + "».";
    renderResultados(filas);
    $("res-manual-t").textContent = filas.length ? "¿No es ninguno de estos?" : "¿No aparece en ninguna cartera?";
    $("res-manual").classList.remove("hidden");
  } catch (e) {
    info.textContent = "";
    $("res-manual").classList.remove("hidden");
    toast("Error buscando: " + e.message, true);
  } finally {
    $("btn-buscar").disabled = false;
  }
}

function renderResultados(filas) {
  RESULTADOS = filas;
  $("res-wrap").classList.toggle("hidden", !filas.length);
  $("res-grid").innerHTML = filas.map((f, i) => tarjetaExpediente({
    cartera: f.cartera, radicado: f.radicado, contribuyente: f.contribuyente, id_contribuyente: f.id_contribuyente,
    estadoExp: (f.exp_id !== null && f.exp_id !== undefined) ? f.estado_expediente : null,
    expId: f.exp_id, docs: f.total_documentos, folios: f.total_folios, valor: f.valor_total,
    chips: chipsSituacion(f), crearIdx: i
  })).join("");
  enriquecerTarjetas($("res-grid"));
}

// ── Tarjetas de expediente (búsqueda y recientes) ──
let REC_LIMITE = 24;
function verMasRecientes() { REC_LIMITE += 24; cargarRecientes(); }
function filtrosRecientesCambiaron() { REC_LIMITE = 24; cargarRecientes(); }

// "LUIS ALIRIO DE LA CRUZ" → "Luis Alirio de la Cruz"; siglas de empresa se respetan
function nombrePropio(s) {
  const menores = ["de", "del", "la", "las", "los", "y", "e", "da", "van", "von"];
  // En razones sociales (SAS, S.A., LTDA…) las palabras cortas suelen ser siglas: CAF, AAA, JYM
  const empresa = /\b(s\.?\s?a\.?\s?s|s\.?\s?a|ltda|e\.?\s?u|s\.?\s?c\.?\s?a)\.?\s*$/i.test(String(s || "").trim());
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim().split(" ").map((w, i) => {
    if (i > 0 && menores.includes(w)) return w;
    if (empresa && /^[a-zñ]{2,3}$/.test(w)) return w.toUpperCase();
    if (/^(s\.?a\.?s?\.?|ltda\.?|s\.?a\.?|e\.?u\.?|s\.?c\.?a\.?)$/.test(w)) return w.toUpperCase();
    return w.replace(/(^|[-'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  }).join(" ");
}
function haceCuanto(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return "hace " + Math.floor(s / 60) + " min";
  if (s < 86400) return "hace " + Math.floor(s / 3600) + " h";
  const dias = Math.floor(s / 86400);
  if (dias === 1) return "ayer";
  if (dias < 7) return "hace " + dias + " días";
  return fmtFecha(d.toISOString().slice(0, 10));
}
function abrirTarjeta(ev, expId, crearIdx) {
  if (ev && ev.target && ev.target.closest("button, a")) return;
  if (expId !== null && expId !== undefined && expId !== "") abrirExpediente(Number(expId));
  else if (crearIdx !== undefined && crearIdx !== null && crearIdx !== "") crearDesdeResultado(Number(crearIdx));
}
function tarjetaExpediente(o) {
  const tiene = o.expId !== null && o.expId !== undefined;
  const est = tiene ? (o.estadoExp || "abierto") : "sin";
  const estTxt = { abierto: "Abierto", cerrado: "Cerrado", anulado: "Anulado", sin: "Sin carpeta" }[est] || est;
  const meta = [];
  if (tiene) meta.push((o.docs || 0) + " doc. · " + (o.folios || 0) + " fol.");
  if (o.valor !== undefined && o.valor !== null && o.valor !== "") meta.push(fmtMoneda(o.valor));
  const cuando = haceCuanto(o.cuando);
  const accion = tiene
    ? `<button class="btn btn-sm xc-btn" onclick="abrirExpediente(${Number(o.expId)})">Abrir</button>`
    : `<button class="btn btn-sm btn-gold xc-btn" onclick="crearDesdeResultado(${Number(o.crearIdx)})">Crear carpeta</button>`;
  const nombre = o.contribuyente ? nombrePropio(o.contribuyente) : "Contribuyente sin nombre";
  return `<article class="xc xc-${esc(est)}" onclick="abrirTarjeta(event, ${tiene ? Number(o.expId) : "null"}, ${tiene ? "null" : Number(o.crearIdx)})">
    <div class="xc-top">${chipCartera(o.cartera)}<span class="xc-est"><span class="xc-dot"></span>${esc(estTxt)}</span></div>
    <div class="xc-rad"${radVista(o.radicado) !== o.radicado ? ` title="Registrado en cartera como ${esc(o.radicado)}"` : ""}>${esc(radVista(o.radicado))}</div>
    <div class="xc-nom" title="${esc(o.contribuyente || "")}">${esc(nombre)}</div>
    <div class="xc-id">${o.id_contribuyente ? "C.C./NIT " + esc(o.id_contribuyente) : "&nbsp;"}</div>
    <div class="xc-extra" data-cartera="${esc(o.cartera)}" data-rad="${esc(o.radicado)}"></div>
    <div class="xc-chips">${o.chips || ""}</div>
    <div class="xc-foot">
      <div class="xc-meta">${esc(meta.join(" · "))}${cuando ? `<div class="xc-cuando">${esc(cuando)}</div>` : ""}</div>
      ${accion}
    </div>
  </article>`;
}
// Qué se trae de cada cartera para la tarjeta. La llave es la columna que guarda el radicado.
const EXTRA_CARTERA = {
  predial:  { tabla: "expedientes_predial",  llave: "radicado",       campos: "radicado,matricula,num_ficha,direccion" },
  ou:       { tabla: "expedientes_ou",       llave: "radicado",       campos: "radicado,direccion,barrio" },
  transito: { tabla: "expedientes_transito", llave: "nro_comparendo", campos: "nro_comparendo,numero_placa,anio" },
  policia:  { tabla: "expedientes_policia",  llave: "comparendo",     campos: "comparendo,fecha_comparendo,orden_policia,carpeta,pagina" },
  // Títulos ICA: el expediente TICA-135 corresponde al id 135 de ica_titulos_remitidos
  ica:      { tabla: "ica_titulos_remitidos", llave: "id",
              campos: "id,n_fila,area,vigencias,radicado,responsable,fecha_ejecutoria,fecha_mandamiento",
              aLlave: r => String(r).replace(/\D/g, ""), aRad: f => "TICA-" + f.id }
};
// Prescripción de un título ICA: el mandamiento interrumpe (art. 818 E.T.); si no hay,
// 5 años desde la ejecutoria (art. 817 E.T.). Es una alerta de trabajo, no un cómputo jurídico.
function avisoPrescripcion(f) {
  if (f.fecha_mandamiento) return `<div class="xc-presc ok">Mandamiento librado el ${esc(fmtFecha(String(f.fecha_mandamiento).slice(0, 10)))}</div>`;
  if (!f.fecha_ejecutoria) return '<div class="xc-presc sin">Sin fecha de ejecutoria</div>';
  const ej = new Date(String(f.fecha_ejecutoria).slice(0, 10) + "T00:00:00");
  const pr = new Date(ej); pr.setFullYear(pr.getFullYear() + 5);
  const meses = (pr - new Date()) / (1000 * 60 * 60 * 24 * 30.44);
  const fecha = fmtFecha(pr.toISOString().slice(0, 10));
  if (meses < 0) return `<div class="xc-presc err">Prescribiría desde el ${esc(fecha)}: revisar</div>`;
  return `<div class="xc-presc ${meses < 12 ? "err" : meses < 24 ? "warn" : "ok"}">Prescribe aprox. el ${esc(fecha)}</div>`;
}
const EXTRA_CACHE = {};          // "cartera|radicado" → html
function htmlExtra(cartera, f) {
  const lim = v => String(v || "").trim();
  const linea = [];
  if (cartera === "predial") {
    if (lim(f.direccion)) linea.push(`<div class="xc-dir">${esc(lim(f.direccion))}</div>`);
    const ids = [];
    if (lim(f.matricula)) ids.push("Mat. " + esc(lim(f.matricula)));
    if (lim(f.num_ficha)) ids.push("Ficha " + esc(lim(f.num_ficha)));
    if (ids.length) linea.push(`<div class="xc-ids">${ids.join(" · ")}</div>`);
  } else if (cartera === "ou") {
    const d = [lim(f.direccion), lim(f.barrio)].filter(Boolean).map(esc).join(" · ");
    if (d) linea.push(`<div class="xc-dir">${d}</div>`);
  } else if (cartera === "policia") {
    const d = [f.fecha_comparendo ? "Comparendo del " + esc(fmtFecha(f.fecha_comparendo)) : "", lim(f.orden_policia) ? "Orden " + esc(lim(f.orden_policia)) : "Sin orden de policía"]
      .filter(Boolean).join(" · ");
    if (d) linea.push(`<div class="xc-ids">${d}</div>`);
    if (polUbic(f)) linea.push(`<div class="xc-ids">${esc(polUbic(f))}</div>`);
  } else if (cartera === "ica") {
    const d = [lim(f.area), lim(f.vigencias) ? "Vig. " + lim(f.vigencias) : ""].filter(Boolean).map(esc).join(" · ");
    if (d) linea.push(`<div class="xc-dir">${d}</div>`);
    const ids = [];
    if (lim(f.radicado) && !/^n\/?a$/i.test(lim(f.radicado))) ids.push("Rad. " + esc(lim(f.radicado)));
    if (f.n_fila) ids.push("Fila #" + esc(f.n_fila));
    if (ids.length) linea.push(`<div class="xc-ids">${ids.join(" · ")}</div>`);
    linea.push(`<div class="xc-ids">${lim(f.responsable) ? "Responsable: " + esc(lim(f.responsable)) : "Sin responsable asignado"}</div>`);
    linea.push(avisoPrescripcion(f));
  } else if (cartera === "transito") {
    const d = [lim(f.numero_placa) ? "Placa " + esc(lim(f.numero_placa)) : "", f.anio ? "Vigencia " + esc(f.anio) : ""].filter(Boolean).join(" · ");
    if (d) linea.push(`<div class="xc-ids">${d}</div>`);
  }
  return linea.join("");
}
async function enriquecerTarjetas(cont) {
  if (!cont) return;
  const nodos = [...cont.querySelectorAll(".xc-extra")];
  const pendientes = {};
  nodos.forEach(n => {
    const k = n.dataset.cartera + "|" + n.dataset.rad;
    if (k in EXTRA_CACHE) { n.innerHTML = EXTRA_CACHE[k]; return; }
    if (!EXTRA_CARTERA[n.dataset.cartera]) return;
    (pendientes[n.dataset.cartera] = pendientes[n.dataset.cartera] || new Set()).add(n.dataset.rad);
  });
  await Promise.all(Object.keys(pendientes).map(async c => {
    const cfg = EXTRA_CARTERA[c];
    const rads = [...pendientes[c]];
    try {
      const llaves = rads.map(r => cfg.aLlave ? cfg.aLlave(r) : r).filter(Boolean);
      const lista = llaves.map(r => '"' + String(r).replace(/"/g, "") + '"').map(encodeURIComponent).join(",");
      const filas = llaves.length ? (await supaFetch(cfg.tabla + "?select=" + cfg.campos + "&" + cfg.llave + "=in.(" + lista + ")") || []) : [];
      rads.forEach(r => { EXTRA_CACHE[c + "|" + r] = ""; });
      filas.forEach(f => { EXTRA_CACHE[c + "|" + (cfg.aRad ? cfg.aRad(f) : f[cfg.llave])] = htmlExtra(c, f); });
    } catch (e) {
      console.warn("Datos de cartera para tarjetas (" + c + "):", e.message);
      rads.forEach(r => { EXTRA_CACHE[c + "|" + r] = ""; });
    }
  }));
  nodos.forEach(n => {
    const k = n.dataset.cartera + "|" + n.dataset.rad;
    if (k in EXTRA_CACHE) n.innerHTML = EXTRA_CACHE[k];
  });
}

function esqueletos(n) {
  return Array.from({ length: n }, () => '<div class="xc xc-esq" aria-hidden="true"><div></div><div></div><div></div><div></div></div>').join("");
}

// Orden numérico real sobre todos los expedientes: se piden los id ordenados a exp_digital
// (columnas calculadas radicado_prefijo y radicado_num) y luego sus datos a la vista.
let ORDEN_DISPONIBLE = true;
async function recientesPorRadicado(rc, re, rs) {
  const n = rs ? Math.max(300, REC_LIMITE * 4) : REC_LIMITE;
  let q = "exp_digital?select=id&order=cartera.asc,radicado_prefijo.asc,radicado_num.asc,radicado_norm.asc&limit=" + n;
  if (rc) q += "&cartera=eq." + encodeURIComponent(rc);
  else q += "&cartera=not.in.(" + CARTERAS_ACUERDOS.join(",") + ")";
  if (re) q += "&estado=eq." + encodeURIComponent(re);
  if ($("r-mios") && $("r-mios").checked && USUARIO_EMAIL) q += "&creado_por_email=eq." + encodeURIComponent(USUARIO_EMAIL);
  let ids;
  try {
    ids = (await supaFetch(q) || []).map(x => x.id);
  } catch (e) {
    if (/radicado_num|radicado_prefijo|column/i.test(e.message)) {
      ORDEN_DISPONIBLE = false;
      $("r-orden").value = "recientes";
      toast("Para ordenar por radicado falta ejecutar sql_exp_orden_radicado.sql en Supabase.", true);
      return await supaFetch("v_exp_digital?select=*&order=actualizado_en.desc&limit=" + n) || [];
    }
    throw e;
  }
  if (!ids.length) return [];
  const filas = await supaFetch("v_exp_digital?select=*&id=in.(" + ids.join(",") + ")") || [];
  const pos = {}; ids.forEach((id, i) => { pos[id] = i; });
  return filas.sort((a, b) => pos[a.id] - pos[b.id]);
}

async function cargarRecientes() {
  if ($("rec-grid") && !$("rec-grid").children.length) $("rec-grid").innerHTML = esqueletos(6);
  try {
    let path = "v_exp_digital?select=*&order=actualizado_en.desc&limit=" + REC_LIMITE;
    const porRadicado = $("r-orden") && $("r-orden").value === "radicado";
    if ($("rec-titulo")) $("rec-titulo").textContent = porRadicado ? "Expedientes por radicado" : "Movidos recientemente";
    const rc = $("r-cartera") ? $("r-cartera").value : "";
    const re = $("r-estado") ? $("r-estado").value : "";
    if (rc) path += "&cartera=eq." + encodeURIComponent(rc);
    else path += "&cartera=not.in.(" + CARTERAS_ACUERDOS.join(",") + ")";
    if (re) path += "&estado=eq." + encodeURIComponent(re);
    if ($("r-mios") && $("r-mios").checked && USUARIO_EMAIL) path += "&creado_por_email=eq." + encodeURIComponent(USUARIO_EMAIL);
    const rs = $("r-situacion") ? $("r-situacion").value : "";
    const filtrado = rc || re || rs || ($("r-mios") && $("r-mios").checked);
    // Con filtro de situación se trae una muestra mayor y se filtra aquí: la novedad registrada manda sobre la cartera
    if (rs) path = path.replace("&limit=" + REC_LIMITE, "&limit=" + Math.max(300, REC_LIMITE * 4));
    let filas;
    if (porRadicado) filas = await recientesPorRadicado(rc, re, rs);
    else filas = await supaFetch(path) || [];
    await cargarNovedades(filas.map(f => f.id));
    const hayMas = rs ? filas.filter(f => situacionDe(f) === rs).length > REC_LIMITE : filas.length === REC_LIMITE;
    if (rs) filas = filas.filter(f => situacionDe(f) === rs).slice(0, REC_LIMITE);
    $("rec-grid").innerHTML = filas.length ? filas.map(f => tarjetaExpediente({
      cartera: f.cartera, radicado: f.radicado, contribuyente: f.contribuyente, id_contribuyente: f.id_contribuyente,
      estadoExp: f.estado, expId: f.id, docs: f.total_documentos, folios: f.total_folios,
      cuando: f.actualizado_en, chips: chipsSituacion(f)
    })).join("") : `<div class="xc-vacio">${filtrado ? "Ningún expediente coincide con estos filtros."
                    : "Aún no hay expedientes digitales. Busca un radicado y crea el primero."}</div>`;
    $("rec-mas").classList.toggle("hidden", !hayMas);
    enriquecerTarjetas($("rec-grid"));
  } catch (e) {
    $("rec-grid").innerHTML = `<div class="xc-vacio">No se pudo cargar: ${esc(e.message)}</div>`;
    $("rec-mas").classList.add("hidden");
  }
}

// ════════════════════════════════════════════════════════════
// ABRIR / CREAR EXPEDIENTE
// ════════════════════════════════════════════════════════════
function crearDesdeResultado(i) {
  const f = RESULTADOS[i];
  if (f) crearYAbrir(f.cartera, f.radicado);
}
async function crearYAbrir(cartera, radicado) {
  if (!confirm("¿Crear el expediente digital de " + radicado + " (" + (CARTERAS[cartera] || cartera) + ")?")) return;
  await abrirPorRadicado(cartera, radicado, true);
}

// ── Creación manual (radicado que no aparece en la búsqueda) ──
function abrirModalManual() {
  const q = $("f-q").value.trim();
  $("man-cartera").value = $("f-cartera").value || "predial";
  const esCedula = /^\d{5,}$/.test(q);
  $("man-radicado").value = esCedula ? "" : q;          // si buscó una cédula, va al campo de cédula
  $("man-cedula").value = esCedula ? q : "";
  $("man-nombre").value = "";
  abrirModal("m-manual");
  setTimeout(() => $("man-radicado").focus(), 50);
}
async function confirmarManual() {
  const cartera = $("man-cartera").value;
  const radicado = formatearRadicado($("man-radicado").value);
  const cedula = $("man-cedula").value.replace(/[^0-9A-Za-z-]/g, "");
  const nombre = $("man-nombre").value.trim();
  if (normRad(radicado).length < 3) { toast("Escribe el radicado completo.", true); return; }
  if (!cedula || !nombre) { toast("Escribe la cédula o NIT y el nombre del contribuyente.", true); return; }
  const btn = $("btn-manual-ok");
  btn.disabled = true;
  try {
    const ya = await supaFetch("exp_digital?select=id,radicado&cartera=eq." + cartera +
                               "&radicado_norm=in.(" + variantesRadicado(radicado).map(encodeURIComponent).join(",") + ")") || [];
    let id = ya.length ? ya[0].id : null;
    if (!id) id = await rpc("exp_crear_expediente", {
      p_cartera: cartera, p_radicado: radicado, p_manual: true,
      p_id_contribuyente: cedula, p_contribuyente: nombre
    });
    cerrarModal("m-manual");
    if (id) {
      toast(ya.length ? "Ese radicado ya tenía expediente (registrado como " + ya[0].radicado + "); lo abrí." : "Expediente creado.");
      cargarRecientes();
      await abrirExpediente(Number(id));
    }
  } catch (e) {
    toast("No se pudo crear: " + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function abrirPorRadicado(cartera, radicado, crear) {
  try {
    let id = null;
    if (crear) {
      id = await rpc("exp_crear_expediente", { p_cartera: cartera, p_radicado: radicado });
    } else {
      const f = await supaFetch("exp_digital?select=id&cartera=eq." + cartera +
                                "&radicado_norm=in.(" + variantesRadicado(radicado).map(encodeURIComponent).join(",") + ")") || [];
      if (f.length) id = f[0].id;
      else if (confirm("El radicado " + radicado + " no tiene expediente digital. ¿Crearlo ahora?")) {
        id = await rpc("exp_crear_expediente", { p_cartera: cartera, p_radicado: radicado });
      }
    }
    if (id) await abrirExpediente(Number(id));
  } catch (e) {
    toast(e.message, true);
  }
}

async function abrirExpediente(id) {
  if (COLA.some(q => q.estado === "subiendo")) { toast("Espera a que termine la incorporación en curso.", true); return; }
  try {
    const f = await supaFetch("v_exp_digital?select=*&id=eq." + id);
    if (!f || !f.length) { toast("No se encontró el expediente.", true); return; }
    const cambio = !EXP || EXP.id !== id;
    EXP = f[0];
    INDICE = await supaFetch("v_exp_indice?select=*&expediente_id=eq." + id + "&order=consecutivo.asc") || [];
    await cargarNovedades([id], true);
    if (cambio) { COLA = []; renderCola(); irSub("indice"); }
    renderCabecera();
    renderIndice();
    $("tab-expediente").disabled = false;
    irPanel("expediente");
    history.replaceState(null, "", "?cartera=" + EXP.cartera + "&radicado=" + encodeURIComponent(EXP.radicado));
    if (cambio) registrarEvento("consultar");
  } catch (e) {
    toast("Error abriendo el expediente: " + e.message, true);
  }
}

async function recargarExpediente() {
  if (!EXP) return;
  try {
    const f = await supaFetch("v_exp_digital?select=*&id=eq." + EXP.id);
    if (f && f.length) EXP = f[0];
    INDICE = await supaFetch("v_exp_indice?select=*&expediente_id=eq." + EXP.id + "&order=consecutivo.asc") || [];
    await cargarNovedades([EXP.id], true);
    if ($("sub-novedades").classList.contains("active")) renderNovedades();
    renderCabecera();
    renderIndice();
    renderCola();
    if ($("sub-bitacora").classList.contains("active")) cargarBitacora();
  } catch (e) {
    toast("No se pudo actualizar: " + e.message, true);
  }
}

function renderCabecera() {
  const e = EXP;
  $("exp-vacio").classList.add("hidden");
  $("exp-contenido").classList.remove("hidden");
  const cerrado = e.estado === "cerrado";
  $("exp-chips").innerHTML =
    `${chipCartera(e.cartera)}
     <span class="chip chip-${esc(e.estado)}">Expediente ${esc(e.estado)}</span> ${chipsSituacion(e)}`;
  $("exp-rad").textContent = radVista(e.radicado);
  $("exp-rad").title = radVista(e.radicado) !== e.radicado ? "Registrado en cartera como " + e.radicado : "";
  $("exp-sub").innerHTML =
    `<strong>${esc(e.contribuyente || "Contribuyente sin nombre")}</strong>` +
    (e.id_contribuyente ? " · C.C./NIT " + esc(e.id_contribuyente) : "") +
    "<br>Estado en cartera: " + esc(e.estado_cartera || "—") +
    " · Valor: " + fmtMoneda(e.valor_total) +
    "<br>Creado por " + esc(e.creado_por_email || "—") + " el " + fmtFechaHora(e.creado_en) +
    (NOV[e.id] ? '<br><span class="nov-linea">' + esc(textoNovedad(NOV[e.id])) + "</span>" : "");
  $("kpi-docs").textContent = e.total_documentos;
  $("kpi-folios").textContent = e.total_folios;
  $("kpi-anul").textContent = INDICE.filter(d => d.anulado).length;

  const av = $("exp-aviso-cerrado");
  av.classList.toggle("hidden", !cerrado);
  if (cerrado) av.textContent = "Expediente cerrado el " + fmtFechaHora(e.cerrado_en) + " por " + (e.cerrado_por_email || "—") + ". No admite nuevos documentos.";
  $("btn-estado").textContent = cerrado ? "🔓 Reabrir expediente" : "🔒 Cerrar expediente";
  $("inc-cerrado").classList.toggle("hidden", !cerrado);
  $("inc-abierto").classList.toggle("hidden", cerrado);
  const sinDocs = !INDICE.length;
  $("btn-indice-pdf").disabled = sinDocs;
  $("btn-foliado").disabled = sinDocs;
  $("btn-indice-csv").disabled = sinDocs;
}

// ════════════════════════════════════════════════════════════
// ÍNDICE
// ════════════════════════════════════════════════════════════
function renderIndice() {
  const verAnul = $("chk-anulados").checked;
  const grupo = $("f-grupo").value;
  const filas = INDICE.filter(d => {
    if (!verAnul && d.anulado) return false;
    if (grupo === "__sin") return !d.etapa_codigo;
    if (grupo) return d.etapa_grupo === grupo;
    return true;
  });
  if (!filas.length) {
    $("idx-body").innerHTML = `<tr><td colspan="8" class="empty">${INDICE.length ? "Ningún documento con ese filtro." : "El expediente aún no tiene documentos. Usa la pestaña «Incorporar documentos»."}</td></tr>`;
    return;
  }
  $("idx-body").innerHTML = filas.map(d => `<tr class="${d.anulado ? "anulado" : ""}">
    <td class="num"><strong>${d.consecutivo}</strong></td>
    <td>
      <div class="doc-desc">${esc(d.descripcion)}</div>
      <div class="doc-meta">${esc(d.tipo_nombre)} · ${d.origen === "externo" ? "Aportado por tercero" : "Producido por la Dirección"} · ${fmtBytes(d.tamano_bytes)}</div>
      <div class="doc-hash" title="Huella SHA-256">${esc(d.sha256)}</div>
      ${d.anulado ? `<div class="anul-motivo">Anulado el ${fmtFechaHora(d.anulado_en)} por ${esc(d.anulado_por_email || "—")}: ${esc(d.anulado_motivo)}</div>` : ""}
    </td>
    <td class="small">${esc(d.etapa_nombre || "—")}${d.etapa_grupo ? `<div class="muted">${esc(d.etapa_grupo)}</div>` : ""}</td>
    <td class="nowrap">${fmtFecha(d.fecha_documento)}</td>
    <td class="small nowrap">${fmtFechaHora(d.fecha_incorporacion)}<div class="muted">${esc(d.incorporado_por_email || "")}</div></td>
    <td class="num">${d.paginas}</td>
    <td><span class="folio">${d.folio_inicial}<small>a</small>${d.folio_final}</span></td>
    <td><div class="acc">
      <button class="btn btn-icon" title="Ver" onclick="verDocumento(${d.id})">👁</button>
      <button class="btn btn-icon" title="Descargar" onclick="descargarDocumento(${d.id})">⬇</button>
      ${d.anulado ? "" : `<button class="btn btn-icon btn-danger" title="Anular" onclick="abrirModalAnular(${d.id})">⊘</button>`}
    </div></td>
  </tr>`).join("");
}

function docPorId(id) { return INDICE.find(d => d.id === id); }

async function verDocumento(id) {
  const d = docPorId(id);
  if (!d || !sbAuth) return;
  try {
    const { data, error } = await sbAuth.storage.from(BUCKET).createSignedUrl(d.storage_path, URL_FIRMADA_S);
    if (error) throw error;
    $("visor-t").textContent = "N.º " + d.consecutivo + " · " + d.descripcion;
    $("visor-frame").src = data.signedUrl;
    $("visor-tab").href = data.signedUrl;
    abrirModal("m-visor");
    registrarEvento("descargar", d.id, { modo: "ver" });
  } catch (e) {
    toast("No se pudo abrir el documento: " + (e.message || e), true);
  }
}

async function descargarDocumento(id) {
  const d = docPorId(id);
  if (!d || !sbAuth) return;
  try {
    const nombre = nombreArchivoSeguro(radVista(EXP.radicado)) + "_" + String(d.consecutivo).padStart(3, "0") + "_" +
                   nombreArchivoSeguro(d.descripcion).slice(0, 60) + ".pdf";
    const { data, error } = await sbAuth.storage.from(BUCKET).createSignedUrl(d.storage_path, URL_FIRMADA_S, { download: nombre });
    if (error) throw error;
    const a = document.createElement("a");
    a.href = data.signedUrl; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    registrarEvento("descargar", d.id, { modo: "descarga" });
  } catch (e) {
    toast("No se pudo descargar: " + (e.message || e), true);
  }
}

// ── Anular ──
function abrirModalAnular(id) {
  const d = docPorId(id);
  if (!d) return;
  docAnular = d;
  $("anular-info").textContent = "N.º " + d.consecutivo + " · " + d.descripcion + " · folios " + d.folio_inicial + " a " + d.folio_final;
  $("anular-motivo").value = "";
  abrirModal("m-anular");
  setTimeout(() => $("anular-motivo").focus(), 50);
}
async function confirmarAnular() {
  const motivo = $("anular-motivo").value.trim();
  if (motivo.length < 10) { toast("El motivo debe tener al menos 10 caracteres.", true); return; }
  const btn = $("btn-anular-ok");
  btn.disabled = true;
  try {
    await rpc("exp_anular_documento", { p_documento_id: docAnular.id, p_motivo: motivo });
    cerrarModal("m-anular");
    toast("Documento anulado. Se conserva en el índice con sus folios.");
    await recargarExpediente();
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ── Cerrar / reabrir ──
function abrirModalEstado() {
  if (!EXP) return;
  const cerrar = EXP.estado === "abierto";
  $("estado-t").textContent = cerrar ? "Cerrar expediente" : "Reabrir expediente";
  $("estado-info").textContent = cerrar
    ? "Un expediente cerrado no admite nuevos documentos. Se puede reabrir después, dejando el motivo en la bitácora."
    : "Al reabrirlo se podrán incorporar documentos de nuevo. El motivo queda en la bitácora.";
  $("estado-motivo").value = "";
  abrirModal("m-estado");
  setTimeout(() => $("estado-motivo").focus(), 50);
}
async function confirmarEstado() {
  const motivo = $("estado-motivo").value.trim();
  if (motivo.length < 10) { toast("El motivo debe tener al menos 10 caracteres.", true); return; }
  const btn = $("btn-estado-ok");
  btn.disabled = true;
  try {
    await rpc("exp_cambiar_estado", {
      p_expediente_id: EXP.id,
      p_estado: EXP.estado === "abierto" ? "cerrado" : "abierto",
      p_motivo: motivo
    });
    cerrarModal("m-estado");
    toast(EXP.estado === "abierto" ? "Expediente cerrado." : "Expediente reabierto.");
    await recargarExpediente();
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ── Bitácora ──
async function cargarBitacora() {
  if (!EXP) return;
  $("bit-body").innerHTML = `<tr><td colspan="4" class="empty">Cargando…</td></tr>`;
  try {
    const filas = await supaFetch("exp_bitacora?select=*&expediente_id=eq." + EXP.id + "&order=fecha.desc&limit=300") || [];
    const consec = {};
    INDICE.forEach(d => { consec[d.id] = d.consecutivo; });
    $("bit-body").innerHTML = filas.length ? filas.map(b => {
      const det = b.detalle || {};
      const partes = [];
      if (b.documento_id) partes.push("Doc. N.º " + (consec[b.documento_id] || "?"));
      if (det.folios) partes.push("folios " + det.folios);
      if (det.motivo) partes.push("motivo: " + det.motivo);
      if (det.modo) partes.push(det.modo);
      if (det.tipo === "foliado") partes.push("expediente foliado");
      if (det.tipo === "indice") partes.push("índice electrónico");
      if (det.canal && det.canal !== "manual") partes.push("canal: " + det.canal);
      return `<tr>
        <td class="nowrap small">${fmtFechaHora(b.fecha)}</td>
        <td>${esc(ACCIONES[b.accion] || b.accion)}</td>
        <td class="small">${esc(b.usuario_email || "—")}</td>
        <td class="small muted">${esc(partes.join(" · "))}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="4" class="empty">Sin movimientos.</td></tr>`;
  } catch (e) {
    $("bit-body").innerHTML = `<tr><td colspan="4" class="empty">No se pudo cargar: ${esc(e.message)}</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════════
// INCORPORAR DOCUMENTOS
// ════════════════════════════════════════════════════════════
function configurarDropzone() {
  const dz = $("dz"), inp = $("dz-input");
  dz.addEventListener("click", () => inp.click());
  dz.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); } });
  inp.addEventListener("change", () => { agregarArchivos(inp.files); inp.value = ""; });
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => agregarArchivos(e.dataTransfer.files));
}

async function sha256Hex(buf) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function contarPaginas(buf) {
  if (!window.pdfjsLib) throw new Error("No cargó el lector de PDF (pdf.js).");
  const tarea = window.pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) });
  const pdf = await tarea.promise;
  const n = pdf.numPages;
  try { await pdf.destroy(); } catch (e) {}
  return n;
}

function descripcionDesdeNombre(nombre) {
  return String(nombre).replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

async function agregarArchivos(lista) {
  if (!EXP || EXP.estado !== "abierto") return;
  const archivos = Array.from(lista || []);
  if (!archivos.length) return;
  progreso(true, "Analizando archivos", "", 0);
  let i = 0;
  for (const file of archivos) {
    i++;
    progreso(true, "Analizando archivos", file.name, (i - 1) / archivos.length * 100);
    const item = {
      uid: Math.random().toString(36).slice(2, 10),
      file, nombre: file.name, tamano: file.size,
      sha: "", paginas: 0,
      tipo: "", etapa: "", descripcion: descripcionDesdeNombre(file.name),
      fecha: "", origen: "interno", obs: "",
      estado: "listo", msg: ""
    };
    try {
      const esPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!esPdf) throw new Error("No es un PDF.");
      if (file.size > MAX_BYTES) throw new Error("Supera 50 MB (" + fmtBytes(file.size) + ").");
      if (file.size === 0) throw new Error("El archivo está vacío.");
      const buf = await file.arrayBuffer();
      item.sha = await sha256Hex(buf);
      try {
        item.paginas = await contarPaginas(buf);
      } catch (e) {
        throw new Error("PDF dañado o protegido con contraseña; no se pudo leer.");
      }
      const enIndice = INDICE.find(d => !d.anulado && d.sha256 === item.sha);
      const enCola = COLA.find(q => q.sha === item.sha && q.estado !== "error");
      if (enIndice) { item.estado = "dup"; item.msg = "Ya está incorporado como N.º " + enIndice.consecutivo + " (folios " + enIndice.folio_inicial + " a " + enIndice.folio_final + ")."; }
      else if (enCola) { item.estado = "dup"; item.msg = "Este mismo archivo ya está en la lista como «" + enCola.nombre + "»."; }
    } catch (e) {
      item.estado = "error";
      item.msg = e.message;
    }
    COLA.push(item);
  }
  progreso(false);
  renderCola();
}

function itemsPendientes() { return COLA.filter(q => q.estado === "listo"); }

function opcionesTipos(sel) {
  return '<option value="">— Selecciona —</option>' +
    TIPOS.map(t => `<option value="${esc(t.codigo)}"${t.codigo === sel ? " selected" : ""}>${esc(t.nombre)}</option>`).join("");
}
function textoEtapaSugerida(tipo) {
  const t = TIPOS_MAP[tipo];
  if (!t || !t.etapa_sugerida) return "Sin etapa (o elige una)";
  const e = ETAPAS_MAP[t.etapa_sugerida];
  return "Sugerida: " + (e ? e.nombre : t.etapa_sugerida);
}
function opcionesEtapas(tipo, sel) {
  return `<option value="">${esc(textoEtapaSugerida(tipo))}</option>` +
    ETAPAS.map(e => `<option value="${esc(e.codigo)}"${e.codigo === sel ? " selected" : ""}>${esc(e.grupo)} · ${esc(e.nombre)}</option>`).join("");
}

function renderCola() {
  const cont = $("cola");
  if (!cont) return;
  if (!COLA.length) { cont.innerHTML = ""; $("cola-foot").classList.add("hidden"); return; }
  const subiendo = COLA.some(q => q.estado === "subiendo");
  // Vista previa de consecutivos y folios según el orden actual
  let cons = EXP ? EXP.total_documentos : 0;
  let fol = EXP ? EXP.total_folios : 0;
  cont.innerHTML = COLA.map((q, idx) => {
    let prev = "";
    if (q.estado === "listo") {
      cons++; const fi = fol + 1; fol += q.paginas;
      prev = `Quedará como N.º ${cons} · folios ${fi} a ${fol}`;
    }
    const clase = { listo: "", error: "err", dup: "dup", ok: "ok", subiendo: "sub-ing" }[q.estado] || "";
    const editable = q.estado === "listo" && !subiendo;
    const info = [fmtBytes(q.tamano), q.paginas ? q.paginas + " pág." : "", q.sha ? "SHA-256 " + q.sha.slice(0, 16) + "…" : ""].filter(Boolean).join(" · ");
    const botones = subiendo ? "" : `
      ${q.estado === "listo" ? `<button class="btn btn-icon" title="Subir en el orden" onclick="moverItem('${q.uid}',-1)" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="btn btn-icon" title="Bajar en el orden" onclick="moverItem('${q.uid}',1)" ${idx === COLA.length - 1 ? "disabled" : ""}>↓</button>` : ""}
      ${q.estado !== "ok" ? `<button class="btn btn-icon btn-danger" title="Quitar de la lista" onclick="quitarItem('${q.uid}')">✕</button>` : ""}`;
    const campos = q.estado === "listo" ? `
      <div class="qi-grid">
        <div class="f w2"><label>Tipo documental *</label>
          <select class="sel" ${editable ? "" : "disabled"} onchange="editarItem('${q.uid}','tipo',this.value)">${opcionesTipos(q.tipo)}</select></div>
        <div class="f w2"><label>Etapa del proceso</label>
          <select class="sel" id="etp-${q.uid}" ${editable ? "" : "disabled"} onchange="editarItem('${q.uid}','etapa',this.value)">${opcionesEtapas(q.tipo, q.etapa)}</select></div>
        <div class="f w4"><label>Descripción en el índice *</label>
          <input class="inp" maxlength="300" value="${esc(q.descripcion)}" ${editable ? "" : "disabled"} oninput="editarItem('${q.uid}','descripcion',this.value)"></div>
        <div class="f"><label>Fecha del documento</label>
          <input class="inp" type="date" max="${hoyISO()}" value="${esc(q.fecha)}" ${editable ? "" : "disabled"} onchange="editarItem('${q.uid}','fecha',this.value)"></div>
        <div class="f"><label>Origen</label>
          <select class="sel" ${editable ? "" : "disabled"} onchange="editarItem('${q.uid}','origen',this.value)">
            <option value="interno"${q.origen === "interno" ? " selected" : ""}>Producido por la Dirección</option>
            <option value="externo"${q.origen === "externo" ? " selected" : ""}>Aportado por tercero</option>
          </select></div>
        <div class="f w2"><label>Observaciones</label>
          <input class="inp" maxlength="500" value="${esc(q.obs)}" ${editable ? "" : "disabled"} oninput="editarItem('${q.uid}','obs',this.value)"></div>
      </div>` : "";
    return `<div class="qi ${clase}">
      <div class="qi-top">
        <div>
          <div class="qi-name">📄 ${esc(q.nombre)}</div>
          <div class="qi-info">${esc(info)}</div>
          ${prev ? `<div class="qi-prev">${prev}</div>` : ""}
        </div>
        <div class="qi-btns">${botones}</div>
      </div>
      ${campos}
      ${q.msg ? `<div class="qi-msg">${esc(q.msg)}</div>` : ""}
    </div>`;
  }).join("");

  const n = itemsPendientes().length;
  $("cola-foot").classList.remove("hidden");
  const btn = $("btn-subir");
  btn.disabled = subiendo || n === 0;
  btn.textContent = subiendo ? "Incorporando…" : (n ? "Incorporar " + n + " documento" + (n === 1 ? "" : "s") : "Nada por incorporar");
}

function editarItem(uid, campo, valor) {
  const q = COLA.find(x => x.uid === uid);
  if (!q) return;
  q[campo] = valor;
  if (campo === "tipo") {
    const sel = $("etp-" + uid);
    if (sel && sel.options.length) sel.options[0].textContent = textoEtapaSugerida(valor);
  }
}
function moverItem(uid, dir) {
  const i = COLA.findIndex(x => x.uid === uid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= COLA.length) return;
  [COLA[i], COLA[j]] = [COLA[j], COLA[i]];
  renderCola();
}
function quitarItem(uid) {
  COLA = COLA.filter(x => x.uid !== uid);
  renderCola();
}
function limpiarCola() {
  COLA = COLA.filter(q => q.estado === "listo" || q.estado === "subiendo");
  renderCola();
}

// ── Incorporación de un documento: la usan la pestaña manual y la carga masiva ──
// Sube el PDF al bucket y lo registra en exp_documentos (la BD asigna consecutivo y folios).
let CANAL_MASIVO = "masivo";   // si la BD no acepta este canal, se registra como "manual"
async function incorporarDocumento(p) {
  const ruta = p.cartera + "/" + p.radicadoNorm + "/" + p.sha + "-" + Date.now() + ".pdf";
  try {
    const { error } = await sbAuth.storage.from(BUCKET).upload(ruta, p.file, {
      contentType: "application/pdf", upsert: false, cacheControl: "3600"
    });
    if (error) throw error;
  } catch (e) {
    throw new Error("No se pudo subir el archivo: " + (e.message || e));
  }
  if (p.alRegistrar) p.alRegistrar();
  const fila = {
    expediente_id: p.expedienteId,
    tipo_documental: p.tipo,
    etapa_codigo: p.etapa || null,
    descripcion: String(p.descripcion || "").trim(),
    fecha_documento: p.fecha || null,
    origen: p.origen,
    paginas: p.paginas,
    tamano_bytes: p.tamano,
    sha256: p.sha,
    storage_path: ruta,
    nombre_original: p.nombre,
    canal_ingreso: p.canal || "manual",
    observaciones: String(p.obs || "").trim() || null
  };
  const insertar = () => supaFetch("exp_documentos", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(fila)
  });
  try {
    const r = await insertar();
    return r && r[0];
  } catch (e) {
    // Si la BD solo admite ciertos canales, se reintenta como "manual" dejando constancia
    if (fila.canal_ingreso !== "manual" && /canal|check/i.test(e.message)) {
      CANAL_MASIVO = "manual";
      fila.canal_ingreso = "manual";
      fila.observaciones = ((fila.observaciones || "") + " (carga masiva)").trim();
      try {
        const r2 = await insertar();
        return r2 && r2[0];
      } catch (e2) { e = e2; }
    }
    console.warn("Archivo sin registrar en el índice:", ruta);
    throw new Error(e.message + " (el archivo quedó en el repositorio pero NO entró al índice).");
  }
}

async function subirCola() {
  if (!EXP || !sbAuth) return;
  const pendientes = itemsPendientes();
  if (!pendientes.length) return;
  const sinTipo = pendientes.filter(q => !q.tipo);
  const sinDesc = pendientes.filter(q => q.descripcion.trim().length < 3);
  if (sinTipo.length) { toast("Falta el tipo documental en: " + sinTipo.map(q => q.nombre).join(", "), true); return; }
  if (sinDesc.length) { toast("La descripción debe tener al menos 3 caracteres en: " + sinDesc.map(q => q.nombre).join(", "), true); return; }
  if (!confirm("Se incorporarán " + pendientes.length + " documento(s) a " + EXP.radicado +
               " en el orden de la lista. Después no se podrán editar ni reordenar, solo anular. ¿Continuar?")) return;

  let ok = 0, fallos = 0;
  // Secuencial a propósito: el orden de incorporación define consecutivo y folios
  for (const q of pendientes) {
    q.estado = "subiendo"; q.msg = "Subiendo archivo…";
    renderCola();
    try {
      const d = await incorporarDocumento({
        expedienteId: EXP.id, cartera: EXP.cartera, radicadoNorm: EXP.radicado_norm,
        file: q.file, nombre: q.nombre, tamano: q.tamano, sha: q.sha, paginas: q.paginas,
        tipo: q.tipo, etapa: q.etapa, descripcion: q.descripcion, fecha: q.fecha,
        origen: q.origen, obs: q.obs, canal: "manual",
        alRegistrar: () => { q.msg = "Registrando en el índice…"; renderCola(); }
      });
      q.estado = "ok";
      q.msg = d ? "Incorporado como N.º " + d.consecutivo + " · folios " + d.folio_inicial + " a " + d.folio_final : "Incorporado.";
      ok++;
      // Refresca totales para que la vista previa del resto sea exacta
      if (d) { EXP.total_documentos = d.consecutivo; EXP.total_folios = d.folio_final; }
    } catch (e) {
      q.estado = "error"; q.msg = e.message; fallos++;
    }
  }
  renderCola();
  await recargarExpediente();
  if (fallos) toast(ok + " incorporado(s), " + fallos + " con error. Revisa la lista.", true);
  else toast(ok + " documento(s) incorporado(s) al expediente.");
}

// ════════════════════════════════════════════════════════════
// PDF: ÍNDICE ELECTRÓNICO Y EXPEDIENTE FOLIADO  (pdf-lib)
// ════════════════════════════════════════════════════════════
const PAGINA = [612, 792];   // carta
const MARGEN = 36;

// pdf-lib con fuentes estándar solo codifica WinAnsi (Latin-1)
function latin(s) {
  return String(s === null || s === undefined ? "" : s).normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function partirTexto(texto, fuente, tam, ancho) {
  const palabras = latin(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? actual + " " + p : p;
    if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) { actual = prueba; continue; }
    if (actual) lineas.push(actual);
    if (fuente.widthOfTextAtSize(p, tam) <= ancho) { actual = p; continue; }
    // palabra más larga que la columna: cortar por caracteres
    let trozo = "";
    for (const ch of p) {
      if (fuente.widthOfTextAtSize(trozo + ch, tam) > ancho) { lineas.push(trozo); trozo = ch; }
      else trozo += ch;
    }
    actual = trozo;
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

async function cargarFuentes(pdf) {
  const SF = window.PDFLib.StandardFonts;
  return {
    reg:  await pdf.embedFont(SF.Helvetica),
    bold: await pdf.embedFont(SF.HelveticaBold),
    mono: await pdf.embedFont(SF.Courier)
  };
}

// Dibuja el índice electrónico en páginas nuevas al inicio de `pdf`.
// meta = { exp, docs, generadoPor, generadoEn }
function construirIndice(pdf, F, meta) {
  const { rgb } = window.PDFLib;
  const NAVY = rgb(0.04, 0.12, 0.24), GRIS = rgb(0.42, 0.45, 0.5), ROJO = rgb(0.7, 0.15, 0.15), LINEA = rgb(0.82, 0.84, 0.88);
  const [W, H] = PAGINA;
  const cols = [
    { k: "n",    t: "N.º",          w: 24,  a: "r" },
    { k: "doc",  t: "Documento",    w: 250, a: "l" },
    { k: "fdoc", t: "Fecha doc.",   w: 52,  a: "l" },
    { k: "finc", t: "Incorporado",  w: 78,  a: "l" },
    { k: "orig", t: "Origen",       w: 46,  a: "l" },
    { k: "pag",  t: "Págs.",        w: 30,  a: "r" },
    { k: "fol",  t: "Folios",       w: 60,  a: "r" }
  ];
  const e = meta.exp;
  const paginas = [];
  let page, y;

  function nuevaPagina(primera) {
    page = pdf.insertPage(paginas.length, PAGINA);
    paginas.push(page);
    y = H - MARGEN;
    page.drawText(latin("ALCALDÍA DE BELLO · Dirección Administrativa de Ejecuciones Fiscales"), { x: MARGEN, y: y - 9, size: 9, font: F.bold, color: NAVY });
    y -= 26;
    if (primera) {
      page.drawText(latin("ÍNDICE ELECTRÓNICO DEL EXPEDIENTE"), { x: MARGEN, y: y - 14, size: 16, font: F.bold, color: NAVY });
      y -= 30;
      const datos = [
        ["Radicado", radVista(e.radicado)],
        ["Cartera", CARTERAS[e.cartera] || e.cartera],
        ["Contribuyente", (e.contribuyente || "-") + (e.id_contribuyente ? "  ·  C.C./NIT " + e.id_contribuyente : "")],
        ["Estado del expediente", e.estado + (e.cerrado_en ? " (cerrado el " + fmtFechaHora(e.cerrado_en) + ")" : "")],
        ["Total", e.total_documentos + " documento(s) · " + e.total_folios + " folio(s)" +
                  (meta.docs.some(d => d.anulado) ? " · " + meta.docs.filter(d => d.anulado).length + " anulado(s)" : "")],
        ["Generado", fmtFechaHora(meta.generadoEn) + " por " + (meta.generadoPor || "-")]
      ];
      for (const [k, v] of datos) {
        page.drawText(latin(k + ":"), { x: MARGEN, y: y - 9, size: 8.5, font: F.bold, color: GRIS });
        page.drawText(latin(v), { x: MARGEN + 110, y: y - 9, size: 8.5, font: F.reg, color: NAVY });
        y -= 13;
      }
      y -= 6;
      const aclaracion = "Nota: la validez de los documentos con firma digital se verifica sobre el archivo original registrado " +
        "en el repositorio, identificado con la huella SHA-256 de este índice. Las compilaciones foliadas son copias de " +
        "consulta: al reunir y sellar las páginas, la firma digital no se conserva en la copia.";
      for (const l of partirTexto(aclaracion, F.reg, 7, W - 2 * MARGEN)) {
        page.drawText(l, { x: MARGEN, y: y - 7, size: 7, font: F.reg, color: GRIS });
        y -= 9;
      }
      y -= 10;
    }
    // encabezado de columnas
    page.drawRectangle({ x: MARGEN, y: y - 16, width: W - 2 * MARGEN, height: 16, color: NAVY });
    let x = MARGEN;
    for (const c of cols) {
      const tw = F.bold.widthOfTextAtSize(latin(c.t), 7.5);
      page.drawText(latin(c.t), { x: c.a === "r" ? x + c.w - 4 - tw : x + 4, y: y - 11, size: 7.5, font: F.bold, color: rgb(1, 1, 1) });
      x += c.w;
    }
    y -= 20;
  }

  nuevaPagina(true);

  for (const d of meta.docs) {
    const anchoDoc = cols[1].w - 8;
    const lDesc = partirTexto((d.anulado ? "[ANULADO] " : "") + d.descripcion, F.bold, 7.5, anchoDoc);
    const lTipo = partirTexto(d.tipo_nombre + (d.etapa_nombre ? " · Etapa: " + d.etapa_nombre : ""), F.reg, 6.8, anchoDoc);
    const lAnul = d.anulado ? partirTexto("Anulado el " + fmtFechaHora(d.anulado_en) + " por " + (d.anulado_por_email || "-") + ": " + d.anulado_motivo, F.reg, 6.5, anchoDoc) : [];
    const lHash = ["SHA-256 " + d.sha256.slice(0, 32), "        " + d.sha256.slice(32)];
    const lFinc = [fmtFechaHora(d.fecha_incorporacion)].concat(partirTexto(d.incorporado_por_email || "", F.reg, 6.5, cols[3].w - 8));
    const alto = Math.max(lDesc.length * 9 + lTipo.length * 8 + lAnul.length * 8 + lHash.length * 7.5, lFinc.length * 8.5) + 8;

    if (y - alto < MARGEN + 24) nuevaPagina(false);

    const txtColor = d.anulado ? GRIS : NAVY;
    let x = MARGEN;
    const top = y - 9;
    // N.º
    const sn = String(d.consecutivo);
    page.drawText(sn, { x: x + cols[0].w - 4 - F.bold.widthOfTextAtSize(sn, 7.5), y: top, size: 7.5, font: F.bold, color: txtColor });
    x += cols[0].w;
    // Documento
    let yy = top;
    for (const l of lDesc) { page.drawText(l, { x: x + 4, y: yy, size: 7.5, font: F.bold, color: txtColor }); yy -= 9; }
    for (const l of lTipo) { page.drawText(l, { x: x + 4, y: yy, size: 6.8, font: F.reg, color: GRIS }); yy -= 8; }
    for (const l of lAnul) { page.drawText(l, { x: x + 4, y: yy, size: 6.5, font: F.reg, color: ROJO }); yy -= 8; }
    for (const l of lHash) { page.drawText(l, { x: x + 4, y: yy, size: 5.6, font: F.mono, color: GRIS }); yy -= 7.5; }
    x += cols[1].w;
    // Fecha documento
    page.drawText(latin(fmtFecha(d.fecha_documento)), { x: x + 4, y: top, size: 7, font: F.reg, color: txtColor });
    x += cols[2].w;
    // Incorporado
    yy = top;
    lFinc.forEach((l, i) => { page.drawText(latin(l), { x: x + 4, y: yy, size: i ? 6.5 : 7, font: F.reg, color: i ? GRIS : txtColor }); yy -= 8.5; });
    x += cols[3].w;
    // Origen
    page.drawText(d.origen === "externo" ? "Tercero" : "Dirección", { x: x + 4, y: top, size: 7, font: F.reg, color: txtColor });
    x += cols[4].w;
    // Páginas
    const sp = String(d.paginas);
    page.drawText(sp, { x: x + cols[5].w - 4 - F.reg.widthOfTextAtSize(sp, 7), y: top, size: 7, font: F.reg, color: txtColor });
    x += cols[5].w;
    // Folios
    const sf = d.folio_inicial + " - " + d.folio_final;
    page.drawText(sf, { x: x + cols[6].w - 4 - F.bold.widthOfTextAtSize(sf, 7.5), y: top, size: 7.5, font: F.bold, color: txtColor });

    y -= alto;
    page.drawLine({ start: { x: MARGEN, y: y + 2 }, end: { x: W - MARGEN, y: y + 2 }, thickness: 0.4, color: LINEA });
  }

  // Pie en cada página del índice
  const total = paginas.length;
  paginas.forEach((p, i) => {
    const pie = latin("Índice electrónico · " + radVista(e.radicado) + " · Página " + (i + 1) + " de " + total);
    p.drawText(pie, { x: MARGEN, y: MARGEN - 14, size: 7, font: F.reg, color: GRIS });
    const nota = latin("La huella SHA-256 permite verificar que cada documento no ha sido alterado desde su incorporación.");
    p.drawText(nota, { x: W - MARGEN - F.reg.widthOfTextAtSize(nota, 6.5), y: MARGEN - 14, size: 6.5, font: F.reg, color: GRIS });
  });
  return total;
}

// Sello de folio en la esquina superior derecha visible, respetando la rotación de la página
function sellarFolio(page, texto, F) {
  const { rgb, degrees } = window.PDFLib;
  const caja = page.getCropBox ? page.getCropBox() : page.getMediaBox();
  const bx = caja.x, by = caja.y, w = caja.width, h = caja.height;
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const tam = 8, m = 14, pad = 3;
  const tw = F.bold.widthOfTextAtSize(texto, tam);
  let x, y;
  if (rot === 90)       { x = bx + m + tam;       y = by + h - m - tw; }
  else if (rot === 180) { x = bx + m + tw;        y = by + m + tam; }
  else if (rot === 270) { x = bx + w - m - tam;   y = by + m + tw; }
  else                  { x = bx + w - m - tw;    y = by + h - m - tam; }
  // Recuadro blanco detrás del texto, en el mismo marco rotado
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const ox = -pad, oy = -pad - 1.5;
  page.drawRectangle({
    x: x + c * ox - s * oy, y: y + s * ox + c * oy,
    width: tw + 2 * pad, height: tam + 2 * pad,
    color: rgb(1, 1, 1), opacity: 0.9,
    borderColor: rgb(0.04, 0.12, 0.24), borderWidth: 0.5,
    rotate: degrees(rot)
  });
  page.drawText(texto, { x, y, size: tam, font: F.bold, color: rgb(0.04, 0.12, 0.24), rotate: degrees(rot) });
}

// Página que ocupa el lugar de un documento anulado o ilegible dentro del foliado
function paginaAviso(pdf, F, titulo, lineas) {
  const { rgb } = window.PDFLib;
  const p = pdf.addPage(PAGINA);
  let y = PAGINA[1] - 140;
  p.drawText(latin(titulo), { x: MARGEN + 20, y, size: 15, font: F.bold, color: rgb(0.04, 0.12, 0.24) });
  y -= 26;
  for (const l of lineas) {
    for (const t of partirTexto(l, F.reg, 10, PAGINA[0] - 2 * MARGEN - 40)) {
      p.drawText(t, { x: MARGEN + 20, y, size: 10, font: F.reg, color: rgb(0.3, 0.33, 0.38) });
      y -= 15;
    }
    y -= 4;
  }
  return p;
}

async function descargarIndicePDF() {
  if (!EXP || !INDICE.length) return;
  if (!window.PDFLib) { toast("No cargó la librería pdf-lib. Recarga la página.", true); return; }
  try {
    const pdf = await window.PDFLib.PDFDocument.create();
    pdf.setTitle("Índice electrónico " + radVista(EXP.radicado));
    pdf.setProducer("Teodoro · Ejecuciones Fiscales Bello");
    const F = await cargarFuentes(pdf);
    construirIndice(pdf, F, { exp: EXP, docs: INDICE, generadoPor: USUARIO_EMAIL, generadoEn: new Date() });
    const bytes = await pdf.save();
    descargarBlob(bytes, "Indice_" + nombreArchivoSeguro(radVista(EXP.radicado)) + ".pdf");
    registrarEvento("exportar_indice", null, { tipo: "indice" });
  } catch (e) {
    console.error(e);
    toast("No se pudo generar el índice: " + e.message, true);
  }
}

async function descargarFoliado() {
  if (!EXP || !INDICE.length || !sbAuth) return;
  if (!window.PDFLib) { toast("No cargó la librería pdf-lib. Recarga la página.", true); return; }
  const { PDFDocument } = window.PDFLib;
  const alertas = [];
  try {
    progreso(true, "Armando expediente foliado", "Preparando…", 0);
    const pdf = await PDFDocument.create();
    pdf.setTitle("Expediente " + radVista(EXP.radicado));
    pdf.setProducer("Teodoro · Ejecuciones Fiscales Bello");
    const F = await cargarFuentes(pdf);

    let i = 0;
    for (const d of INDICE) {
      i++;
      progreso(true, "Armando expediente foliado", "Documento " + i + " de " + INDICE.length + ": " + d.descripcion, (i - 1) / INDICE.length * 100);

      if (d.anulado) {
        paginaAviso(pdf, F, "Documento N.º " + d.consecutivo + " anulado", [
          "Folios " + d.folio_inicial + " a " + d.folio_final + " · " + d.descripcion,
          "Anulado el " + fmtFechaHora(d.anulado_en) + " por " + (d.anulado_por_email || "-") + ".",
          "Motivo: " + d.anulado_motivo,
          "Sus folios se conservan en el índice; el documento no se incluye en esta compilación."
        ]);
        continue;
      }

      let bytes;
      try {
        const { data, error } = await sbAuth.storage.from(BUCKET).download(d.storage_path);
        if (error) throw error;
        bytes = await data.arrayBuffer();
      } catch (e) {
        alertas.push("N.º " + d.consecutivo + ": no se pudo descargar");
        paginaAviso(pdf, F, "Documento N.º " + d.consecutivo + " no disponible", [
          d.descripcion + " · folios " + d.folio_inicial + " a " + d.folio_final,
          "No se pudo descargar del repositorio al generar esta compilación. Consúltelo individualmente en Teodoro."
        ]);
        continue;
      }

      // Verificación de integridad contra la huella registrada
      const huella = await sha256Hex(bytes);
      if (huella !== d.sha256) alertas.push("N.º " + d.consecutivo + ": la huella no coincide");

      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const paginas = await pdf.copyPages(src, src.getPageIndices());
        if (paginas.length !== d.paginas) alertas.push("N.º " + d.consecutivo + ": " + paginas.length + " págs. leídas vs " + d.paginas + " registradas");
        paginas.forEach((p, k) => {
          pdf.addPage(p);
          sellarFolio(p, latin(radVista(EXP.radicado) + " · Folio " + (d.folio_inicial + k)), F);
        });
      } catch (e) {
        alertas.push("N.º " + d.consecutivo + ": no se pudo incrustar");
        paginaAviso(pdf, F, "Documento N.º " + d.consecutivo + " no incrustable", [
          d.descripcion + " · folios " + d.folio_inicial + " a " + d.folio_final,
          "El archivo no pudo incorporarse a esta compilación (posiblemente protegido). Consúltelo individualmente en Teodoro."
        ]);
      }
    }

    progreso(true, "Armando expediente foliado", "Generando índice…", 96);
    construirIndice(pdf, F, { exp: EXP, docs: INDICE, generadoPor: USUARIO_EMAIL, generadoEn: new Date() });
    const salida = await pdf.save();
    progreso(false);
    descargarBlob(salida, "Expediente_" + nombreArchivoSeguro(radVista(EXP.radicado)) + "_foliado.pdf");
    registrarEvento("exportar_indice", null, { tipo: "foliado", alertas: alertas.length ? alertas : undefined });
    if (alertas.length) toast("Generado con alertas: " + alertas.join("; "), true);
    else toast("Expediente foliado generado. Integridad verificada en todos los documentos.");
  } catch (e) {
    progreso(false);
    console.error(e);
    toast("No se pudo generar el expediente foliado: " + e.message, true);
  }
}

// ════════════════════════════════════════════════════════════
// CSV DEL ÍNDICE DEL EXPEDIENTE ABIERTO
// ════════════════════════════════════════════════════════════
function descargarIndiceCSV() {
  if (!EXP || !INDICE.length) return;
  descargarCSV("Indice_" + nombreArchivoSeguro(radVista(EXP.radicado)) + "_" + fechaArchivo() + ".csv", [
    { t: "N.º", v: "consecutivo" },
    { t: "Descripción", v: "descripcion" },
    { t: "Tipo documental", v: "tipo_nombre" },
    { t: "Etapa", v: "etapa_nombre" },
    { t: "Grupo de etapa", v: "etapa_grupo" },
    { t: "Fecha del documento", v: d => fmtFecha(d.fecha_documento) },
    { t: "Origen", v: d => d.origen === "externo" ? "Aportado por tercero" : "Producido por la Dirección" },
    { t: "Páginas", v: "paginas" },
    { t: "Folio inicial", v: "folio_inicial" },
    { t: "Folio final", v: "folio_final" },
    { t: "Incorporado", v: d => fmtFechaHora(d.fecha_incorporacion) },
    { t: "Incorporado por", v: "incorporado_por_email" },
    { t: "Anulado", v: d => d.anulado ? "Sí" : "No" },
    { t: "Motivo de anulación", v: "anulado_motivo" },
    { t: "Huella SHA-256", v: "sha256" }
  ], INDICE);
  registrarEvento("exportar_indice", null, { tipo: "indice_csv" });
}

// ════════════════════════════════════════════════════════════
// CARGA MASIVA — una carpeta de PDF nombrados por radicado
// (FP-1212.pdf, FP1212-TUTELA.pdf, FP01212 RTA 2023….pdf …)
// ════════════════════════════════════════════════════════════
const CM_CLASE_BASE = "";            // archivo que solo trae el número: el expediente escaneado
const CM_HILOS = 3;                  // expedientes procesados en paralelo (dentro de cada uno, en orden)
const CM_MAX_FILAS_VISTA = 400;
let CM = { cartera: "predial", filas: [], clases: {}, corriendo: false, detener: false, iniciado: false };

function configurarCargaMasiva() {
  const inpC = $("cm-input-carpeta"), inpA = $("cm-input-archivos");
  if (!inpC) return;
  inpC.addEventListener("change", () => { cmAnalizar(inpC.files); inpC.value = ""; });
  inpA.addEventListener("change", () => { cmAnalizar(inpA.files); inpA.value = ""; });
  const dz = $("cm-dz");
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => cmAnalizar(e.dataTransfer.files));
}

// Interpreta el nombre del archivo
function cmParsear(nombre) {
  const base = String(nombre).replace(/\.pdf$/i, "");
  const m = base.match(/^\s*([A-Za-z]{0,5})[^A-Za-z0-9]*(\d+)(.*)$/);
  if (!m) return null;
  const prefijo = m[1].toUpperCase();
  const numero = m[2].replace(/^0+(?=\d)/, "");
  const esCopia = /copia/i.test(m[3]);
  let resto = m[3]
    .replace(/^[\s\-_.,'’´`]+/, "")
    .replace(/\s*[-_]?\s*\(?\s*copia\s*\)?\s*(\(\d+\))?\s*$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  const clase = resto
    ? (resto.toUpperCase().replace(/\d{6,}/g, " ").replace(/[^A-ZÁÉÍÓÚÑÜ ]+/g, " ").replace(/\s+/g, " ").trim() || "OTROS")
    : CM_CLASE_BASE;
  return { clave: prefijo + numero, prefijo, numero, resto, clase, esCopia };
}

// Variantes de radicado_norm para buscar en la BD (con y sin ceros a la izquierda)
function cmVariantes(p) {
  const out = new Set([p.prefijo + p.numero]);
  for (let k = p.numero.length + 1; k <= 6; k++) out.add(p.prefijo + p.numero.padStart(k, "0"));
  return [...out];
}

function cmNorm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

// Tipo documental sugerido según la clase del archivo
function cmSugerirTipo(clase) {
  const c = cmNorm(clase);
  const reglas = clase === CM_CLASE_BASE
    ? [/expediente/, /escane|digitaliz/, /antecedente/, /mandamiento/]
    : /tutela/.test(c) ? [/tutela/]
    : /rta|respuesta/.test(c) ? [/respuesta/, /peticion/]
    : /peticion/.test(c) ? [/peticion/, /solicitud/]
    : /hecho cumplido/.test(c) ? [/hecho cumplido/, /tutela/, /fallo/]
    : /auto/.test(c) ? [/auto/]
    : /resolucion/.test(c) ? [/resolucion/]
    : [];
  for (const r of reglas) {
    const t = TIPOS.find(x => r.test(cmNorm(x.nombre)));
    if (t) return t.codigo;
  }
  return "";
}
function cmSugerirOrigen(clase) {
  const c = cmNorm(clase);
  if (/rta|respuesta/.test(c)) return "interno";
  if (/tutela|peticion|hecho cumplido|admision/.test(c)) return "externo";
  return "interno";
}

async function cmAnalizar(lista) {
  if (CM.corriendo) { toast("Hay una carga en curso. Espera a que termine o detenla.", true); return; }
  const archivos = Array.from(lista || []);
  if (!archivos.length) return;
  if (cmModo() === "convenio") return cmAnalizarConvenios(archivos);
  CM.cartera = $("cm-cartera").value || "predial";
  CM.filas = []; CM.clases = {}; CM.iniciado = false;
  $("cm-resultado").classList.add("hidden");
  progreso(true, "Leyendo nombres", archivos.length + " archivo(s)", 5);

  // 1) Nombres
  for (const file of archivos) {
    const f = { uid: Math.random().toString(36).slice(2, 10), file, nombre: file.name, ruta: file.webkitRelativePath || file.name,
                tamano: file.size, mod: file.lastModified || 0, p: null, proc: null, estado: "listo", msg: "", descripcion: "" };
    const esPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!esPdf) { f.estado = "descartado"; f.msg = "No es PDF"; }
    else if (file.size === 0) { f.estado = "descartado"; f.msg = "Archivo vacío"; }
    else if (file.size > MAX_BYTES) { f.estado = "descartado"; f.msg = "Supera 50 MB (" + fmtBytes(file.size) + ")"; }
    else {
      f.p = cmParsear(file.name);
      if (!f.p) { f.estado = "descartado"; f.msg = "El nombre no empieza por un número de proceso"; }
    }
    CM.filas.push(f);
  }

  // 2) Cruce con la cartera, por lotes de claves
  const conClave = CM.filas.filter(f => f.p);
  const claves = [...new Set(conClave.map(f => f.p.clave))];
  const porClave = {};          // clave → [filas de v_exp_buscar]
  const variantesDe = {};
  conClave.forEach(f => { variantesDe[f.p.clave] = cmVariantes(f.p); });
  const LOTE = 80;
  try {
    for (let i = 0; i < claves.length; i += LOTE) {
      progreso(true, "Buscando los procesos en la cartera", (i + 1) + " a " + Math.min(i + LOTE, claves.length) + " de " + claves.length, 10 + i / claves.length * 85);
      const vals = [];
      claves.slice(i, i + LOTE).forEach(k => vals.push(...variantesDe[k]));
      const filas = await supaFetch("v_exp_buscar?select=cartera,radicado,radicado_norm,contribuyente,id_contribuyente,estado_cartera,exp_id,estado_expediente,total_documentos" +
        "&cartera=eq." + encodeURIComponent(CM.cartera) +
        "&radicado_norm=in.(" + vals.map(encodeURIComponent).join(",") + ")") || [];
      filas.forEach(r => {
        const k = claveRadicado(r.radicado_norm || r.radicado);
        (porClave[k] = porClave[k] || []);
        if (!porClave[k].some(x => x.radicado === r.radicado)) porClave[k].push(r);
      });
    }
  } catch (e) {
    progreso(false);
    toast("No se pudo consultar la cartera: " + e.message, true);
    return;
  }
  progreso(false);

  // 3) Asignación, clases y descripciones
  conClave.forEach(f => {
    const c = porClave[f.p.clave] || [];
    if (!c.length) { f.estado = "sinproceso"; f.msg = "No está en la cartera de " + (CARTERAS[CM.cartera] || CM.cartera); return; }
    if (c.length > 1) { f.estado = "ambiguo"; f.msg = "Coincide con varios procesos: " + c.map(x => x.radicado).join(", "); return; }
    f.proc = c[0];
    if (f.proc.estado_expediente === "cerrado") { f.estado = "cerrado"; f.msg = "El expediente digital está cerrado"; return; }
    if (!CM.clases[f.p.clase]) {
      CM.clases[f.p.clase] = {
        n: 0, ejemplo: f.nombre, tipo: cmSugerirTipo(f.p.clase), etapa: "", origen: cmSugerirOrigen(f.p.clase),
        desc: f.p.clase === CM_CLASE_BASE ? "Expediente digitalizado (escaneo)" : ""
      };
    }
    CM.clases[f.p.clase].n++;
  });
  cmRender();
  $("cm-paso2").classList.remove("hidden");
  $("cm-paso2").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ════════ MODO CONVENIOS DE PAGO ════════
// El nombre del PDF es el número del convenio (CONSECUTIVO del reporte de acuerdos de pago).
const CM_CLASE_CONVENIO = "CONVENIO";
const ESTADOS_CONVENIO = { A: "vigente", C: "cumplido", N: "anulado", E: "en elaboración" };   // B, X, T se ignoran
function cmModo() { return $("cm-modo") ? $("cm-modo").value : "radicado"; }
function cmCambioModo() {
  if (CM.corriendo) return;
  const conv = cmModo() === "convenio";
  $("cm-cartera").classList.toggle("hidden", conv);
  $("cm-ayuda-modo").textContent = conv
    ? "Cada archivo se busca por su número en el reporte de acuerdos de pago (66132.pdf → convenio 66132). Con la cédula o NIT del deudor se encuentra su proceso activo: en Predial para los convenios de Predial y entre los títulos ICA para los de ICA. Si no tiene, va a un expediente propio en Acuerdos Predial o Acuerdos ICA."
    : "Cada archivo se asigna a su proceso por el número del nombre (FP-1212, FP1212, FP01212 o FP'1212 son el mismo); lo que sigue al número se usa como descripción.";
  $("cm-ayuda-2").textContent = conv
    ? "Todos los convenios van como un solo tipo de documento. La descripción en el índice será «Convenio de pago N.º …» y la fecha del documento, la de aprobación del convenio."
    : "Agrupé los archivos por lo que dice el nombre después del número. Elige el tipo documental una sola vez por grupo.";
  $("cm-ayuda-3").textContent = conv
    ? "Los convenios vigentes registran además la novedad «Acuerdo de pago N.º …» en el expediente. Lo que ya esté incorporado se reconoce por su huella y se omite, así que puedes repetir la carga sin duplicar."
    : "En cada expediente se incorpora primero el archivo que solo trae el número y después los demás por fecha. Lo que ya esté incorporado se reconoce por su huella y se omite, así que puedes repetir la carga sin duplicar.";
  CM.filas = []; CM.clases = {}; CM.iniciado = false;
  $("cm-paso2").classList.add("hidden");
  $("cm-resultado").classList.add("hidden");
}
function llaveCedula(s) { return String(s || "").split("-")[0].replace(/\D/g, ""); }
function carteraAcuerdoDe(conv) { return conv && conv.fuente === "ica" ? "acuerdos_ica" : "acuerdos_predial"; }
function cmProcAcuerdos(conv) {
  const k = "AP" + conv.consecutivo;
  const ya = (CM.expAcuerdos || {})[k];
  // Si el expediente AP ya existe se respeta su cartera (también los antiguos de "acuerdos")
  return { cartera: ya ? ya.cartera : carteraAcuerdoDe(conv), radicado: "AP-" + conv.consecutivo, radicado_norm: k,
           contribuyente: conv.nombre_deudor || "", id_contribuyente: conv.cedula_deudor || "",
           manual: true, exp_id: ya ? ya.id : null, estado_expediente: ya ? ya.estado : null };
}
function cmSugerirTipoConvenio() {
  for (const r of [/acuerdo de pago|convenio de pago/, /convenio/, /acuerdo/]) {
    const t = TIPOS.find(x => r.test(cmNorm(x.nombre)));
    if (t) return t.codigo;
  }
  return "";
}

async function cmAnalizarConvenios(archivos) {
  if (!CARTERAS.acuerdos_predial || !CARTERAS.acuerdos_ica) {
    toast("Faltan las carteras Acuerdos Predial y Acuerdos ICA en la base: ejecuta sql_exp_acuerdos_por_tributo.sql y recarga la página (Ctrl+Shift+R).", true);
    return;
  }
  CM.cartera = "predial"; CM.filas = []; CM.clases = {}; CM.iniciado = false; CM.expAcuerdos = {};
  $("cm-resultado").classList.add("hidden");
  progreso(true, "Leyendo nombres", archivos.length + " archivo(s)", 5);
  for (const file of archivos) {
    const f = { uid: Math.random().toString(36).slice(2, 10), file, nombre: file.name, ruta: file.webkitRelativePath || file.name,
                tamano: file.size, mod: file.lastModified || 0, p: null, proc: null, estado: "listo", msg: "" };
    const esPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const m = file.name.replace(/\.pdf$/i, "").match(/^\s*0*(\d{3,10})(?!\d)/);
    if (!esPdf) { f.estado = "descartado"; f.msg = "No es PDF"; }
    else if (file.size === 0) { f.estado = "descartado"; f.msg = "Archivo vacío"; }
    else if (file.size > MAX_BYTES) { f.estado = "descartado"; f.msg = "Supera 50 MB (" + fmtBytes(file.size) + ")"; }
    else if (!m) { f.estado = "descartado"; f.msg = "El nombre no empieza por el número del convenio"; }
    else { f.consec = m[1]; f.p = { clase: CM_CLASE_CONVENIO, resto: "", clave: m[1] }; }
    CM.filas.push(f);
  }

  const nums = [...new Set(CM.filas.filter(f => f.consec).map(f => f.consec))];
  const convs = {};
  const porCed = {};
  try {
    // 1) Convenios en el reporte
    for (let i = 0; i < nums.length; i += 150) {
      progreso(true, "Buscando los convenios en el reporte", (i + 1) + " a " + Math.min(i + 150, nums.length) + " de " + nums.length, 10 + i / Math.max(1, nums.length) * 40);
      const filas = await supaFetch("acuerdos_pago?select=consecutivo,estado,fuente,cedula_deudor,nombre_deudor,fecha_aprobacion" +
                                    "&consecutivo=in.(" + nums.slice(i, i + 150).join(",") + ")") || [];
      filas.forEach(r => { convs[String(r.consecutivo)] = r; });
    }
    // 2) Procesos de esas cédulas: Predial para convenios de Predial, títulos ICA para los de ICA
    const conICA = !!CARTERAS.ica;
    for (const cart of conICA ? ["predial", "ica"] : ["predial"]) {
      const ceds = [...new Set(Object.values(convs).filter(c => (c.fuente === "ica" ? "ica" : "predial") === cart)
                                .map(c => llaveCedula(c.cedula_deudor)).filter(Boolean))];
      for (let i = 0; i < ceds.length; i += 60) {
        progreso(true, "Buscando " + (cart === "ica" ? "títulos ICA" : "procesos de Predial") + " por cédula o NIT",
                 (i + 1) + " a " + Math.min(i + 60, ceds.length) + " de " + ceds.length, 50 + i / Math.max(1, ceds.length) * 40);
        const lote = ceds.slice(i, i + 60);
        const conds = ["id_contribuyente.in.(" + lote.join(",") + ")"]
          .concat(lote.filter(c => c.length >= 9 && /^[89]/.test(c)).map(c => "id_contribuyente.like." + c + "-*"));
        const filas = await supaFetch("v_exp_buscar?select=cartera,radicado,radicado_norm,contribuyente,id_contribuyente,estado_cartera,exp_id,estado_expediente,total_documentos" +
                                      "&cartera=eq." + cart + "&or=" + encodeURIComponent("(" + conds.join(",") + ")")) || [];
        filas.forEach(r => {
          const k = cart + "|" + llaveCedula(r.id_contribuyente);
          porCed[k] = porCed[k] || [];
          if (!porCed[k].some(x => x.radicado === r.radicado)) porCed[k].push(r);
        });
      }
    }
    // 3) Expedientes de acuerdos ya creados (para no duplicar)
    const aps = nums.map(n => "AP" + n);
    for (let i = 0; i < aps.length; i += 150) {
      const filas = await supaFetch("exp_digital?select=id,cartera,radicado_norm,estado&cartera=in.(" + CARTERAS_ACUERDOS.join(",") +
                                    ")&radicado_norm=in.(" + aps.slice(i, i + 150).join(",") + ")") || [];
      filas.forEach(r => { CM.expAcuerdos[r.radicado_norm] = r; });
    }
  } catch (e) {
    progreso(false);
    if (/acuerdos_pago|does not exist|schema cache|404/i.test(e.message)) toast("Primero hay que importar el reporte de acuerdos (archivos acuerdos_pago_*.sql).", true);
    else toast("No se pudo consultar: " + e.message, true);
    return;
  }
  progreso(false);

  // 4) Destino de cada archivo
  CM.filas.filter(f => f.consec).forEach(f => {
    const c = convs[f.consec];
    if (!c) { f.estado = "sinproceso"; f.msg = "El convenio " + f.consec + " no está en el reporte de acuerdos (solo se importaron los elaborados desde 2020)"; return; }
    f.conv = c;
    const est = String(c.estado || "").toUpperCase();
    if (!ESTADOS_CONVENIO[est]) { f.estado = "descartado"; f.msg = "Convenio " + f.consec + " con estado «" + est + "» sin clasificar: se ignora"; return; }
    const info = "Convenio " + f.consec + " · " + ESTADOS_CONVENIO[est] + " · " + nombrePropio(c.nombre_deudor || "");
    const cartBusca = c.fuente === "ica" ? "ica" : "predial";
    if (c.fuente === "ica" && !CARTERAS.ica) {
      f.proc = cmProcAcuerdos(c); f.msg = info + " · convenio de ICA: va a " + (CARTERAS[f.proc.cartera] || f.proc.cartera);
    } else {
      const todos = porCed[cartBusca + "|" + llaveCedula(c.cedula_deudor)] || [];
      const activos = todos.filter(p => !["cancelado", "terminado"].includes(situacionDe(p)));   // "sin iniciar" cuenta como activo
      if (activos.length === 1) { f.proc = activos[0]; f.msg = info; }
      else if (activos.length > 1) {
        f.estado = "ambiguo"; f.cands = activos.sort((a, b) => ordenRadicado(a.radicado, b.radicado));
        f.msg = info + " · " + (cartBusca === "ica" ? "el NIT tiene " + activos.length + " títulos ICA activos" : "la cédula tiene " + activos.length + " procesos activos");
      } else {
        f.proc = cmProcAcuerdos(c);
        f.msg = info + (todos.length ? " · sin " + (cartBusca === "ica" ? "título" : "proceso") + " activo (terminados: " + todos.map(p => radVista(p.radicado)).join(", ") + ")"
                                     : (cartBusca === "ica" ? " · sin título ICA remitido" : " · sin proceso de cobro")) +
                " · va a " + (CARTERAS[f.proc.cartera] || f.proc.cartera);
      }
    }
    if (f.proc && f.proc.estado_expediente === "cerrado") {
      f.estado = "cerrado"; f.msg = info + " · el expediente " + radVista(f.proc.radicado) + " está cerrado";
    }
  });
  const usados = CM.filas.filter(f => f.conv && ["listo", "ambiguo"].includes(f.estado));
  if (usados.length) {
    CM.clases[CM_CLASE_CONVENIO] = { n: usados.length, ejemplo: usados[0].nombre, tipo: cmSugerirTipoConvenio(), etapa: "", origen: "interno", desc: "" };
  }
  cmRender();
  $("cm-paso2").classList.remove("hidden");
  $("cm-paso2").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cmSelectorDudoso(f) {
  if (!f.cands || CM.iniciado || CM.corriendo) return "";
  const ops = ['<option value="">— Elige el destino —</option>']
    .concat(f.cands.map(p => `<option value="${esc(p.radicado)}"${f.eleccion === p.radicado ? " selected" : ""}>${esc(radVista(p.radicado))} · ${esc(p.estado_cartera || "")}</option>`))
    .concat([`<option value="__todos"${f.eleccion === "__todos" ? " selected" : ""}>Todos sus procesos (${f.cands.length})</option>`,
             `<option value="__acuerdos"${f.eleccion === "__acuerdos" ? " selected" : ""}>${esc(CARTERAS[carteraAcuerdoDe(f.conv)] || "Acuerdos")} (AP-${esc(f.consec)})</option>`]);
  return `<select class="sel cm-eleccion" onchange="cmElegir('${f.uid}', this.value)" aria-label="Destino del convenio">${ops.join("")}</select>`;
}
function cmAplicarEleccion(f, val) {
  f.todos = false; f.eleccion = val;
  if (!val) { f.estado = "ambiguo"; f.proc = null; return; }
  f.estado = "listo";
  if (val === "__todos") { f.proc = f.cands[0]; f.todos = true; }
  else if (val === "__acuerdos") f.proc = cmProcAcuerdos(f.conv);
  else f.proc = f.cands.find(p => p.radicado === val) || null;
  if (!f.proc) f.estado = "ambiguo";
}
function cmElegir(uid, val) {
  const f = CM.filas.find(x => x.uid === uid);
  if (!f || !f.cands) return;
  cmAplicarEleccion(f, val);
  cmRender();
}
function cmElegirDudosos(val) {
  CM.filas.filter(f => f.cands && f.estado === "ambiguo").forEach(f => cmAplicarEleccion(f, val));
  cmRender();
}
// "Todos sus procesos": una fila por cada proceso, con el mismo archivo
function cmExpandirTodos() {
  const nuevos = [];
  CM.filas.forEach(f => {
    if (f.estado === "listo" && f.todos && f.cands) {
      f.cands.slice(1).forEach(p => nuevos.push(Object.assign({}, f, {
        uid: Math.random().toString(36).slice(2, 10), proc: p, todos: false, cands: null, eleccion: p.radicado })));
      f.proc = f.cands[0]; f.todos = false; f.cands = null;
    }
  });
  CM.filas.push(...nuevos);
}

// Novedad "Acuerdo de pago N.º …" para convenios vigentes (estado A), sin repetir
async function cmNovedadesConvenio(g, expId) {
  if (!NOV_DISPONIBLE || !expId) return;
  const vistos = {};
  const vigentes = g.archivos.filter(f => f.conv && String(f.conv.estado).toUpperCase() === "A" &&
    ["ok", "omitido"].includes(f.estado) && !vistos[f.conv.consecutivo] && (vistos[f.conv.consecutivo] = true));
  if (!vigentes.length) return;
  try {
    const hist = await supaFetch("exp_novedades?select=tipo,numero&expediente_id=eq." + Number(expId) + "&order=registrado_en.desc,id.desc") || [];
    for (const f of vigentes) {
      const num = String(f.conv.consecutivo);
      if (hist.some(n => n.tipo === "acuerdo_pago" && String(n.numero) === num)) { f.msg += " · la novedad del acuerdo ya estaba"; continue; }
      if (hist[0] && hist[0].tipo === "terminacion") { f.msg += " · no registré el acuerdo: el proceso tiene una terminación registrada"; continue; }
      await supaFetch("exp_novedades", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ expediente_id: Number(expId), tipo: "acuerdo_pago", numero: num,
          fecha: f.conv.fecha_aprobacion ? String(f.conv.fecha_aprobacion).slice(0, 10) : null,
          observacion: "Registrado por la carga masiva de convenios (reporte de acuerdos de pago)" })
      });
      hist.unshift({ tipo: "acuerdo_pago", numero: num });
      f.novedad = true;
      f.msg += " · novedad «Acuerdo de pago N.º " + num + "» registrada";
    }
  } catch (e) {
    if (/exp_novedades|does not exist|schema cache|404/i.test(e.message)) NOV_DISPONIBLE = false;
    vigentes.forEach(f => { if (!f.novedad) f.msg += " · no se pudo registrar la novedad: " + e.message; });
  }
}

function cmDescripcion(f) {
  if (f.conv) {
    const est = String(f.conv.estado || "").toUpperCase();
    return "Convenio de pago N.º " + f.conv.consecutivo + (est === "C" ? " (cumplido)" : est === "N" ? " (anulado)" : "");
  }
  const cl = CM.clases[f.p.clase];
  if (f.p.clase === CM_CLASE_BASE) return (cl && cl.desc) || "Expediente digitalizado (escaneo)";
  return f.p.resto || f.p.clase;
}

const CM_ETIQUETAS = {
  listo: "Listo", sinproceso: "Sin proceso", ambiguo: "Ambiguo", cerrado: "Expediente cerrado", descartado: "Descartado",
  ok: "Incorporado", omitido: "Omitido", error: "Error", subiendo: "En curso", pendiente: "Pendiente"
};

function cmResumen() {
  const listos = CM.filas.filter(f => f.estado === "listo");
  const destinos = listos.flatMap(f => f.todos && f.cands ? f.cands : [f.proc]);
  const clave = p => (p.cartera || CM.cartera) + "|" + p.radicado;
  const procesos = new Set(destinos.map(clave));
  const crear = new Set(destinos.filter(p => !p.exp_id).map(clave));
  const cuenta = e => CM.filas.filter(f => f.estado === e).length;
  return { total: CM.filas.length, listos: listos.length, procesos: procesos.size, crear: crear.size,
           sinproceso: cuenta("sinproceso") + cuenta("ambiguo"), cerrados: cuenta("cerrado"), descartados: cuenta("descartado") };
}

function cmRender() {
  const r = cmResumen();
  $("cm-kpis").innerHTML = [
    [r.total, "archivos"], [r.listos, "listos para cargar"], [r.procesos, "procesos"],
    [r.crear, "expedientes por crear"], [r.sinproceso, "sin proceso"], [r.cerrados + r.descartados, "descartados o cerrados"]
  ].map(k => `<div class="cm-kpi"><div class="kpi-n">${k[0]}</div><div class="kpi-l">${k[1]}</div></div>`).join("");

  // Clases de archivo → tipo documental
  const claves = Object.keys(CM.clases).sort((a, b) => (a === CM_CLASE_BASE ? -1 : b === CM_CLASE_BASE ? 1 : CM.clases[b].n - CM.clases[a].n));
  const bloqueado = CM.corriendo || CM.iniciado;
  $("cm-clases").innerHTML = claves.length ? claves.map(k => {
    const c = CM.clases[k];
    const kid = encodeURIComponent(k);
    return `<tr>
      <td><strong>${k === CM_CLASE_BASE ? "Solo el número" : k === CM_CLASE_CONVENIO ? "Convenios de pago" : esc(k)}</strong>
        <div class="small muted">${c.n} archivo${c.n === 1 ? "" : "s"} · p. ej. ${esc(c.ejemplo)}</div>
        ${k === CM_CLASE_BASE ? `<input class="inp cm-desc" maxlength="200" value="${esc(c.desc)}" ${bloqueado ? "disabled" : ""}
            oninput="cmEditarClase('${kid}','desc',this.value)" aria-label="Descripción en el índice">` : ""}</td>
      <td><select class="sel" ${bloqueado ? "disabled" : ""} onchange="cmEditarClase('${kid}','tipo',this.value)">${opcionesTipos(c.tipo)}</select></td>
      <td><select class="sel" ${bloqueado ? "disabled" : ""} onchange="cmEditarClase('${kid}','etapa',this.value)">${opcionesEtapas(c.tipo, c.etapa)}</select></td>
      <td><select class="sel" ${bloqueado ? "disabled" : ""} onchange="cmEditarClase('${kid}','origen',this.value)">
        <option value="interno"${c.origen === "interno" ? " selected" : ""}>Dirección</option>
        <option value="externo"${c.origen === "externo" ? " selected" : ""}>Tercero</option></select></td>
    </tr>`;
  }).join("") : `<tr><td colspan="4" class="empty">Ningún archivo encontró su proceso.</td></tr>`;

  cmRenderFilas();
  const dudosos = CM.filas.filter(f => f.cands && f.estado === "ambiguo").length;
  $("cm-dudosos").classList.toggle("hidden", !dudosos || CM.iniciado);
  $("cm-dudosos-n").textContent = dudosos + " convenio" + (dudosos === 1 ? "" : "s") + " con varios procesos activos:";
  const btn = $("cm-btn-iniciar");
  btn.disabled = CM.corriendo || !r.listos;
  btn.textContent = r.listos ? "Cargar " + r.listos + " archivo" + (r.listos === 1 ? "" : "s") + " en " + r.procesos + " expediente" + (r.procesos === 1 ? "" : "s") : "Nada por cargar";
}

function cmRenderFilas() {
  const filtro = $("cm-filtro").value;
  const filas = CM.filas.filter(f => {
    if (!filtro) return true;
    if (filtro === "problemas") return ["sinproceso", "ambiguo", "cerrado", "descartado", "error"].includes(f.estado);
    return f.estado === filtro;
  }).sort((a, b) => (a.proc ? a.proc.radicado : "~").localeCompare(b.proc ? b.proc.radicado : "~", "es", { numeric: true }) || a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
  const vista = filas.slice(0, CM_MAX_FILAS_VISTA);
  $("cm-filas").innerHTML = vista.length ? vista.map(f => `<tr>
    <td class="small" style="word-break:break-all">${esc(f.nombre)}<div class="muted">${fmtBytes(f.tamano)}</div></td>
    <td class="nowrap">${f.proc ? `<strong>${esc(radVista(f.proc.radicado))}</strong>${f.todos && f.cands ? `<div class="small muted">y ${f.cands.length - 1} más</div>` : ""}${f.proc.exp_id ? "" : '<div class="small muted">se creará</div>'}` : "—"}</td>
    <td class="small">${f.proc ? esc(f.proc.contribuyente || "—") : "—"}</td>
    <td class="small">${f.p && (f.proc || f.conv) && f.estado !== "descartado" ? esc(cmDescripcion(f)) : "—"}</td>
    <td><span class="chip cm-st-${f.estado}">${esc(CM_ETIQUETAS[f.estado] || f.estado)}</span>${f.msg ? `<div class="small muted" style="margin-top:3px">${esc(f.msg)}</div>` : ""}${cmSelectorDudoso(f)}</td>
  </tr>`).join("") : `<tr><td colspan="5" class="empty">Ningún archivo con ese filtro.</td></tr>`;
  $("cm-filas-info").textContent = filas.length > CM_MAX_FILAS_VISTA
    ? "Mostrando " + CM_MAX_FILAS_VISTA + " de " + filas.length + ". Descarga el CSV para ver todos." : filas.length + " archivo(s).";
}

function cmEditarClase(kid, campo, valor) {
  const c = CM.clases[decodeURIComponent(kid)];
  if (!c) return;
  c[campo] = valor;
  if (campo === "tipo" || campo === "desc") cmRender();
}

function cmCSV() {
  if (!CM.filas.length) return;
  descargarCSV("Carga_masiva_" + (CM.cartera || "") + "_" + fechaArchivo() + ".csv", [
    { t: "Archivo", v: "ruta" },
    { t: "Tamaño (bytes)", v: "tamano" },
    { t: "Proceso", v: f => f.proc ? radVista(f.proc.radicado) : "" },
    { t: "Contribuyente", v: f => f.proc ? f.proc.contribuyente : "" },
    { t: "Cédula/NIT", v: f => f.proc ? f.proc.id_contribuyente : "" },
    { t: "Convenio", v: f => f.conv ? f.conv.consecutivo : "" },
    { t: "Estado del convenio", v: f => f.conv ? (ESTADOS_CONVENIO[String(f.conv.estado).toUpperCase()] || f.conv.estado) : "" },
    { t: "Cartera destino", v: f => f.proc ? (CARTERAS[f.proc.cartera || CM.cartera] || f.proc.cartera || CM.cartera) : "" },
    { t: "Clase", v: f => f.p ? (f.p.clase === CM_CLASE_CONVENIO ? "Convenio de pago" : (f.p.clase || "Solo el número")) : "" },
    { t: "Descripción", v: f => f.p && f.proc ? cmDescripcion(f) : "" },
    { t: "Resultado", v: f => CM_ETIQUETAS[f.estado] || f.estado },
    { t: "Detalle", v: "msg" },
    { t: "N.º en el índice", v: f => f.consecutivo || "" },
    { t: "Folios", v: f => f.folios || "" }
  ], CM.filas);
}

async function cmIniciar() {
  if (CM.corriendo || !sbAuth) return;
  cmExpandirTodos();
  const listos = CM.filas.filter(f => f.estado === "listo");
  if (!listos.length) return;
  const clasesUsadas = [...new Set(listos.map(f => f.p.clase))];
  const sinTipo = clasesUsadas.filter(k => !CM.clases[k].tipo);
  if (sinTipo.length) {
    toast("Falta el tipo documental para: " + sinTipo.map(k => k === CM_CLASE_BASE ? "Solo el número" : k).join(", "), true);
    return;
  }
  const base = CM.clases[CM_CLASE_BASE];
  if (base && String(base.desc || "").trim().length < 3) { toast("Escribe la descripción para los archivos que solo traen el número.", true); return; }
  const crearExp = $("cm-crear").checked;

  // Agrupar por proceso; dentro de cada uno: primero el escaneo base, luego por fecha del archivo y nombre
  const grupos = {};
  listos.forEach(f => {
    const k = (f.proc.cartera || CM.cartera) + "|" + f.proc.radicado;
    (grupos[k] = grupos[k] || { proc: f.proc, archivos: [] }).archivos.push(f);
  });
  const cola = Object.values(grupos);
  cola.forEach(g => g.archivos.sort((a, b) =>
    (a.p.clase === CM_CLASE_BASE ? 0 : 1) - (b.p.clase === CM_CLASE_BASE ? 0 : 1) ||
    (a.mod - b.mod) || a.nombre.localeCompare(b.nombre, "es", { numeric: true })));
  const r = cmResumen();
  if (!confirm("Se cargarán " + listos.length + " archivo(s) en " + cola.length + " expediente(s)" +
      (crearExp && r.crear ? ", creando " + r.crear + " expediente(s) nuevo(s)" : "") +
      ".\n\nLos documentos quedan incorporados con su huella y foliación: después solo se pueden anular. " +
      "Lo que ya esté incorporado se omite automáticamente.\n\n¿Continuar?")) return;

  CM.corriendo = true; CM.detener = false; CM.iniciado = true;
  CM.shaGlobal = {};
  CM.t0 = Date.now();
  listos.forEach(f => { f.estado = "pendiente"; f.msg = ""; });
  $("cm-progreso").classList.remove("hidden");
  $("cm-btn-detener").disabled = false;
  cmRender(); cmProgreso();
  const total = cola.length;

  const hilo = async () => {
    let g;
    while ((g = cola.shift())) {
      await cmProcesarGrupo(g, crearExp);
      cmProgreso((total - cola.length) + " de " + total + " expedientes");
    }
  };
  await Promise.all(Array.from({ length: Math.min(CM_HILOS, cola.length) }, hilo));

  CM.corriendo = false;
  $("cm-btn-detener").disabled = true;
  CM.filas.filter(f => f.estado === "pendiente").forEach(f => { f.msg = "No se procesó (carga detenida)"; });
  cmRender(); cmProgreso();
  cmMostrarResultado();
  cargarRecientes();
}

async function cmProcesarGrupo(g, crearExp) {
  const marcar = (estado, msg) => g.archivos.forEach(f => { if (f.estado === "pendiente") { f.estado = estado; f.msg = msg; } });
  if (CM.detener) return;
  let expId = g.proc.exp_id;
  try {
    if (!expId) {
      if (!crearExp) { marcar("omitido", "El proceso no tiene expediente digital y elegiste no crearlo"); return; }
      const params = { p_cartera: g.proc.cartera || CM.cartera, p_radicado: g.proc.radicado };
      if (g.proc.manual) Object.assign(params, { p_manual: true, p_id_contribuyente: g.proc.id_contribuyente || "",
                                                 p_contribuyente: g.proc.contribuyente || "" });
      expId = await rpc("exp_crear_expediente", params);
      if (!expId) throw new Error("La base de datos no devolvió el expediente creado");
      g.proc.exp_id = expId;
    }
  } catch (e) {
    marcar("error", "No se pudo crear el expediente: " + e.message);
    return;
  }
  let shas;
  try {
    const idx = await supaFetch("v_exp_indice?select=sha256,anulado,consecutivo&expediente_id=eq." + Number(expId)) || [];
    shas = {};
    idx.filter(d => !d.anulado).forEach(d => { shas[d.sha256] = d.consecutivo; });
  } catch (e) {
    marcar("error", "No se pudo leer el índice del expediente: " + e.message);
    return;
  }
  const radNorm = g.proc.radicado_norm || normRad(g.proc.radicado);
  for (const f of g.archivos) {
    if (CM.detener) return;
    f.estado = "subiendo"; f.msg = "Leyendo…"; cmProgreso();
    try {
      const buf = await f.file.arrayBuffer();
      const sha = await sha256Hex(buf);
      if (shas[sha]) { f.estado = "omitido"; f.msg = "Ya estaba incorporado como N.º " + shas[sha]; cmProgreso(); continue; }
      let paginas;
      try { paginas = await contarPaginas(buf); }
      catch (e) { throw new Error("PDF dañado o protegido con contraseña; no se pudo leer."); }
      const otro = CM.shaGlobal[sha];
      f.msg = "Subiendo…"; cmProgreso();
      const d = await incorporarDocumento({
        expedienteId: Number(expId), cartera: g.proc.cartera || CM.cartera, radicadoNorm: radNorm,
        file: f.file, nombre: f.nombre, tamano: f.tamano, sha, paginas,
        tipo: CM.clases[f.p.clase].tipo, etapa: CM.clases[f.p.clase].etapa,
        descripcion: cmDescripcion(f),
        fecha: f.conv && f.conv.fecha_aprobacion ? String(f.conv.fecha_aprobacion).slice(0, 10) : null,
        origen: CM.clases[f.p.clase].origen,
        obs: "Carga masiva desde " + (f.ruta || f.nombre), canal: CANAL_MASIVO
      });
      shas[sha] = d ? d.consecutivo : "?";
      CM.shaGlobal[sha] = g.proc.radicado;
      f.estado = "ok";
      f.consecutivo = d ? d.consecutivo : "";
      f.folios = d ? d.folio_inicial + " a " + d.folio_final : "";
      f.msg = (d ? "N.º " + d.consecutivo + " · folios " + d.folio_inicial + " a " + d.folio_final : "Incorporado") +
              (otro && otro !== g.proc.radicado ? " · el mismo archivo también se cargó en " + otro : "");
    } catch (e) {
      f.estado = "error"; f.msg = e.message;
    }
    cmProgreso();
  }
  if (!CM.detener && g.archivos.some(f => f.conv)) await cmNovedadesConvenio(g, expId);
}

function cmProgreso(sub) {
  const enJuego = CM.filas.filter(f => ["pendiente", "subiendo", "ok", "omitido", "error"].includes(f.estado) && f.p && f.proc);
  const hechos = enJuego.filter(f => ["ok", "omitido", "error"].includes(f.estado));
  const ok = hechos.filter(f => f.estado === "ok").length;
  const om = hechos.filter(f => f.estado === "omitido").length;
  const er = hechos.filter(f => f.estado === "error").length;
  const pct = enJuego.length ? hechos.length / enJuego.length * 100 : 0;
  $("cm-prog-fill").style.width = pct.toFixed(1) + "%";
  let resto = "";
  if (CM.corriendo && hechos.length > 3) {
    const seg = (Date.now() - CM.t0) / 1000 / hechos.length * (enJuego.length - hechos.length);
    resto = " · faltan unos " + (seg < 90 ? Math.max(1, Math.round(seg)) + " s" : Math.round(seg / 60) + " min");
  }
  $("cm-prog-t").textContent = CM.corriendo
    ? (CM.detener ? "Deteniendo al terminar el archivo en curso…" : "Cargando " + hechos.length + " de " + enJuego.length + resto)
    : "Carga terminada: " + hechos.length + " de " + enJuego.length + " archivos procesados";
  $("cm-prog-s").textContent = ok + " incorporados · " + om + " omitidos (ya estaban) · " + er + " con error" + (sub ? " · " + sub : "");
  clearTimeout(cmProgreso._t);
  cmProgreso._t = setTimeout(cmRenderFilas, 400);
}

function cmDetener() {
  if (!CM.corriendo) return;
  CM.detener = true;
  $("cm-btn-detener").disabled = true;
  cmProgreso();
}

function cmMostrarResultado() {
  const ok = CM.filas.filter(f => f.estado === "ok").length;
  const er = CM.filas.filter(f => f.estado === "error").length;
  const pend = CM.filas.filter(f => f.estado === "pendiente").length;
  const box = $("cm-resultado");
  box.classList.remove("hidden");
  box.className = "aviso " + (er || pend ? "aviso-warn" : "aviso-ok");
  box.textContent = ok + " documento(s) incorporado(s)." +
    (er ? " " + er + " con error: filtra por «Con problemas» y vuelve a cargar la carpeta para reintentarlos; lo ya incorporado se omite solo." : "") +
    (pend ? " " + pend + " sin procesar porque detuviste la carga." : "") +
    " Descarga el reporte CSV para el registro.";
  toast(er ? "Carga terminada con " + er + " error(es)." : "Carga terminada.", !!er);
}

// ════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ════════════════════════════════════════════════════════════
let ST = null;

async function traerTodo(path, orden, alAvanzar) {
  const out = [], paso = 1000;
  for (let off = 0; ; off += paso) {
    const lote = await supaFetch(path + "&order=" + orden + "&limit=" + paso + "&offset=" + off) || [];
    out.push(...lote);
    if (alAvanzar) alAvanzar(out.length);
    if (lote.length < paso) break;
  }
  return out;
}
async function contarFilas(path) {
  const headers = await getAuthHeaders({ Prefer: "count=exact", Range: "0-0" });
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers });
  if (!res.ok && res.status !== 206) {
    let msg = "HTTP " + res.status;
    try { const j = await res.json(); if (j && j.message) msg = j.message; } catch (e) {}
    if (/statement timeout|canceling statement/i.test(msg)) msg = "La consulta tardó demasiado y el servidor la canceló";
    throw new Error(msg);
  }
  const cr = res.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function cargarEstadisticas(forzar) {
  if (ST && !forzar) { renderEstadisticas(); return; }
  $("st-cont").innerHTML = `<div class="card empty">Calculando estadísticas…</div>`;
  try {
    const [exps, docs, novs] = await Promise.all([
      traerTodo("v_exp_digital?select=*", "id.asc"),
      traerTodo("v_exp_indice?select=id,expediente_id,incorporado_por_email,fecha_incorporacion,paginas,anulado,tipo_nombre", "id.asc"),
      NOV_DISPONIBLE ? traerTodo("exp_novedades?select=*", "registrado_en.desc,id.desc").catch(() => []) : Promise.resolve([])
    ]);
    const cobertura = {};
    await Promise.all(Object.keys(CARTERAS).map(async c => {
      try { cobertura[c] = await contarFilas("v_exp_buscar?select=radicado&cartera=eq." + encodeURIComponent(c)); }
      catch (e) { cobertura[c] = null; }
    }));
    NOV = {}; const vigente = {};
    novs.forEach(n => { if (!NOV[n.expediente_id]) { NOV[n.expediente_id] = n; vigente[n.expediente_id] = n.id; } });
    ST = { exps, docs, novs, vigente, cobertura, en: new Date() };
    renderEstadisticas();
  } catch (e) {
    $("st-cont").innerHTML = `<div class="card empty">No se pudieron calcular: ${esc(e.message)}</div>`;
  }
}

function stBarra(n, total) {
  const pct = total ? n / total * 100 : 0;
  return `<div class="st-track" aria-hidden="true"><div class="st-fill" style="width:${pct.toFixed(1)}%"></div></div>`;
}
function stPct(n, total) { return total ? (n / total * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " %" : "—"; }
function stNum(n) { return n === null || n === undefined ? "—" : Number(n).toLocaleString("es-CO"); }


function renderEstadisticas() {
  const { cobertura } = ST;
  const exps = ST.exps.filter(e => !esCarteraAcuerdos(e.cartera));
  const idsProc = new Set(exps.map(e => e.id));
  const docs = ST.docs.filter(d => idsProc.has(d.expediente_id));
  const vig = docs.filter(d => !d.anulado);
  const folios = vig.reduce((a, d) => a + (Number(d.paginas) || 0), 0);
  const cerrados = exps.filter(e => e.estado === "cerrado");

  // Cobertura por cartera
  const porCartera = {};
  exps.forEach(e => { porCartera[e.cartera] = (porCartera[e.cartera] || 0) + 1; });
  const filasCob = Object.keys(CARTERAS).filter(c => !esCarteraAcuerdos(c)).map(c => ({ c, total: cobertura[c], con: porCartera[c] || 0 }))
    .filter(x => x.con || x.total);

  // Situación de los procesos con expediente
  const sit = {};
  exps.forEach(e => { const s = situacionDe(e); sit[s] = (sit[s] || 0) + 1; });

  // Terminaciones vigentes por causal y acuerdos de pago vigentes
  const causales = {};
  let terminados = 0, acuerdos = 0;
  exps.forEach(e => {
    const n = NOV[e.id];
    if (!n) return;
    if (n.tipo === "terminacion") { terminados++; causales[n.causal || "Sin causal"] = (causales[n.causal || "Sin causal"] || 0) + 1; }
    if (n.tipo === "acuerdo_pago") acuerdos++;
  });

  // Incorporación por mes (últimos 12)
  const meses = [];
  const hoy = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({ k: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
                 t: d.toLocaleDateString("es-CO", { month: "short", year: "numeric" }), docs: 0, folios: 0 });
  }
  const idxMes = {}; meses.forEach((m, i) => { idxMes[m.k] = i; });
  vig.forEach(d => {
    const k = String(d.fecha_incorporacion || "").slice(0, 7);
    if (k in idxMes) { meses[idxMes[k]].docs++; meses[idxMes[k]].folios += Number(d.paginas) || 0; }
  });
  const maxMes = Math.max(1, ...meses.map(m => m.docs));

  // Por funcionario
  const func = {};
  vig.forEach(d => {
    const u = d.incorporado_por_email || "Sin usuario";
    const f = func[u] = func[u] || { usuario: u, docs: 0, folios: 0, exps: new Set(), ultimo: "" };
    f.docs++; f.folios += Number(d.paginas) || 0; f.exps.add(d.expediente_id);
    if (String(d.fecha_incorporacion) > f.ultimo) f.ultimo = String(d.fecha_incorporacion);
  });
  const funcs = Object.values(func).sort((a, b) => b.docs - a.docs);
  ST.funcs = funcs;

  // Tipos documentales
  const tipos = {};
  vig.forEach(d => { const t = d.tipo_nombre || "Sin tipo"; tipos[t] = (tipos[t] || 0) + 1; });
  const tiposOrd = Object.entries(tipos).sort((a, b) => b[1] - a[1]);

  const ordenSit = ["sin_iniciar", "activo", "acuerdo", "cancelado", "terminado", "sin"];
  $("st-cont").innerHTML = `
    <div class="st-kpis">
      <div class="card st-kpi"><div class="kpi-n">${stNum(exps.length)}</div><div class="kpi-l">expedientes digitales</div></div>
      <div class="card st-kpi"><div class="kpi-n">${stNum(vig.length)}</div><div class="kpi-l">documentos vigentes</div></div>
      <div class="card st-kpi"><div class="kpi-n">${stNum(folios)}</div><div class="kpi-l">folios</div></div>
      <div class="card st-kpi"><div class="kpi-n">${stNum(cerrados.length)}</div><div class="kpi-l">expedientes cerrados</div></div>
    </div>

    <div class="st-grid">
      <div class="card">
        <h3 class="st-h">Cobertura por cartera</h3>
        <p class="small muted st-p">Procesos de cada cartera que ya tienen carpeta digital.</p>
        <table class="tbl st-tbl"><thead><tr><th>Cartera</th><th class="num">Procesos</th><th class="num">Con expediente</th><th class="num">%</th><th></th></tr></thead><tbody>
        ${filasCob.map(x => `<tr><td>${chipCartera(x.c)}</td><td class="num">${stNum(x.total)}</td><td class="num">${stNum(x.con)}</td>
          <td class="num nowrap">${x.total ? stPct(x.con, x.total) : "—"}</td><td class="st-bar-td">${x.total ? stBarra(x.con, x.total) : ""}</td></tr>`).join("") ||
          `<tr><td colspan="5" class="empty">Sin datos.</td></tr>`}
        </tbody></table>
      </div>

      <div class="card">
        <h3 class="st-h">Situación de los procesos</h3>
        <p class="small muted st-p">Según el estado en cartera de los procesos con expediente digital.</p>
        <table class="tbl st-tbl"><tbody>
        ${ordenSit.filter(s => sit[s]).map(s => `<tr><td><span class="chip chip-sit-${s}">${SITUACIONES[s]}</span></td>
          <td class="num">${stNum(sit[s])}</td><td class="num nowrap">${stPct(sit[s], exps.length)}</td><td class="st-bar-td">${stBarra(sit[s], exps.length)}</td></tr>`).join("") ||
          `<tr><td class="empty">Sin datos.</td></tr>`}
        </tbody></table>
      </div>

      <div class="card">
        <h3 class="st-h">Terminaciones por causal</h3>
        <p class="small muted st-p">${stNum(terminados)} proceso(s) terminado(s) · ${stNum(acuerdos)} acuerdo(s) de pago vigente(s), según las novedades registradas.</p>
        <table class="tbl st-tbl"><tbody>
        ${Object.entries(causales).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<tr><td>${esc(c)}${causalEsPago(c) ? ' <span class="chip chip-sit-cancelado">Cancelado</span>' : ""}</td>
          <td class="num">${stNum(n)}</td><td class="num nowrap">${stPct(n, terminados)}</td><td class="st-bar-td">${stBarra(n, terminados)}</td></tr>`).join("") ||
          `<tr><td class="empty">${NOV_DISPONIBLE ? "Ninguna terminación registrada." : "Falta crear la tabla de novedades (sql_exp_novedades.sql)."}</td></tr>`}
        </tbody></table>
      </div>

      <div class="card">
        <h3 class="st-h">Tipos documentales</h3>
        <p class="small muted st-p">Documentos vigentes por tipo.</p>
        <table class="tbl st-tbl"><tbody>
        ${tiposOrd.slice(0, 10).map(([t, n]) => `<tr><td>${esc(t)}</td><td class="num">${stNum(n)}</td>
          <td class="num nowrap">${stPct(n, vig.length)}</td><td class="st-bar-td">${stBarra(n, vig.length)}</td></tr>`).join("") ||
          `<tr><td class="empty">Sin documentos.</td></tr>`}
        </tbody></table>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3 class="st-h">Documentos incorporados por mes</h3>
      <div class="st-meses">
        ${meses.map(m => `<div class="st-mes" title="${m.docs} documentos · ${m.folios} folios">
          <div class="st-mes-n">${m.docs || ""}</div>
          <div class="st-mes-col"><div class="st-mes-fill" style="height:${(m.docs / maxMes * 100).toFixed(1)}%"></div></div>
          <div class="st-mes-t">${esc(m.t)}</div></div>`).join("")}
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="st-h-row"><h3 class="st-h">Por funcionario</h3>
        <button class="btn btn-sm" onclick="stCSVFuncionarios()">⬇ CSV</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Funcionario</th><th class="num">Documentos</th><th class="num">Folios</th>
        <th class="num">Expedientes</th><th>Última incorporación</th></tr></thead><tbody>
        ${funcs.map(f => `<tr><td>${esc(f.usuario)}</td><td class="num">${stNum(f.docs)}</td><td class="num">${stNum(f.folios)}</td>
          <td class="num">${stNum(f.exps.size)}</td><td class="small nowrap">${fmtFechaHora(f.ultimo)}</td></tr>`).join("") ||
          `<tr><td colspan="5" class="empty">Sin incorporaciones.</td></tr>`}
      </tbody></table></div>
    </div>
    <p class="small muted" style="margin-top:12px">Datos a ${fmtFechaHora(ST.en)}.</p>`;
}

function stCSVExpedientes() {
  if (!ST) { toast("Abre primero las estadísticas.", true); return; }
  descargarCSV("Expedientes_digitales_" + fechaArchivo() + ".csv", [
    { t: "Cartera", v: e => CARTERAS[e.cartera] || e.cartera },
    { t: "Radicado", v: e => radVista(e.radicado) },
    { t: "Radicado en cartera", v: "radicado" },
    { t: "Contribuyente", v: "contribuyente" },
    { t: "Cédula/NIT", v: "id_contribuyente" },
    { t: "Estado en cartera", v: "estado_cartera" },
    { t: "Situación", v: e => SITUACIONES[situacionDe(e)] },
    { t: "Causal de terminación", v: e => NOV[e.id] && NOV[e.id].tipo === "terminacion" ? NOV[e.id].causal : "" },
    { t: "N.º acuerdo de pago", v: e => NOV[e.id] && NOV[e.id].tipo === "acuerdo_pago" ? NOV[e.id].numero : "" },
    { t: "Valor", v: "valor_total" },
    { t: "Expediente", v: "estado" },
    { t: "Documentos", v: "total_documentos" },
    { t: "Folios", v: "total_folios" },
    { t: "Origen", v: e => e.origen === "manual" ? "Creado manualmente" : "Cartera" },
    { t: "Creado por", v: "creado_por_email" },
    { t: "Creado", v: e => fmtFechaHora(e.creado_en) },
    { t: "Última actualización", v: e => fmtFechaHora(e.actualizado_en) }
  ], ST.exps.slice().sort((a, b) => String(a.cartera).localeCompare(String(b.cartera)) || ordenRadicado(a.radicado, b.radicado)));
}
function stCSVDocumentos() {
  if (!ST) { toast("Abre primero las estadísticas.", true); return; }
  const rad = {}; ST.exps.forEach(e => { rad[e.id] = e; });
  descargarCSV("Documentos_expedientes_" + fechaArchivo() + ".csv", [
    { t: "Cartera", v: d => rad[d.expediente_id] ? (CARTERAS[rad[d.expediente_id].cartera] || rad[d.expediente_id].cartera) : "" },
    { t: "Radicado", v: d => rad[d.expediente_id] ? rad[d.expediente_id].radicado : d.expediente_id },
    { t: "Tipo documental", v: "tipo_nombre" },
    { t: "Páginas", v: "paginas" },
    { t: "Incorporado", v: d => fmtFechaHora(d.fecha_incorporacion) },
    { t: "Incorporado por", v: "incorporado_por_email" },
    { t: "Anulado", v: d => d.anulado ? "Sí" : "No" }
  ], ST.docs);
}
function stCSVFuncionarios() {
  if (!ST || !ST.funcs) return;
  descargarCSV("Incorporacion_por_funcionario_" + fechaArchivo() + ".csv", [
    { t: "Funcionario", v: "usuario" },
    { t: "Documentos", v: "docs" },
    { t: "Folios", v: "folios" },
    { t: "Expedientes", v: f => f.exps.size },
    { t: "Última incorporación", v: f => fmtFechaHora(f.ultimo) }
  ], ST.funcs);
}
function rcCSV() {
  // Resultados de la búsqueda actual
  if (!RESULTADOS.length) { toast("Haz primero una búsqueda.", true); return; }
  descargarCSV("Busqueda_expedientes_" + fechaArchivo() + ".csv", [
    { t: "Cartera", v: f => CARTERAS[f.cartera] || f.cartera },
    { t: "Radicado", v: "radicado" },
    { t: "Contribuyente", v: "contribuyente" },
    { t: "Cédula/NIT", v: "id_contribuyente" },
    { t: "Estado en cartera", v: "estado_cartera" },
    { t: "Situación", v: f => SITUACIONES[situacionDe(f)] },
    { t: "Valor", v: "valor_total" },
    { t: "Expediente digital", v: f => f.exp_id ? f.estado_expediente : "Sin carpeta" },
    { t: "Documentos", v: "total_documentos" },
    { t: "Folios", v: "total_folios" }
  ], RESULTADOS);
}

// ════════════════════════════════════════════════════════════
// NOVEDADES DEL PROCESO — terminación, acuerdo de pago, incumplimiento
// Tabla exp_novedades (historial: solo se inserta). Requiere sql_exp_novedades.sql
// ════════════════════════════════════════════════════════════
const CAUSALES_TERMINACION = [
  { v: "Pago total de la obligación", pago: true },
  { v: "Prescripción de la acción de cobro (art. 817 E.T.)" },
  { v: "Remisión de la obligación (art. 820 E.T.)" },
  { v: "Excepciones probadas (art. 833 E.T.)" },
  { v: "Revocatoria o nulidad del título ejecutivo" },
  { v: "Depuración de cartera (saneamiento contable)" },
  { v: "Otra", otra: true }
];
const TIPOS_NOVEDAD = { terminacion: "Terminación", acuerdo_pago: "Acuerdo de pago", acuerdo_incumplido: "Acuerdo incumplido" };
let NOV_HIST = [];           // historial del expediente abierto
let NOV_DISPONIBLE = true;   // false si la tabla aún no existe en la BD

function causalEsPago(c) { return /^pago total/i.test(String(c || "")); }
function textoNovedad(n) {
  if (!n) return "";
  let t = TIPOS_NOVEDAD[n.tipo] || n.tipo;
  if (n.tipo === "terminacion") t += " por " + (causalEsPago(n.causal) ? "pago total (cancelado)" : String(n.causal || "").toLowerCase());
  if (n.numero) t += (n.tipo === "terminacion" ? " · acto N.º " : " N.º ") + n.numero;
  if (n.fecha) t += " · " + fmtFecha(n.fecha);
  return t;
}

// Trae la última novedad de cada expediente; con historial=true guarda todo el del expediente abierto
async function cargarNovedades(ids, historial) {
  const lista = [...new Set((ids || []).filter(x => x !== null && x !== undefined))];
  if (!lista.length || !NOV_DISPONIBLE) return;
  try {
    for (let i = 0; i < lista.length; i += 150) {
      const lote = lista.slice(i, i + 150);
      const filas = await supaFetch("exp_novedades?select=*&expediente_id=in.(" + lote.map(Number).join(",") + ")&order=registrado_en.desc,id.desc") || [];
      lote.forEach(id => { delete NOV[id]; });
      filas.forEach(n => { if (!NOV[n.expediente_id]) NOV[n.expediente_id] = n; });
      if (historial && lote.length === 1) NOV_HIST = filas;
    }
  } catch (e) {
    if (/exp_novedades|does not exist|schema cache|404/i.test(e.message)) {
      NOV_DISPONIBLE = false;
      console.warn("Falta la tabla exp_novedades: ejecuta sql_exp_novedades.sql");
    } else console.warn("Novedades:", e.message);
  }
}

function renderNovedades() {
  const body = $("nov-body");
  if (!NOV_DISPONIBLE) { body.innerHTML = `<tr><td colspan="6" class="empty">Falta crear la tabla de novedades en la base de datos (sql_exp_novedades.sql).</td></tr>`; return; }
  body.innerHTML = NOV_HIST.length ? NOV_HIST.map((n, i) => `<tr${i ? ' class="nov-vieja"' : ""}>
    <td class="small nowrap">${fmtFechaHora(n.registrado_en)}${i ? "" : '<div class="nov-actual">Vigente</div>'}</td>
    <td><strong>${esc(TIPOS_NOVEDAD[n.tipo] || n.tipo)}</strong>${n.causal ? `<div class="small muted">${esc(n.causal)}</div>` : ""}</td>
    <td class="nowrap">${esc(n.numero || "—")}</td>
    <td class="nowrap">${fmtFecha(n.fecha)}</td>
    <td class="small">${esc(n.observacion || "—")}</td>
    <td class="small">${esc(n.registrado_por_email || "—")}</td>
  </tr>`).join("") : `<tr><td colspan="6" class="empty">Sin novedades. El proceso sigue su curso normal.</td></tr>`;
}

function abrirModalNovedad() {
  if (!EXP) return;
  if (!NOV_DISPONIBLE) { toast("Primero hay que crear la tabla exp_novedades en Supabase (sql_exp_novedades.sql).", true); return; }
  const actual = NOV[EXP.id];
  $("nov-info").textContent = radVista(EXP.radicado) + " · " + (EXP.contribuyente || "") + (actual ? " · Vigente: " + textoNovedad(actual) : "");
  document.querySelectorAll('input[name="nov-tipo"]').forEach(r => {
    r.checked = false;
    // El incumplimiento solo tiene sentido si hay un acuerdo vigente
    if (r.value === "acuerdo_incumplido") r.closest(".nov-tipo").classList.toggle("hidden", !(actual && actual.tipo === "acuerdo_pago"));
  });
  $("nov-causal").innerHTML = '<option value="">— Selecciona —</option>' +
    CAUSALES_TERMINACION.map(c => `<option value="${esc(c.v)}">${esc(c.v === "Pago total de la obligación" ? c.v + " (cancelado)" : c.v)}</option>`).join("");
  ["nov-numero", "nov-fecha", "nov-obs"].forEach(id => { $(id).value = ""; });
  $("nov-fecha").max = hoyISO();
  $("nov-cerrar").checked = true;
  $("nov-campos").classList.add("hidden");
  $("btn-nov-ok").disabled = true;
  abrirModal("m-novedad");
}
function novTipo() { const r = document.querySelector('input[name="nov-tipo"]:checked'); return r ? r.value : ""; }
function novCambioTipo() {
  const t = novTipo();
  $("nov-campos").classList.toggle("hidden", !t);
  $("btn-nov-ok").disabled = !t;
  $("nov-causal-wrap").classList.toggle("hidden", t !== "terminacion");
  $("nov-numero-wrap").classList.toggle("hidden", t === "acuerdo_incumplido");
  $("nov-cerrar-wrap").classList.toggle("hidden", t !== "terminacion" || EXP.estado !== "abierto");
  $("nov-numero-l").textContent = t === "acuerdo_pago" ? "Número del acuerdo de pago *" : "Número del auto o resolución de terminación";
  $("nov-fecha-l").textContent = t === "acuerdo_pago" ? "Fecha del acuerdo" : t === "terminacion" ? "Fecha del auto o resolución" : "Fecha en que se declaró el incumplimiento";
  $("nov-numero").placeholder = t === "acuerdo_pago" ? "p. ej. AP-2026-015" : "Opcional";
  novCambioCausal();
}
function novCambioCausal() {
  const c = CAUSALES_TERMINACION.find(x => x.v === $("nov-causal").value);
  const obligatoria = novTipo() === "terminacion" && c && c.otra;
  $("nov-obs-l").textContent = obligatoria ? "Describe la causal *" : "Observación";
}

async function confirmarNovedad() {
  const tipo = novTipo();
  if (!tipo || !EXP) return;
  const causal = tipo === "terminacion" ? $("nov-causal").value : null;
  const numero = tipo === "acuerdo_incumplido" ? "" : $("nov-numero").value.trim();
  const fecha = $("nov-fecha").value || null;
  const obs = $("nov-obs").value.trim();
  if (tipo === "terminacion" && !causal) { toast("Elige la causal de terminación.", true); return; }
  if (tipo === "terminacion" && causal === "Otra" && obs.length < 10) { toast("Describe la causal (mínimo 10 caracteres).", true); return; }
  if (tipo === "acuerdo_pago" && !numero) { toast("Escribe el número del acuerdo de pago.", true); return; }
  const cerrar = tipo === "terminacion" && EXP.estado === "abierto" && $("nov-cerrar").checked;
  const resumen = textoNovedad({ tipo, causal, numero, fecha });
  if (!confirm("Se registrará: " + resumen + (cerrar ? "\n\nY se cerrará el expediente digital." : "") +
               "\n\nLas novedades no se editan ni se borran. ¿Continuar?")) return;
  const btn = $("btn-nov-ok");
  btn.disabled = true;
  try {
    await supaFetch("exp_novedades", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ expediente_id: EXP.id, tipo, causal, numero: numero || null, fecha, observacion: obs || null })
    });
    registrarEvento("novedad", null, { motivo: resumen });
    if (cerrar) {
      try {
        await rpc("exp_cambiar_estado", { p_expediente_id: EXP.id, p_estado: "cerrado",
                                          p_motivo: resumen + (obs ? ". " + obs : "") });
      } catch (e) {
        toast("La novedad quedó registrada, pero no se pudo cerrar el expediente: " + e.message, true);
      }
    }
    cerrarModal("m-novedad");
    toast("Novedad registrada" + (cerrar ? " y expediente cerrado." : "."));
    await recargarExpediente();
    if (ST) ST = null;   // las estadísticas se recalculan la próxima vez
  } catch (e) {
    toast("No se pudo registrar: " + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

function stCSVNovedades() {
  if (!ST) { toast("Abre primero las estadísticas.", true); return; }
  const rad = {}; ST.exps.forEach(e => { rad[e.id] = e; });
  descargarCSV("Novedades_procesos_" + fechaArchivo() + ".csv", [
    { t: "Cartera", v: n => rad[n.expediente_id] ? (CARTERAS[rad[n.expediente_id].cartera] || rad[n.expediente_id].cartera) : "" },
    { t: "Radicado", v: n => rad[n.expediente_id] ? rad[n.expediente_id].radicado : n.expediente_id },
    { t: "Contribuyente", v: n => rad[n.expediente_id] ? rad[n.expediente_id].contribuyente : "" },
    { t: "Novedad", v: n => TIPOS_NOVEDAD[n.tipo] || n.tipo },
    { t: "Causal", v: "causal" },
    { t: "Situación resultante", v: n => n.tipo === "terminacion" ? (causalEsPago(n.causal) ? "Cancelado" : "Terminado") : n.tipo === "acuerdo_pago" ? "En acuerdo de pago" : "Activo" },
    { t: "Número", v: "numero" },
    { t: "Fecha del acto", v: n => fmtFecha(n.fecha) },
    { t: "Observación", v: "observacion" },
    { t: "Vigente", v: n => ST.vigente && ST.vigente[n.expediente_id] === n.id ? "Sí" : "No" },
    { t: "Registró", v: "registrado_por_email" },
    { t: "Registrada", v: n => fmtFechaHora(n.registrado_en) }
  ], ST.novs || []);
}


// ════════════════════════════════════════════════════════════
// ACUERDOS DE PAGO — vista propia y estadísticas
// Fuente: v_acuerdos_pago y v_acuerdos_pago_resumen (sql_acuerdos_vistas.sql)
// ════════════════════════════════════════════════════════════
const ESTADO_AC = {
  A: { t: "Vigente",        c: "vig" },
  C: { t: "Cumplido",       c: "cum" },
  N: { t: "Anulado",        c: "anu" },
  E: { t: "En elaboración", c: "ela" }
};
const TRIBUTO_AC = { predial: "Predial", ica: "ICA" };
let VISTA = "procesos";
let AC_LIMITE = 24;
let AC_LISTO = false;

function irVista(v) {
  VISTA = v;
  ["procesos", "acuerdos", "ica"].forEach(k => {
    if ($("vista-" + k)) $("vista-" + k).classList.toggle("hidden", v !== k);
    if ($("vs-" + k)) { $("vs-" + k).classList.toggle("active", v === k); $("vs-" + k).setAttribute("aria-selected", v === k); }
  });
  if (v === "ica") montarICA();
  $("buscar-intro").textContent = v === "acuerdos"
    ? "Todos los convenios de pago del reporte de Recaudos desde 2020, Predial e ICA. Busca por número de convenio, cédula o nombre, y filtra por estado, año o si ya está escaneado."
    : v === "ica"
    ? "Los títulos ICA remitidos a la Dirección: los mismos de Seguimiento, con su gestión, responsables, alertas de prescripción y la carpeta de Drive de cada título. Lo que cambies aquí se ve igual en Seguimiento."
    : "Busca por radicado, comparendo, cédula o nombre en Predial, Obligaciones Urbanísticas y Tránsito. Si el expediente no tiene carpeta digital, créala desde el resultado; si no aparece en ninguna cartera, créala manualmente.";
  if (v === "acuerdos" && !AC_LISTO) { acPrepararAnios(); acBuscar(); }
}
function acPrepararAnios() {
  const sel = $("ac-anio");
  if (sel.options.length > 1) return;
  for (let y = new Date().getFullYear(); y >= 2020; y--) sel.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
}

// Filtros comunes (lista, conteo y CSV)
function acFiltros() {
  let f = "";
  const q = $("ac-q").value.trim();
  if (q) {
    if (/^\d+$/.test(q)) f += "&or=" + encodeURIComponent("(consecutivo.eq." + q + ",cedula_deudor.eq." + q + ")");
    else f += "&nombre_deudor=ilike." + encodeURIComponent("*" + q.replace(/\s+/g, "*") + "*");
  }
  const fu = $("ac-fuente").value, es = $("ac-estado").value, an = $("ac-anio").value, sc = $("ac-escaneo").value;
  if (fu) f += "&fuente=eq." + fu;
  if (es) f += "&estado=eq." + es;
  if (an) f += "&anio=eq." + an;
  if (sc === "si") f += "&escaneado=is.true";
  if (sc === "no") f += "&escaneado=is.false";
  return f;
}
function acOrden() {
  return $("ac-orden").value === "numero" ? "consecutivo.desc" : "fecha_elaboracion.desc.nullslast,consecutivo.desc";
}

async function acBuscar(mas) {
  if (!mas) AC_LIMITE = 24;
  AC_LISTO = true;
  const grid = $("ac-grid");
  if (!mas) grid.innerHTML = esqueletos(8);
  const f = acFiltros();
  try {
    // La lista es lo esencial; los conteos son un extra: si fallan, la lista igual se muestra
    const [rFilas, rTotal, rEsc] = await Promise.allSettled([
      supaFetch("v_acuerdos_pago?select=*" + f + "&order=" + acOrden() + "&limit=" + AC_LIMITE),
      contarFilas("v_acuerdos_pago?select=consecutivo" + f),
      contarFilas("v_acuerdos_pago?select=consecutivo" + f + ($("ac-escaneo").value ? "" : "&escaneado=is.true"))
    ]);
    if (rFilas.status === "rejected") throw rFilas.reason;
    const filas = rFilas.value;
    const total = rTotal.status === "fulfilled" ? rTotal.value : null;
    const nEsc = rEsc.status === "fulfilled" ? rEsc.value : null;
    if (rTotal.status === "rejected") console.warn("Conteo de convenios:", rTotal.reason && rTotal.reason.message);
    const lista = filas || [];
    grid.innerHTML = lista.length ? lista.map(tarjetaAcuerdo).join("")
      : `<div class="xc-vacio">Ningún convenio coincide con la búsqueda o los filtros.</div>`;
    $("ac-mas").classList.toggle("hidden", total === null ? lista.length < AC_LIMITE : !(total > lista.length));
    const sc = $("ac-escaneo").value;
    $("ac-resumen").innerHTML = total === null ? (lista.length ? "Mostrando " + stNum(lista.length) + " convenios (no se pudo calcular el total)." : "") :
      `<strong>${stNum(total)}</strong> convenio${total === 1 ? "" : "s"}` +
      (sc || nEsc === null ? "" : ` · <strong>${stNum(nEsc)}</strong> escaneado${nEsc === 1 ? "" : "s"} (${stPct(nEsc, total)})`) +
      (total > lista.length ? ` · mostrando ${stNum(lista.length)}` : "");
  } catch (e) {
    const falta = /v_acuerdos_pago|does not exist|schema cache|404/i.test(e.message);
    grid.innerHTML = `<div class="xc-vacio">${falta ? "Falta crear las vistas de acuerdos en la base de datos (sql_acuerdos_vistas.sql)." : "No se pudo cargar: " + esc(e.message)}</div>`;
    $("ac-resumen").innerHTML = "";
    $("ac-mas").classList.add("hidden");
  }
}
function acVerMas() { AC_LIMITE += 24; acBuscar(true); }

function tarjetaAcuerdo(a) {
  const est = ESTADO_AC[a.estado] || { t: a.estado || "—", c: "ela" };
  const trib = a.fuente === "ica"
    ? '<span class="chip chip-acuerdos_ica">ICA</span>'
    : a.fuente === "predial" ? '<span class="chip chip-acuerdos_predial">Predial</span>'
    : '<span class="chip chip-sin">Sin tributo</span>';
  const rads = String(a.radicados || "").split(",").map(r => r.trim()).filter(Boolean).map(radVista);
  let chipEsc;
  if (!a.escaneado) chipEsc = '<span class="chip ac-por">Por escanear</span>';
  else if (a.ligado_proceso) chipEsc = `<span class="chip ac-esc">Escaneado · en ${esc(rads.filter(r => !/^AP-/.test(r)).join(", ") || rads.join(", "))}</span>`;
  else chipEsc = '<span class="chip ac-esc">Escaneado</span>';
  const fechas = [];
  if (a.fecha_elaboracion) fechas.push("Elaborado " + fmtFecha(String(a.fecha_elaboracion).slice(0, 10)));
  if (a.fecha_aprobacion) fechas.push("Aprobado " + fmtFecha(String(a.fecha_aprobacion).slice(0, 10)));
  if (a.estado === "N" && a.fecha_anulacion) fechas.push("Anulado " + fmtFecha(String(a.fecha_anulacion).slice(0, 10)));
  const abre = a.exp_id !== null && a.exp_id !== undefined;
  return `<article class="xc ac ac-${est.c}${abre ? "" : " ac-sin"}"${abre ? ` onclick="abrirTarjeta(event, ${Number(a.exp_id)}, null)"` : ""}>
    <div class="xc-top">${trib}<span class="xc-est"><span class="xc-dot ac-dot"></span>${esc(est.t)}</span></div>
    <div class="xc-rad"><span class="ac-no">N.º</span> ${esc(a.consecutivo)}</div>
    <div class="xc-nom" title="${esc(a.nombre_deudor || "")}">${esc(a.nombre_deudor ? nombrePropio(a.nombre_deudor) : "Sin nombre en el reporte")}</div>
    <div class="xc-id">${a.cedula_deudor ? "C.C./NIT " + esc(a.cedula_deudor) : "&nbsp;"}</div>
    <div class="xc-extra">${fechas.map(t => `<div class="xc-ids">${esc(t)}</div>`).join("")}</div>
    <div class="xc-chips">${chipEsc}</div>
    <div class="xc-foot">
      <div class="xc-meta">${a.anio ? "Convenio de " + esc(a.anio) : ""}</div>
      ${abre ? `<button class="btn btn-sm xc-btn" onclick="abrirExpediente(${Number(a.exp_id)})">Abrir</button>`
             : '<span class="small muted">Sin PDF</span>'}
    </div>
  </article>`;
}

async function acCSV() {
  const btn = $("ac-btn-csv");
  btn.disabled = true;
  try {
    const filas = await traerTodo("v_acuerdos_pago?select=*" + acFiltros(), "consecutivo.desc");
    descargarCSV("Acuerdos_de_pago_" + fechaArchivo() + ".csv", [
      { t: "Convenio", v: "consecutivo" },
      { t: "Tributo", v: a => TRIBUTO_AC[a.fuente] || "" },
      { t: "Estado", v: a => (ESTADO_AC[a.estado] || {}).t || a.estado },
      { t: "Cédula/NIT", v: "cedula_deudor" },
      { t: "Deudor", v: "nombre_deudor" },
      { t: "Año", v: "anio" },
      { t: "Elaborado", v: a => fmtFecha(String(a.fecha_elaboracion || "").slice(0, 10)) },
      { t: "Aprobado", v: a => fmtFecha(String(a.fecha_aprobacion || "").slice(0, 10)) },
      { t: "Anulado", v: a => a.fecha_anulacion ? fmtFecha(String(a.fecha_anulacion).slice(0, 10)) : "" },
      { t: "Escaneado", v: a => a.escaneado ? "Sí" : "No" },
      { t: "Expedientes", v: a => String(a.radicados || "").split(",").map(r => r.trim()).filter(Boolean).map(radVista).join(", ") },
      { t: "Ligado a proceso de cobro", v: a => a.ligado_proceso ? "Sí" : "No" }
    ], filas);
  } catch (e) {
    toast("No se pudo descargar: " + e.message, true);
  } finally { btn.disabled = false; }
}

// ── Estadísticas de acuerdos ──
let ST_VISTA = "procesos";
let STA = null;
function irStVista(v) {
  ST_VISTA = v;
  $("st-cont").classList.toggle("hidden", v !== "procesos");
  $("st-acu").classList.toggle("hidden", v !== "acuerdos");
  $("st-ica").classList.toggle("hidden", v !== "ica");
  $("st-acc-procesos").classList.toggle("hidden", v !== "procesos");
  $("st-acc-acuerdos").classList.toggle("hidden", v !== "acuerdos");
  $("st-acc-ica").classList.toggle("hidden", v !== "ica");
  ["procesos", "acuerdos", "ica"].forEach(k => $("svs-" + k).classList.toggle("active", v === k));
  if (v === "acuerdos") cargarEstAcuerdos();
  else if (v === "ica") montarICA();
  else cargarEstadisticas();
}
// Títulos ICA (módulo compartido ica_titulos.js): lista en Buscar, tablero en Estadísticas
function montarICA() {
  if (typeof icaMontar !== "function") {
    const msg = '<div class="xc-vacio">Falta subir ica_titulos.js e ica_titulos.css al sitio.</div>';
    if ($("ica-root")) $("ica-root").innerHTML = msg;
    if ($("ica-stats")) $("ica-stats").innerHTML = msg;
    return;
  }
  window.ICA_TARJETAS = true;
  icaMontar();
}
// Al hacer clic en una cifra o alerta del tablero ICA (en Estadísticas) se abre la lista ya filtrada
window.icaMostrarLista = function () { irPanel("buscar"); irVista("ica"); };
async function cargarEstAcuerdos(forzar) {
  if (STA && !forzar) { renderEstAcuerdos(); return; }
  $("st-acu").innerHTML = `<div class="card empty">Calculando estadísticas de acuerdos…</div>`;
  try {
    STA = { filas: await supaFetch("v_acuerdos_pago_resumen?select=*") || [], en: new Date() };
    renderEstAcuerdos();
  } catch (e) {
    const falta = /v_acuerdos_pago|does not exist|schema cache|404/i.test(e.message);
    $("st-acu").innerHTML = `<div class="card empty">${falta ? "Falta crear las vistas de acuerdos (sql_acuerdos_vistas.sql)." : "No se pudieron calcular: " + esc(e.message)}</div>`;
  }
}
function stActualizar() {
  if (ST_VISTA === "acuerdos") cargarEstAcuerdos(true);
  else if (ST_VISTA === "ica") { if (typeof i26Cargar === "function") i26Cargar(); }
  else cargarEstadisticas(true);
}

function acSumar(filas, campo) { return filas.reduce((s, r) => s + (Number(r[campo]) || 0), 0); }
function acPorEstado(filas) {
  const o = { A: 0, C: 0, N: 0, E: 0 };
  filas.forEach(r => { o[r.estado] = (o[r.estado] || 0) + (Number(r.convenios) || 0); });
  return o;
}
// Barra 100 % apilada: composición por estado (honesta: cada segmento es su % del total de la fila)
function acBarraEstados(o) {
  const t = o.A + o.C + o.N + o.E;
  if (!t) return "";
  const seg = (k, cls) => o[k] ? `<div class="ac-seg ${cls}" style="width:${(o[k] / t * 100).toFixed(2)}%" title="${ESTADO_AC[k].t}: ${stNum(o[k])} (${stPct(o[k], t)})"></div>` : "";
  return `<div class="ac-stack">${seg("A", "vig")}${seg("C", "cum")}${seg("N", "anu")}${seg("E", "ela")}</div>`;
}
function renderEstAcuerdos() {
  const F = STA.filas;
  const total = acSumar(F, "convenios"), escan = acSumar(F, "escaneados"), lig = acSumar(F, "ligados_proceso");
  const est = acPorEstado(F);
  const leyenda = `<div class="ac-ley"><span><i class="vig"></i>Vigentes</span><span><i class="cum"></i>Cumplidos</span><span><i class="anu"></i>Anulados</span><span><i class="ela"></i>En elaboración</span></div>`;

  // Por tributo
  const trib = ["predial", "ica", null].map(fu => {
    const sub = F.filter(r => (r.fuente || null) === fu);
    return { fu, sub, n: acSumar(sub, "convenios"), esc: acSumar(sub, "escaneados"), est: acPorEstado(sub) };
  }).filter(x => x.n);

  // Por año
  const anios = [...new Set(F.map(r => r.anio).filter(Boolean))].sort((a, b) => b - a).map(an => {
    const sub = F.filter(r => r.anio === an);
    const e = acPorEstado(sub);
    return { an, n: acSumar(sub, "convenios"), esc: acSumar(sub, "escaneados"), e, cerrados: e.C + e.N };
  });

  $("st-acu").innerHTML = `
    <div class="st-kpis ac-kpis">
      <div class="card st-kpi"><div class="kpi-n">${stNum(total)}</div><div class="kpi-l">convenios desde 2020</div></div>
      <div class="card st-kpi"><div class="kpi-n ac-k-vig">${stNum(est.A)}</div><div class="kpi-l">vigentes</div></div>
      <div class="card st-kpi"><div class="kpi-n">${stNum(est.C)}</div><div class="kpi-l">cumplidos · ${stPct(est.C, total)}</div></div>
      <div class="card st-kpi"><div class="kpi-n ac-k-anu">${stNum(est.N)}</div><div class="kpi-l">anulados · ${stPct(est.N, total)}</div></div>
      <div class="card st-kpi"><div class="kpi-n">${stNum(escan)}</div><div class="kpi-l">escaneados · ${stPct(escan, total)}</div></div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3 class="st-h">Por tributo</h3>
      <p class="small muted st-p">Composición por estado de los convenios de cada tributo.</p>
      <div class="tbl-wrap"><table class="tbl st-tbl"><thead><tr>
        <th>Tributo</th><th class="num">Convenios</th><th class="num">Vigentes</th><th class="num">Cumplidos</th><th class="num">Anulados</th>
        <th style="width:28%">Composición</th><th class="num">Escaneados</th></tr></thead><tbody>
        ${trib.map(x => `<tr><td><strong>${x.fu ? TRIBUTO_AC[x.fu] : "Sin tributo"}</strong></td><td class="num">${stNum(x.n)}</td>
          <td class="num">${stNum(x.est.A)}</td><td class="num">${stNum(x.est.C)}</td><td class="num">${stNum(x.est.N)}</td>
          <td>${acBarraEstados(x.est)}</td><td class="num nowrap">${stNum(x.esc)} · ${stPct(x.esc, x.n)}</td></tr>`).join("")}
      </tbody></table></div>
      ${leyenda}
    </div>

    <div class="card" style="margin-top:16px">
      <div class="st-h-row"><h3 class="st-h">Por año de elaboración</h3><button class="btn btn-sm" onclick="acCSVAnios()">⬇ CSV</button></div>
      <p class="small muted st-p">«Cumplidos» se calcula sobre los convenios ya cerrados de ese año (cumplidos + anulados); los vigentes todavía no tienen desenlace, por eso los años recientes tienen muchos.</p>
      <div class="tbl-wrap"><table class="tbl st-tbl"><thead><tr>
        <th>Año</th><th class="num">Convenios</th><th class="num">Vigentes</th><th class="num">Cumplidos</th><th class="num">Anulados</th>
        <th style="width:26%">Composición</th><th class="num">% cumplidos de los cerrados</th><th class="num">Escaneados</th></tr></thead><tbody>
        ${anios.map(x => `<tr><td><strong>${x.an}</strong></td><td class="num">${stNum(x.n)}</td><td class="num">${stNum(x.e.A)}</td>
          <td class="num">${stNum(x.e.C)}</td><td class="num">${stNum(x.e.N)}</td><td>${acBarraEstados(x.e)}</td>
          <td class="num nowrap">${x.cerrados ? stPct(x.e.C, x.cerrados) : "—"}</td><td class="num nowrap">${stNum(x.esc)} · ${stPct(x.esc, x.n)}</td></tr>`).join("")}
      </tbody></table></div>
      ${leyenda}
    </div>

    <div class="st-grid">
      <div class="card">
        <h3 class="st-h">Avance del escaneo</h3>
        <p class="small muted st-p">Convenios del reporte con su PDF incorporado en un expediente.</p>
        <table class="tbl st-tbl"><tbody>
          ${trib.map(x => `<tr><td>${x.fu ? TRIBUTO_AC[x.fu] : "Sin tributo"}</td><td class="num nowrap">${stNum(x.esc)} de ${stNum(x.n)}</td>
            <td class="num nowrap">${stPct(x.esc, x.n)}</td><td class="st-bar-td">${stBarra(x.esc, x.n)}</td></tr>`).join("")}
          <tr><td><strong>Total</strong></td><td class="num nowrap">${stNum(escan)} de ${stNum(total)}</td><td class="num nowrap">${stPct(escan, total)}</td><td class="st-bar-td">${stBarra(escan, total)}</td></tr>
        </tbody></table>
      </div>
      <div class="card">
        <h3 class="st-h">Dónde quedaron los escaneados</h3>
        <p class="small muted st-p">Convenios incorporados al expediente de un proceso de cobro, o a un expediente propio de acuerdos.</p>
        <table class="tbl st-tbl"><tbody>
          <tr><td>En un proceso de cobro (FP…)</td><td class="num">${stNum(lig)}</td><td class="num nowrap">${stPct(lig, escan)}</td><td class="st-bar-td">${stBarra(lig, escan)}</td></tr>
          <tr><td>Solo en expediente de acuerdos (AP…)</td><td class="num">${stNum(escan - lig)}</td><td class="num nowrap">${stPct(escan - lig, escan)}</td><td class="st-bar-td">${stBarra(escan - lig, escan)}</td></tr>
        </tbody></table>
      </div>
    </div>
    <p class="small muted" style="margin-top:12px">Fuente: reporte de acuerdos de pago (desde 2020). Datos a ${fmtFechaHora(STA.en)}. El reporte no trae valores ni cuotas, por eso aquí solo hay cantidades.</p>`;
}
function acCSVAnios() {
  if (!STA) return;
  const filas = [];
  STA.filas.slice().sort((a, b) => (b.anio - a.anio) || String(a.fuente).localeCompare(String(b.fuente)) || String(a.estado).localeCompare(String(b.estado)))
    .forEach(r => filas.push(r));
  descargarCSV("Acuerdos_de_pago_resumen_" + fechaArchivo() + ".csv", [
    { t: "Año", v: "anio" },
    { t: "Tributo", v: r => TRIBUTO_AC[r.fuente] || "Sin tributo" },
    { t: "Estado", v: r => (ESTADO_AC[r.estado] || {}).t || r.estado },
    { t: "Convenios", v: "convenios" },
    { t: "Escaneados", v: "escaneados" },
    { t: "En proceso de cobro", v: "ligados_proceso" }
  ], filas);
}

// ════════════════════════════════════════════════════════════
// DIGITAR POLICÍA — comparendos de la cartera de policía
// Tabla expedientes_policia (sql_policia_digitacion.sql). La base pone quién
// digitó y cuándo, normaliza, impide repetidos y guarda la bitácora.
// ════════════════════════════════════════════════════════════
const POL_TABLA = "expedientes_policia";
const POL_VIGENCIA_CODIGO = "2017-01-30";   // Ley 1801 de 2016 rige desde enero de 2017: solo es un aviso
const POL_VALOR_ALTO = 100000000;
const POL_CAMPOS = ["p-comp", "p-fecha", "p-orden", "p-carpeta", "p-pagina", "p-nom", "p-ape", "p-ced", "p-valor", "p-obs"];
const POL_NOTAS = ["pn-comp", "pn-fecha", "pn-nom", "pn-ape", "pn-ced", "pn-valor", "pn-orden", "pn-carpeta", "pn-pagina"];
const POL_FORMATO_COMP = /^\d{2}-\d{3}-\d-\d{4}-\d+$/;   // 08-088-6-2022-4812
// Espacios, puntos, barras o guiones bajos pasan a guion (igual que en la base)
function polFormatoComp(s) { return String(s || "").trim().toUpperCase().replace(/[\s._/]+/g, "-").replace(/-{2,}/g, "-"); }
function polUbic(r) { return r.carpeta || r.pagina ? "Carp. " + (r.carpeta || "—") + " · pág. " + (r.pagina || "—") : ""; }
let POL = { listo: false, uid: null, admin: false, edit: null, hoy: [], res: [], ultimoNuevo: null, revisado: "", guardando: false, confirmado: "" };

function polNorm(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function polDig(s) { return String(s || "").replace(/\D/g, ""); }
function polPesos(n) { return n === null || n === undefined || n === "" ? "—" : "$ " + Number(n).toLocaleString("es-CO"); }
function polHora(ts) { return ts ? new Date(ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""; }
function polInicioHoy() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
function polNota(id, txt, tipo) { const n = $(id); if (n) { n.textContent = txt || ""; n.className = "pol-nota" + (tipo ? " " + tipo : ""); } }
function polMsg(e) {
  const m = String((e && e.message) || e || "");
  if (/duplicate key|23505|comparendo_uk/i.test(m)) return "Ese comparendo ya está digitado.";
  if (/pol_cedula_digitos/i.test(m)) return "La cédula debe tener entre 4 y 12 dígitos.";
  if (/carpeta o la página/i.test(m)) return "Faltan la carpeta o la página. Si ya los llenaste, falta ejecutar sql_policia_carpeta_pagina.sql.";
  if (/expedientes_policia|does not exist|schema cache/i.test(m)) return "Falta crear la tabla de policía en la base de datos (sql_policia_digitacion.sql).";
  return m;
}
function polConDatos() { return ["p-comp", "p-nom", "p-ape", "p-ced", "p-valor"].some(id => $(id) && $(id).value.trim()); }

async function polMontar() {
  if (!POL.listo) {
    POL.listo = true;
    $("p-valor").addEventListener("input", e => { const d = polDig(e.target.value); e.target.value = d ? Number(d).toLocaleString("es-CO") : ""; });
    $("p-ced").addEventListener("input", e => { e.target.value = polDig(e.target.value); });
    $("p-pagina").addEventListener("input", e => { e.target.value = polDig(e.target.value); });
    // Cualquier cambio anula la confirmación de "Guardar de todos modos"
    POL_CAMPOS.forEach(id => $(id).addEventListener("input", polQuitarConfirmacion));
    $("p-comp").addEventListener("change", () => { $("p-comp").value = polFormatoComp($("p-comp").value); });
    POL_CAMPOS.forEach((id, i) => {
      $(id).addEventListener("keydown", e => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); polGuardar(); return; }
        if (e.key === "Enter") {
          e.preventDefault();
          if (i === POL_CAMPOS.length - 1) polGuardar();
          else { const sig = $(POL_CAMPOS[i + 1]); sig.focus(); try { sig.select(); } catch (x) {} }
        }
        if (e.key === "Escape") { e.preventDefault(); if (!polConDatos() || confirm("¿Limpiar el formulario?")) polLimpiar(true); }
      });
    });
    $("p-comp").addEventListener("blur", () => polDuplicado(false));
    $("p-comp").addEventListener("input", () => { $("p-dup").classList.add("hidden"); $("p-comp").classList.remove("mal"); polNota("pn-comp", ""); POL.revisado = ""; });
    try { const { data } = await sbAuth.auth.getSession(); POL.uid = data && data.session ? data.session.user.id : null; } catch (e) {}
    try { POL.admin = !!(await rpc("pol_es_admin", {})); } catch (e) { POL.admin = false; }
    $("p-control").classList.toggle("hidden", !POL.admin);
  }
  $("p-fecha").max = hoyISO();
  await Promise.all([polCargarHoy(), polConteos()]);
  if (POL.admin) polControl();
  if (!POL.edit && !polConDatos()) $("p-comp").focus();
}

function polLeer() {
  return {
    comparendo: polFormatoComp($("p-comp").value), fecha_comparendo: $("p-fecha").value, orden_policia: $("p-orden").value.trim(),
    carpeta: $("p-carpeta").value.trim(), pagina: polDig($("p-pagina").value),
    nombres: $("p-nom").value.trim(), apellidos: $("p-ape").value.trim(), cedula: polDig($("p-ced").value),
    valor: polDig($("p-valor").value), observaciones: $("p-obs").value.trim()
  };
}
function polValidar(d) {
  let ok = true;
  POL_CAMPOS.forEach(id => $(id).classList.remove("mal"));
  POL_NOTAS.forEach(n => polNota(n, ""));
  const malo = (id, n, txt) => { $(id).classList.add("mal"); polNota(n, txt, "err"); ok = false; };
  if (!polNorm(d.comparendo)) malo("p-comp", "pn-comp", "Escribe el número de comparendo.");
  if (!d.fecha_comparendo) malo("p-fecha", "pn-fecha", "Falta la fecha.");
  else if (d.fecha_comparendo > hoyISO()) malo("p-fecha", "pn-fecha", "La fecha no puede ser futura.");
  else if (d.fecha_comparendo < POL_VIGENCIA_CODIGO) polNota("pn-fecha", "Es anterior al Código de Policía (2017): revísala.", "warn");
  if (!d.nombres) malo("p-nom", "pn-nom", "Faltan los nombres.");
  if (!d.apellidos) malo("p-ape", "pn-ape", "Faltan los apellidos.");
  if (d.cedula.length < 4 || d.cedula.length > 12) malo("p-ced", "pn-ced", "Entre 4 y 12 dígitos.");
  if (d.valor === "") malo("p-valor", "pn-valor", "Falta el valor.");
  else if (Number(d.valor) === 0) polNota("pn-valor", "Valor en cero: revísalo.", "warn");
  else if (Number(d.valor) > POL_VALOR_ALTO) polNota("pn-valor", "Valor muy alto: revísalo.", "warn");
  if (!d.orden_policia) polNota("pn-orden", "Opcional, pero conviene llenarlo.", "warn");
  else if (/carp/i.test(d.orden_policia)) malo("p-orden", "pn-orden", "La carpeta y la página van en sus campos.");
  if (!d.carpeta) malo("p-carpeta", "pn-carpeta", "Falta la carpeta.");
  if (!d.pagina) malo("p-pagina", "pn-pagina", "Falta la página.");
  if (d.valor !== "" && d.cedula && d.valor === d.cedula) malo("p-valor", "pn-valor", "Es igual a la cédula: revisa el valor.");
  // Año del comparendo vs. año de la fecha: solo aviso
  const anioComp = (d.comparendo.match(POL_FORMATO_COMP) ? d.comparendo.split("-")[3] : "");
  if (anioComp && d.fecha_comparendo && d.fecha_comparendo.slice(0, 4) !== anioComp && !$("pn-fecha").textContent)
    polNota("pn-fecha", "El comparendo es de " + anioComp + " y la fecha de " + d.fecha_comparendo.slice(0, 4) + ": revísala.", "warn");
  if (!$("p-dup").classList.contains("hidden")) ok = false;
  return ok;
}
// Avisos que no bloquean pero piden un segundo clic ("Guardar de todos modos")
function polAvisosConfirmar(d) {
  const av = [];
  if (!POL_FORMATO_COMP.test(d.comparendo)) { av.push("comparendo"); polNota("pn-comp", "No tiene el formato 08-088-6-2022-4812.", "warn"); $("p-comp").classList.add("mal"); }
  if (Number(d.valor) > POL_VALOR_ALTO) av.push("valor");
  return av.join("|");
}
function polQuitarConfirmacion() {
  if (!POL.confirmado) return;
  POL.confirmado = "";
  $("p-guardar").textContent = POL.edit ? "Guardar corrección" : "Guardar comparendo";
}
function polLimpiar(todo) {
  const fecha = $("p-fecha").value, carpeta = $("p-carpeta").value, pagina = polDig($("p-pagina").value);
  POL.confirmado = "";
  POL_CAMPOS.forEach(id => { $(id).value = ""; $(id).classList.remove("mal"); });
  POL_NOTAS.forEach(n => polNota(n, ""));
  $("p-dup").classList.add("hidden");
  if (!todo && $("p-mantener-fecha").checked) $("p-fecha").value = fecha;
  // Recorriendo una carpeta: misma carpeta, página siguiente
  if (!todo && !POL.edit && $("p-mantener-carpeta").checked && carpeta) {
    $("p-carpeta").value = carpeta;
    if (pagina) $("p-pagina").value = String(Number(pagina) + 1);
  }
  POL.edit = null; POL.revisado = "";
  $("p-ficha").classList.remove("editando");
  $("p-modo").classList.add("hidden");
  $("p-hist").classList.add("hidden");
  $("p-guardar").textContent = "Guardar comparendo";
  $("p-comp").focus();
}

async function polDuplicado(forzar) {
  const n = polNorm($("p-comp").value);
  const caja = $("p-dup");
  if (!n) { caja.classList.add("hidden"); return false; }
  if (!forzar && n === POL.revisado) return !caja.classList.contains("hidden");
  POL.revisado = n;
  try {
    const f = await supaFetch(POL_TABLA + "?select=id,comparendo,nombres,apellidos,digitado_por,digitado_por_email,digitado_en&comparendo_norm=eq." + encodeURIComponent(n) + "&limit=1") || [];
    const r = f[0];
    if (!r || (POL.edit && r.id === POL.edit.id)) { caja.classList.add("hidden"); polNota("pn-comp", "Disponible.", "ok"); return false; }
    const puede = POL.admin || r.digitado_por === POL.uid;
    caja.innerHTML = "Este comparendo ya está digitado: <b>" + esc(r.comparendo) + "</b> · " + esc(r.nombres + " " + r.apellidos) +
      " · por " + esc(r.digitado_por_email || "—") + " el " + esc(fmtFechaHora(r.digitado_en)) + "." +
      (puede ? ' <button class="btn btn-sm" type="button" onclick="polEditarId(' + Number(r.id) + ')">Abrir para corregir</button>' : "");
    caja.classList.remove("hidden");
    $("p-comp").classList.add("mal");
    polNota("pn-comp", "");
    return true;
  } catch (e) { polNota("pn-comp", "No se pudo verificar: " + polMsg(e), "warn"); return false; }
}

async function polGuardar() {
  if (POL.guardando) return;
  const d = polLeer();
  if (await polDuplicado(true)) { $("p-comp").focus(); return; }
  if (!polValidar(d)) { const m = document.querySelector("#panel-policia .pol-inp.mal"); if (m) m.focus(); return; }
  const avisos = polAvisosConfirmar(d);
  if (avisos && POL.confirmado !== avisos) {
    POL.confirmado = avisos;
    $("p-guardar").textContent = "Guardar de todos modos";
    toast("Revisa lo marcado en amarillo. Si está bien, pulsa «Guardar de todos modos».", true);
    return;
  }
  POL.guardando = true; $("p-guardar").disabled = true;
  const fila = {
    comparendo: d.comparendo, fecha_comparendo: d.fecha_comparendo, orden_policia: d.orden_policia || null,
    carpeta: d.carpeta, pagina: d.pagina,
    nombres: d.nombres, apellidos: d.apellidos, cedula: d.cedula, valor: Number(d.valor), observaciones: d.observaciones || null
  };
  try {
    if (POL.edit) {
      const r = await supaFetch(POL_TABLA + "?id=eq." + Number(POL.edit.id), { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(fila) });
      // Si la base no actualizó nada es porque el registro no es de quien corrige
      if (!r || !r.length) throw new Error("No tienes permiso para corregir este comparendo: solo quien lo digitó o un administrador.");
      toast("Corrección guardada.");
    } else {
      const r = await supaFetch(POL_TABLA, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(fila) });
      POL.ultimoNuevo = r && r[0] ? r[0].id : null;
      toast("Comparendo guardado.");
    }
    polLimpiar(false);
    await Promise.all([polCargarHoy(), polConteos()]);
    if (POL.res.length) polBuscar(true);
  } catch (e) {
    toast(polMsg(e), true);
    if (/ya está digitado/.test(polMsg(e))) polDuplicado(true);
  } finally { POL.guardando = false; $("p-guardar").disabled = false; }
}

async function polEditarId(id) {
  try { const f = await supaFetch(POL_TABLA + "?select=*&id=eq." + Number(id)) || []; if (f[0]) polEditar(f[0]); }
  catch (e) { toast("No se pudo abrir: " + polMsg(e), true); }
}
function polEditarDesde(lista, id) { const r = (lista === "res" ? POL.res : POL.hoy).find(x => x.id === id); if (r) polEditar(r); }
function polEditar(r) {
  if (!(POL.admin || r.digitado_por === POL.uid)) { toast("Solo puedes corregir lo que digitaste.", true); return; }
  if (!POL.edit && polConDatos() && !confirm("Hay datos sin guardar en el formulario. ¿Reemplazarlos por el comparendo a corregir?")) return;
  POL.edit = r;
  $("p-comp").value = r.comparendo || ""; $("p-fecha").value = r.fecha_comparendo || ""; $("p-orden").value = r.orden_policia || "";
  $("p-carpeta").value = r.carpeta || ""; $("p-pagina").value = r.pagina || "";
  $("p-nom").value = r.nombres || ""; $("p-ape").value = r.apellidos || ""; $("p-ced").value = r.cedula || "";
  $("p-valor").value = r.valor != null ? Number(r.valor).toLocaleString("es-CO") : ""; $("p-obs").value = r.observaciones || "";
  $("p-dup").classList.add("hidden"); POL.revisado = polNorm(r.comparendo);
  POL_CAMPOS.forEach(id => $(id).classList.remove("mal"));
  $("p-ficha").classList.add("editando");
  $("p-modo").classList.remove("hidden");
  $("p-modo-t").textContent = "Corrigiendo el comparendo " + r.comparendo + " (digitado por " + (r.digitado_por_email || "—") + " el " + fmtFechaHora(r.digitado_en) + ")";
  $("p-guardar").textContent = "Guardar corrección";
  POL.confirmado = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  $("p-comp").focus();
  polHistorial(r.id);
}
const POL_NOMBRES = { comparendo: "Comparendo", fecha_comparendo: "Fecha", orden_policia: "Orden de policía", carpeta: "Carpeta", pagina: "Página", nombres: "Nombres",
                      apellidos: "Apellidos", cedula: "Cédula", valor: "Valor", observaciones: "Observaciones", estado: "Estado" };
async function polHistorial(id) {
  const caja = $("p-hist");
  try {
    const b = await supaFetch("pol_bitacora?select=accion,usuario_email,fecha,cambios&policia_id=eq." + Number(id) + "&order=fecha.desc&limit=20") || [];
    const c = b.filter(x => x.accion === "corregir");
    if (!c.length) { caja.classList.add("hidden"); return; }
    caja.innerHTML = "<h4>Correcciones anteriores</h4><ul>" + c.map(x => {
      const det = Object.entries(x.cambios || {}).map(([k, v]) => {
        const f = val => k === "valor" ? polPesos(val) : (k === "fecha_comparendo" ? fmtFecha(val) : (val == null || val === "" ? "vacío" : val));
        return "<b>" + esc(POL_NOMBRES[k] || k) + "</b>: " + esc(f(v.antes)) + " → " + esc(f(v.despues));
      }).join("; ");
      return "<li>" + esc(fmtFechaHora(x.fecha)) + " · " + esc(x.usuario_email || "—") + " — " + det + "</li>";
    }).join("") + "</ul>";
    caja.classList.remove("hidden");
  } catch (e) { caja.classList.add("hidden"); }
}

function polFila(r, conQuien) {
  const puede = POL.admin || r.digitado_por === POL.uid;
  return "<tr" + (r.id === POL.ultimoNuevo ? ' class="pol-nuevo"' : "") + ">" +
    (conQuien ? "" : "<td class=\"small muted nowrap\">" + esc(polHora(r.digitado_en)) + "</td>") +
    "<td class=\"pol-comp nowrap\">" + esc(r.comparendo) + "</td>" +
    "<td class=\"nowrap\">" + esc(fmtFecha(r.fecha_comparendo)) + "</td>" +
    "<td>" + (r.orden_policia ? esc(r.orden_policia) : '<span class="pol-falta">Sin dato</span>') + "</td>" +
    "<td class=\"nowrap\">" + (polUbic(r) ? esc(polUbic(r)) : '<span class="pol-falta">Sin dato</span>') + "</td>" +
    "<td>" + esc((r.nombres || "") + " " + (r.apellidos || "")) + (r.observaciones ? ' <span class="pol-falta" title="' + esc(r.observaciones) + '">· obs.</span>' : "") + "</td>" +
    "<td class=\"num\">" + esc(r.cedula) + "</td>" +
    "<td class=\"num\">" + esc(polPesos(r.valor)) + "</td>" +
    (conQuien ? "<td class=\"small muted\">" + esc(r.digitado_por_email || "—") + "<br>" + esc(fmtFechaHora(r.digitado_en)) + "</td>" : "") +
    "<td style=\"text-align:right\">" + (puede ? '<button class="btn btn-sm" type="button" onclick="polEditarDesde(\'' + (conQuien ? "res" : "hoy") + '\',' + Number(r.id) + ')">Corregir</button>' : "") + "</td></tr>";
}
async function polCargarHoy() {
  if (!POL.uid) return;
  try {
    POL.hoy = await supaFetch(POL_TABLA + "?select=*&digitado_por=eq." + POL.uid + "&digitado_en=gte." + encodeURIComponent(polInicioHoy()) + "&order=digitado_en.desc&limit=1000") || [];
    $("p-hoy-body").innerHTML = POL.hoy.length ? POL.hoy.map(r => polFila(r, false)).join("")
      : '<tr><td colspan="9" class="empty">Todavía no has digitado nada hoy. Empieza por el número de comparendo.</td></tr>';
    $("p-hoy-n").textContent = POL.hoy.length ? POL.hoy.length + " comparendo" + (POL.hoy.length === 1 ? "" : "s") : "";
    $("p-k-hoy").textContent = POL.hoy.length.toLocaleString("es-CO");
  } catch (e) {
    $("p-hoy-body").innerHTML = '<tr><td colspan="9" class="empty">' + esc(polMsg(e)) + "</td></tr>";
  }
}
async function polConteos() {
  if (!POL.uid) return;
  const [mios, total] = await Promise.all([
    contarFilas(POL_TABLA + "?select=id&digitado_por=eq." + POL.uid).catch(() => null),
    contarFilas(POL_TABLA + "?select=id").catch(() => null)
  ]);
  $("p-k-mios").textContent = mios === null ? "—" : mios.toLocaleString("es-CO");
  $("p-k-total").textContent = total === null ? "—" : total.toLocaleString("es-CO");
}
async function polBuscar(silencioso) {
  const q = $("p-q").value.trim();
  if (!q) { $("p-res-wrap").classList.add("hidden"); POL.res = []; return; }
  const n = polNorm(q), dig = polDig(q), conds = [];
  if (n) conds.push("comparendo_norm.ilike.*" + n + "*");
  if (dig.length >= 4) conds.push("cedula.like.*" + dig + "*");
  if (/[a-záéíóúñ]/i.test(q)) {
    const t = q.replace(/[*,()]/g, " ").trim().replace(/\s+/g, "*");
    conds.push("nombres.ilike.*" + t + "*", "apellidos.ilike.*" + t + "*");
  }
  try {
    POL.res = await supaFetch(POL_TABLA + "?select=*&or=" + encodeURIComponent("(" + conds.join(",") + ")") + "&order=digitado_en.desc&limit=50") || [];
    $("p-res-wrap").classList.remove("hidden");
    $("p-res-body").innerHTML = POL.res.length ? POL.res.map(r => polFila(r, true)).join("")
      : '<tr><td colspan="9" class="empty">No hay comparendos con «' + esc(q) + '».</td></tr>';
  } catch (e) { if (!silencioso) toast("No se pudo buscar: " + polMsg(e), true); }
}
async function polControl() {
  if (!POL.admin) return;
  const desde = new Date(); desde.setDate(desde.getDate() - 13); desde.setHours(0, 0, 0, 0);
  try {
    const filas = await supaFetch(POL_TABLA + "?select=digitado_por_email,digitado_en&digitado_en=gte." + encodeURIComponent(desde.toISOString()) + "&limit=50000") || [];
    const dia = d => d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" });
    const ult = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); ult.push(dia(d)); }
    const pp = {};
    filas.forEach(r => { const p = r.digitado_por_email || "—", k = dia(new Date(r.digitado_en)); pp[p] = pp[p] || {}; pp[p][k] = (pp[p][k] || 0) + 1; });
    const personas = Object.keys(pp).sort();
    $("p-ctrl-tabla").innerHTML = personas.length
      ? "<thead><tr><th>Persona</th>" + ult.map(d => "<th class=\"num\">" + d + "</th>").join("") + "<th class=\"num\">14 días</th></tr></thead><tbody>" +
        personas.map(p => "<tr><td class=\"small\">" + esc(p) + "</td>" + ult.map(d => "<td class=\"num\">" + (pp[p][d] || "") + "</td>").join("") +
          "<td class=\"num\"><b>" + Object.values(pp[p]).reduce((a, b) => a + b, 0).toLocaleString("es-CO") + "</b></td></tr>").join("") + "</tbody>"
      : '<tbody><tr><td class="empty">Nadie ha digitado en los últimos 14 días.</td></tr></tbody>';
  } catch (e) { $("p-ctrl-tabla").innerHTML = '<tbody><tr><td class="empty">' + esc(polMsg(e)) + "</td></tr></tbody>"; }
  const [a, b, c, u] = await Promise.all([
    contarFilas(POL_TABLA + "?select=id&orden_policia=is.null").catch(() => null),
    contarFilas(POL_TABLA + "?select=id&valor=eq.0").catch(() => null),
    contarFilas(POL_TABLA + "?select=id&observaciones=not.is.null").catch(() => null),
    contarFilas(POL_TABLA + "?select=id&or=" + encodeURIComponent("(carpeta.is.null,pagina.is.null)")).catch(() => null)
  ]);
  $("p-ctrl-sin-ubic").textContent = u === null ? "—" : u.toLocaleString("es-CO");
  $("p-ctrl-sin-orden").textContent = a === null ? "—" : a.toLocaleString("es-CO");
  $("p-ctrl-valor0").textContent = b === null ? "—" : b.toLocaleString("es-CO");
  $("p-ctrl-obs").textContent = c === null ? "—" : c.toLocaleString("es-CO");
}
async function polCSV() {
  const btn = $("p-btn-csv"); btn.disabled = true;
  try {
    const todo = await traerTodo(POL_TABLA + "?select=*", "id.asc");
    descargarCSV("Comparendos_policia_" + fechaArchivo() + ".csv", [
      { t: "Comparendo", v: "comparendo" }, { t: "Fecha", v: r => fmtFecha(r.fecha_comparendo) }, { t: "Orden de policía", v: "orden_policia" },
      { t: "Carpeta", v: "carpeta" }, { t: "Página", v: "pagina" },
      { t: "Nombres", v: "nombres" }, { t: "Apellidos", v: "apellidos" }, { t: "Cédula", v: "cedula" }, { t: "Valor", v: "valor" },
      { t: "Observaciones", v: "observaciones" }, { t: "Estado", v: "estado" }, { t: "Digitó", v: "digitado_por_email" },
      { t: "Digitado", v: r => fmtFechaHora(r.digitado_en) }, { t: "Corrigió", v: "actualizado_por_email" }, { t: "Corregido", v: r => fmtFechaHora(r.actualizado_en) }
    ], todo);
  } catch (e) { toast("No se pudo descargar: " + polMsg(e), true); }
  finally { btn.disabled = false; }
}
