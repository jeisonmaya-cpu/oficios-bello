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
                 policia: "Sanciones de policía", acuerdos: "Acuerdos de pago" };
const ACCIONES = {
  crear_expediente: "Creó el expediente",
  incorporar:       "Incorporó documento",
  anular:           "Anuló documento",
  cerrar:           "Cerró el expediente",
  reabrir:          "Reabrió el expediente",
  consultar:        "Consultó",
  descargar:        "Vio / descargó documento",
  exportar_indice:  "Exportó"
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
  if (COLA.some(q => q.estado === "subiendo")) {
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
  if (COLA.some(q => q.estado === "subiendo")) { e.preventDefault(); e.returnValue = ""; }
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
}
function irSub(n) {
  ["indice", "incorporar", "bitacora"].forEach(k => {
    $("sub-" + k).classList.toggle("active", k === n);
    $("st-" + k).classList.toggle("active", k === n);
  });
  if (n === "bitacora") cargarBitacora();
}

// ════════════════════════════════════════════════════════════
// INICIO
// ════════════════════════════════════════════════════════════
async function iniciarApp() {
  if (appIniciada) return;
  appIniciada = true;
  configurarDropzone();
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
}

function llenarSelectCarteras() {
  const ops = Object.keys(CARTERAS).map(k => `<option value="${esc(k)}">${esc(CARTERAS[k])}</option>`).join("");
  $("f-cartera").innerHTML = '<option value="">Todas las carteras</option>' + ops;
  $("r-cartera").innerHTML = '<option value="">Todas las carteras</option>' + ops;
  $("man-cartera").innerHTML = ops;
}
function chipCartera(c) {
  return `<span class="chip chip-${esc(c)}">${esc(CARTERAS[c] || c)}</span>`;
}
function chipsSituacion(f) {
  const out = [];
  if (f.en_acuerdo) out.push('<span class="chip chip-acuerdo">En acuerdo de pago</span>');
  if (f.embargos > 0) out.push(`<span class="chip chip-embargo">${f.embargos} embargo${f.embargos === 1 ? "" : "s"}</span>`);
  if (f.origen === "manual") out.push('<span class="chip chip-manual">Manual</span>');
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
  filtros.push("id_contribuyente.ilike." + patron);
  filtros.push("contribuyente.ilike." + patron);

  let path = "v_exp_buscar?select=*&or=" + encodeURIComponent("(" + filtros.join(",") + ")") +
             "&order=radicado.asc&limit=60";
  if (cartera) path += "&cartera=eq." + cartera;

  $("btn-buscar").disabled = true;
  info.textContent = "Buscando…";
  try {
    const filas = await supaFetch(path) || [];
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
  $("res-body").innerHTML = filas.map((f, i) => {
    const tiene = f.exp_id !== null && f.exp_id !== undefined;
    const estadoExp = tiene
      ? `<span class="chip chip-${esc(f.estado_expediente)}">${esc(f.estado_expediente)}</span>
         <span class="small muted">${f.total_documentos} doc. · ${f.total_folios} fol.</span>`
      : `<span class="chip chip-sin">sin carpeta</span>`;
    const accion = tiene
      ? `<button class="btn btn-sm" onclick="abrirExpediente(${Number(f.exp_id)})">Abrir</button>`
      : `<button class="btn btn-sm btn-gold" onclick="crearDesdeResultado(${i})">Crear</button>`;
    return `<tr>
      <td>${chipCartera(f.cartera)}</td>
      <td class="nowrap"><strong>${esc(f.radicado)}</strong></td>
      <td>${esc(f.contribuyente || "—")}<div class="small muted">${esc(f.id_contribuyente || "")}</div></td>
      <td>${esc(f.estado_cartera || "—")}<div class="flags">${chipsSituacion(f)}</div></td>
      <td class="num nowrap">${fmtMoneda(f.valor_total)}</td>
      <td>${estadoExp}</td>
      <td class="num">${accion}</td>
    </tr>`;
  }).join("");
}

async function cargarRecientes() {
  try {
    let path = "v_exp_digital?select=*&order=actualizado_en.desc&limit=25";
    const rc = $("r-cartera") ? $("r-cartera").value : "";
    const re = $("r-estado") ? $("r-estado").value : "";
    if (rc) path += "&cartera=eq." + encodeURIComponent(rc);
    if (re) path += "&estado=eq." + encodeURIComponent(re);
    if ($("r-mios") && $("r-mios").checked && USUARIO_EMAIL) path += "&creado_por_email=eq." + encodeURIComponent(USUARIO_EMAIL);
    const filtrado = rc || re || ($("r-mios") && $("r-mios").checked);
    const filas = await supaFetch(path) || [];
    $("rec-body").innerHTML = filas.length ? filas.map(f => `<tr>
      <td>${chipCartera(f.cartera)}</td>
      <td class="nowrap"><strong>${esc(f.radicado)}</strong></td>
      <td>${esc(f.contribuyente || "—")}<div class="flags">${chipsSituacion(f)}</div></td>
      <td class="num">${f.total_documentos}</td>
      <td class="num">${f.total_folios}</td>
      <td><span class="chip chip-${esc(f.estado)}">${esc(f.estado)}</span></td>
      <td class="nowrap small">${fmtFechaHora(f.actualizado_en)}</td>
      <td class="num"><button class="btn btn-sm" onclick="abrirExpediente(${Number(f.id)})">Abrir</button></td>
    </tr>`).join("") : (filtrado ? `<tr><td colspan="8" class="empty">Ningún expediente coincide con estos filtros.</td></tr>`
                : `<tr><td colspan="8" class="empty">Aún no hay expedientes digitales. Busca un radicado y crea el primero.</td></tr>`);
  } catch (e) {
    $("rec-body").innerHTML = `<tr><td colspan="8" class="empty">No se pudo cargar: ${esc(e.message)}</td></tr>`;
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
  const radicado = $("man-radicado").value.trim().toUpperCase();
  const cedula = $("man-cedula").value.replace(/[^0-9A-Za-z-]/g, "");
  const nombre = $("man-nombre").value.trim();
  if (normRad(radicado).length < 3) { toast("Escribe el radicado completo.", true); return; }
  if (!cedula || !nombre) { toast("Escribe la cédula o NIT y el nombre del contribuyente.", true); return; }
  const btn = $("btn-manual-ok");
  btn.disabled = true;
  try {
    const ya = await supaFetch("exp_digital?select=id&cartera=eq." + cartera +
                               "&radicado_norm=eq." + encodeURIComponent(normRad(radicado))) || [];
    let id = ya.length ? ya[0].id : null;
    if (!id) id = await rpc("exp_crear_expediente", {
      p_cartera: cartera, p_radicado: radicado, p_manual: true,
      p_id_contribuyente: cedula, p_contribuyente: nombre
    });
    cerrarModal("m-manual");
    if (id) {
      toast(ya.length ? "Ese radicado ya tenía expediente; lo abrí." : "Expediente creado.");
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
                                "&radicado_norm=eq." + encodeURIComponent(normRad(radicado))) || [];
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
  $("exp-rad").textContent = e.radicado;
  $("exp-sub").innerHTML =
    `<strong>${esc(e.contribuyente || "Contribuyente sin nombre")}</strong>` +
    (e.id_contribuyente ? " · C.C./NIT " + esc(e.id_contribuyente) : "") +
    "<br>Estado en cartera: " + esc(e.estado_cartera || "—") +
    " · Valor: " + fmtMoneda(e.valor_total) +
    "<br>Creado por " + esc(e.creado_por_email || "—") + " el " + fmtFechaHora(e.creado_en);
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
    const nombre = nombreArchivoSeguro(EXP.radicado) + "_" + String(d.consecutivo).padStart(3, "0") + "_" +
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
    const ruta = EXP.cartera + "/" + EXP.radicado_norm + "/" + q.sha + "-" + Date.now() + ".pdf";
    try {
      const { error } = await sbAuth.storage.from(BUCKET).upload(ruta, q.file, {
        contentType: "application/pdf", upsert: false, cacheControl: "3600"
      });
      if (error) throw new Error("No se pudo subir el archivo: " + (error.message || error));
    } catch (e) {
      q.estado = "error"; q.msg = e.message; fallos++;
      continue;
    }
    q.msg = "Registrando en el índice…";
    renderCola();
    try {
      const fila = {
        expediente_id: EXP.id,
        tipo_documental: q.tipo,
        etapa_codigo: q.etapa || null,
        descripcion: q.descripcion.trim(),
        fecha_documento: q.fecha || null,
        origen: q.origen,
        paginas: q.paginas,
        tamano_bytes: q.tamano,
        sha256: q.sha,
        storage_path: ruta,
        nombre_original: q.nombre,
        canal_ingreso: "manual",
        observaciones: q.obs.trim() || null
      };
      const r = await supaFetch("exp_documentos", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(fila)
      });
      const d = r && r[0];
      q.estado = "ok";
      q.msg = d ? "Incorporado como N.º " + d.consecutivo + " · folios " + d.folio_inicial + " a " + d.folio_final : "Incorporado.";
      ok++;
      // Refresca totales para que la vista previa del resto sea exacta
      if (d) { EXP.total_documentos = d.consecutivo; EXP.total_folios = d.folio_final; }
    } catch (e) {
      q.estado = "error";
      q.msg = e.message + " (el archivo quedó en el repositorio pero NO entró al índice).";
      console.warn("Archivo sin registrar en el índice:", ruta);
      fallos++;
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
        ["Radicado", e.radicado],
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
    const pie = latin("Índice electrónico · " + e.radicado + " · Página " + (i + 1) + " de " + total);
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
    pdf.setTitle("Índice electrónico " + EXP.radicado);
    pdf.setProducer("Teodoro · Ejecuciones Fiscales Bello");
    const F = await cargarFuentes(pdf);
    construirIndice(pdf, F, { exp: EXP, docs: INDICE, generadoPor: USUARIO_EMAIL, generadoEn: new Date() });
    const bytes = await pdf.save();
    descargarBlob(bytes, "Indice_" + nombreArchivoSeguro(EXP.radicado) + ".pdf");
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
    pdf.setTitle("Expediente " + EXP.radicado);
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
          sellarFolio(p, latin(EXP.radicado + " · Folio " + (d.folio_inicial + k)), F);
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
    descargarBlob(salida, "Expediente_" + nombreArchivoSeguro(EXP.radicado) + "_foliado.pdf");
    registrarEvento("exportar_indice", null, { tipo: "foliado", alertas: alertas.length ? alertas : undefined });
    if (alertas.length) toast("Generado con alertas: " + alertas.join("; "), true);
    else toast("Expediente foliado generado. Integridad verificada en todos los documentos.");
  } catch (e) {
    progreso(false);
    console.error(e);
    toast("No se pudo generar el expediente foliado: " + e.message, true);
  }
}
