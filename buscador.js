// ════════════════════════════════════════════════════════════
// CONFIG — SUPABASE (mismo modelo que tutelas: anon pública + RLS)
// ════════════════════════════════════════════════════════════
const SUPABASE_URL  = "https://bmurdtfztsltcgwsfbgf.supabase.co";
const SUPABASE_ANON  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdXJkdGZ6dHNsdGNnd3NmYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjU2NzYsImV4cCI6MjA5NjcwMTY3Nn0.2Md6ymram4kv82Lirk2ICl9ZOXUsI5Gve02q7FUCHvs";
const SB_TABLA      = "guias_notificacion";   // para INSERTAR
const SB_VISTA      = "v_guias";              // para CONSULTAR (trae nombre_resuelto)

// ════════════════════════════════════════════════════════════
// REPO — única capa que sabe de dónde vienen los datos
// ════════════════════════════════════════════════════════════
const Repo = {
  _headers(){
    return { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON };
  },
  // Busca por cédula exacta o comparendo exacto. Devuelve filas crudas.
  async buscar(termino){
    const t = termino.trim();
    let filtro;
    // ¿parece comparendo? (contiene letras o es muy largo) -> busca por comparendo
    const soloDig = t.replace(/\D/g, "");
    const esCedula = /^\d{4,12}$/.test(t.replace(/[.\-\s]/g, ""));
    if (esCedula) {
      filtro = `id_contribuyente=eq.${encodeURIComponent(soloDig)}`;
    } else {
      filtro = `comparendo=eq.${encodeURIComponent(t.toUpperCase())}`;
    }
    const url = `${SUPABASE_URL}/rest/v1/${SB_VISTA}?${filtro}&select=*&order=comparendo.asc`;
    const res = await fetch(url, { headers: this._headers() });
    if (!res.ok) throw new Error("Supabase HTTP " + res.status);
    return res.json();
  },
  // Inserta una guía nueva (la persona técnica).
  async insertar(reg){
    const url = `${SUPABASE_URL}/rest/v1/${SB_TABLA}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this._headers(), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(reg)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error("Supabase HTTP " + res.status + " — " + txt);
    }
    return true;
  }
};

// ════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════
function irPanel(p){
  document.querySelectorAll(".panel").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("panel-" + p).classList.add("active");
  document.getElementById("tab-" + p).classList.add("active");
  if (p === "consultar") setTimeout(() => document.getElementById("q").focus(), 100);
}

// ════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════
function esc(v){ if(v==null) return ""; return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function setStatus(tipo, msg, spin){
  const bar = document.getElementById("status");
  bar.className = "status show " + tipo;
  document.getElementById("sp").style.display = spin ? "block" : "none";
  document.getElementById("status-msg").textContent = msg;
}
function ocultarStatus(){ document.getElementById("status").className = "status"; }
function toast(msg, esError){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (esError ? " err" : "");
  setTimeout(() => t.className = "toast" + (esError ? " err" : ""), 2600);
}
function fechaCO(iso){
  if(!iso) return null;
  const p = String(iso).split("-");
  if(p.length!==3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// ════════════════════════════════════════════════════════════
// BUSCAR + CONSOLIDAR POR PERSONA
// ════════════════════════════════════════════════════════════
async function buscar(){
  const q = document.getElementById("q").value.trim();
  if(!q){ setStatus("err","Escribe una cédula o un comparendo."); return; }
  const btn = document.getElementById("btn-buscar");
  btn.disabled = true;
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("resultados").innerHTML = "";
  setStatus("load","Consultando…", true);
  try{
    const filas = await Repo.buscar(q);
    if(!filas.length){
      setStatus("empty","Sin registros para “" + q + "”.");
      document.getElementById("empty-state").style.display = "block";
      document.getElementById("empty-state").querySelector("p").textContent = "No hay guías registradas para “" + q + "”.";
      return;
    }
    // Si buscó por comparendo, la persona es la dueña de ese comparendo:
    // consolidamos por cédula igualmente para mostrar el perfil completo.
    ocultarStatus();
    renderPerfil(filas, q);
    setStatus("ok", filas.length + " registro(s) encontrado(s).");
  }catch(err){
    setStatus("err","Error de conexión. " + err.message);
  }finally{
    btn.disabled = false;
  }
}

// Guardamos la última búsqueda para que el modal de impresión la use.
let _datosActuales = { nombre:"", cedula:"", porComp:{} };

function renderPerfil(filas, termino){
  // Datos de la persona (toma el primero con nombre)
  const conNombre = filas.find(f => f.nombre_resuelto || f.nombre) || filas[0];
  const cedula = conNombre.id_contribuyente || "—";
  const nombre = conNombre.nombre_resuelto || conNombre.nombre || "(Sin nombre registrado)";

  // Agrupar por comparendo
  const porComp = {};
  filas.forEach(f => {
    const k = f.comparendo || "(sin comparendo)";
    (porComp[k] = porComp[k] || []).push(f);
  });
  const comps = Object.keys(porComp);

  _datosActuales = { nombre, cedula, porComp };

  let html = `
    <div class="perfil-head">
      <div class="perfil-nombre">${esc(nombre)}</div>
      <div class="perfil-meta">
        <span>Cédula / NIT: <strong>${esc(cedula)}</strong></span>
        <span>Comparendos: <strong>${comps.length}</strong></span>
        <span>Registros de notificación: <strong>${filas.length}</strong></span>
      </div>
      <div class="perfil-resumen">
        <button class="btn-print" onclick="abrirModal('todo')">🖨️ Imprimir todo el perfil</button>
      </div>
    </div>`;

  comps.forEach(comp => {
    const evidencias = porComp[comp];
    html += `
      <div class="comp-card">
        <div class="comp-top">
          <div class="comp-num"><span>Comparendo</span>${esc(comp)}</div>
          <button class="btn-print sm" onclick="abrirModal('comp', '${esc(comp).replace(/'/g,"\\'")}')">🖨️ Imprimir</button>
        </div>
        <div class="comp-canales">
          ${evidencias.map(renderCanal).join("")}
        </div>
      </div>`;
  });

  document.getElementById("resultados").innerHTML = html;
}

function renderCanal(f){
  const canales = {
    aviso:              { ico:"📬", color:"rgba(232,160,32,.15)",  nombre:"Aviso" },
    correo_certificado: { ico:"✉️", color:"rgba(45,141,232,.15)",  nombre:"Correo certificado" },
    web:                { ico:"🌐", color:"rgba(139,92,246,.15)",  nombre:"Publicación web" },
    personal:           { ico:"🤝", color:"rgba(34,197,94,.15)",   nombre:"Personal" }
  };
  const c = canales[f.canal] || { ico:"📄", color:"rgba(255,255,255,.06)", nombre:f.canal||"—" };

  // badge de estado
  let badge = "";
  const e = (f.estado||"").toLowerCase();
  if(e.startsWith("entrega")) badge = `<span class="badge b-ok">${esc(f.estado)}</span>`;
  else if(e.startsWith("devuelt")) badge = `<span class="badge b-dev">${esc(f.estado)}</span>`;
  else if(e.startsWith("public")) badge = `<span class="badge b-pub">${esc(f.estado)}</span>`;
  else if(e.startsWith("sin def")) badge = `<span class="badge b-sd">${esc(f.estado)}</span>`;
  else if(f.estado) badge = `<span class="badge b-otro">${esc(f.estado)}</span>`;

  // detalle según datos disponibles
  const partes = [];
  if(f.fecha_notificacion) partes.push("Notificado: <strong>" + esc(fechaCO(f.fecha_notificacion)) + "</strong>");
  if(f.num_guia) partes.push("Guía: " + esc(f.num_guia));
  if(f.tipo_notificacion && f.tipo_notificacion!==c.nombre) partes.push("Tipo: " + esc(f.tipo_notificacion));
  if(f.direccion) partes.push("Dir: " + esc(f.direccion) + (f.municipio ? ", " + esc(f.municipio) : ""));
  else if(f.municipio) partes.push(esc(f.municipio));
  if(f.responsable) partes.push("Responsable: " + esc(f.responsable));
  if(f.radicado) partes.push("Radicado: " + esc(f.radicado));
  if(f.url_evidencia) partes.push('<a href="' + esc(f.url_evidencia) + '" target="_blank" rel="noopener">Ver publicación ↗</a>');
  if(f.origen==="manual" && f.creado_por) partes.push("<em>Ingresado por " + esc(f.creado_por) + "</em>");

  return `
    <div class="canal-row">
      <div class="canal-ico" style="background:${c.color}">${c.ico}</div>
      <div class="canal-body">
        <div class="canal-nombre">${esc(c.nombre)} ${badge}</div>
        <div class="canal-detalle">${partes.join(" · ") || "Sin detalle adicional registrado."}</div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// MODAL DE IMPRESIÓN (reporte informativo de uso interno)
// ════════════════════════════════════════════════════════════
function abrirModal(modo, comp){
  const d = _datosActuales;
  if(!d.nombre){ return; }

  // qué comparendos incluir
  let comps;
  if(modo === "comp" && comp){ comps = [comp]; }
  else { comps = Object.keys(d.porComp); }

  const ahora = new Date();
  const fechaImp = String(ahora.getDate()).padStart(2,"0") + "/" +
                   String(ahora.getMonth()+1).padStart(2,"0") + "/" +
                   ahora.getFullYear() + " " +
                   String(ahora.getHours()).padStart(2,"0") + ":" +
                   String(ahora.getMinutes()).padStart(2,"0");

  let html = `
    <div class="doc-meta">Generado: ${fechaImp}</div>
    <div class="doc-hdr">
      <div class="ent">Alcaldía de Bello</div>
      <div class="dep">Dirección Administrativa de Ejecuciones Fiscales</div>
      <div class="dep">Secretaría de Recaudos y Pagos</div>
    </div>
    <div class="doc-title">Reporte de estado de notificación</div>
    <div class="doc-row"><span class="k">Ciudadano:</span><span>${esc(d.nombre)}</span></div>
    <div class="doc-row"><span class="k">Cédula / NIT:</span><span>${esc(d.cedula)}</span></div>
    <div class="doc-row"><span class="k">Comparendos:</span><span>${comps.length}</span></div>
  `;

  comps.forEach(c => {
    const evs = d.porComp[c] || [];
    html += `<div class="doc-comp"><h4>Comparendo: ${esc(c)}</h4>`;
    evs.forEach(f => { html += docEvidencia(f); });
    html += `</div>`;
  });

  html += `
    <div class="doc-foot">
      Documento informativo de uso interno generado por el Sistema Teodoro a partir
      de los registros de guías de notificación. No constituye certificación ni
      acto administrativo. La calificación jurídica de la debida notificación
      corresponde al funcionario competente.
    </div>`;

  document.getElementById("doc-content").innerHTML = html;
  document.getElementById("modal").classList.add("show");
}

function docEvidencia(f){
  const nombres = { aviso:"Aviso", correo_certificado:"Correo certificado", web:"Publicación web", personal:"Personal" };
  const canal = nombres[f.canal] || f.canal || "—";
  const datos = [];
  if(f.estado) datos.push("Estado: " + esc(f.estado));
  if(f.fecha_notificacion) datos.push("Fecha notificación: " + esc(fechaCO(f.fecha_notificacion)));
  if(f.num_guia) datos.push("Guía: " + esc(f.num_guia));
  if(f.tipo_notificacion) datos.push("Tipo: " + esc(f.tipo_notificacion));
  if(f.direccion) datos.push("Dirección: " + esc(f.direccion));
  if(f.municipio) datos.push("Municipio: " + esc(f.municipio));
  if(f.responsable) datos.push("Responsable: " + esc(f.responsable));
  if(f.radicado) datos.push("Radicado: " + esc(f.radicado));
  if(f.folio) datos.push("Folio: " + esc(f.folio));
  if(f.carpeta) datos.push("Carpeta: " + esc(f.carpeta));
  if(f.url_evidencia) datos.push("Publicación: " + esc(f.url_evidencia));
  return `<div class="doc-ev"><span class="canal">${canal}</span> — ${datos.join(" · ") || "Sin detalle registrado."}</div>`;
}

function cerrarModal(){
  document.getElementById("modal").classList.remove("show");
}

// ════════════════════════════════════════════════════════════
// INGRESO DE GUÍA (persona técnica)
// ════════════════════════════════════════════════════════════
function cambioCanal(){
  const canal = document.getElementById("f-canal").value;
  document.querySelectorAll(".canal-especifico").forEach(el => {
    el.classList.toggle("show", el.getAttribute("data-canal") === canal);
  });
}

function valOpt(id){ const v = (document.getElementById(id).value||"").trim(); return v || null; }

async function guardarGuia(){
  const canal = document.getElementById("f-canal").value;
  const cedula = (document.getElementById("f-cedula").value||"").replace(/\D/g,"");
  const comparendo = (document.getElementById("f-comparendo").value||"").trim().toUpperCase();

  // Validación de obligatorios
  if(!canal){ toast("Selecciona el canal.", true); return; }
  if(!cedula){ toast("Falta la cédula / NIT.", true); return; }
  if(!comparendo){ toast("Falta el comparendo.", true); return; }

  const reg = {
    canal,
    id_contribuyente: cedula,
    nombre: valOpt("f-nombre"),
    comparendo,
    radicado: valOpt("f-radicado"),
    num_guia: valOpt("f-guia"),
    fecha_notificacion: valOpt("f-fecha"),   // input type=date ya da YYYY-MM-DD
    estado: valOpt("f-estado"),
    direccion: valOpt("f-direccion"),
    municipio: valOpt("f-municipio"),
    origen: "manual",
    creado_por: valOpt("f-creadopor")
  };
  // Campos por canal
  if(canal === "aviso"){
    reg.responsable = valOpt("f-responsable");
    reg.folio = valOpt("f-folio");
    reg.carpeta = valOpt("f-carpeta");
    reg.tipo_notificacion = "Aviso";
  } else if(canal === "web"){
    reg.url_evidencia = valOpt("f-url");
    const v = (document.getElementById("f-valor").value||"").replace(/\D/g,"");
    reg.valor_multa = v ? parseInt(v,10) : null;
    reg.num_resolucion = valOpt("f-resolucion");
    reg.tipo_notificacion = "Web";
  }

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true; btn.textContent = "Guardando…";
  try{
    await Repo.insertar(reg);
    if(reg.creado_por) localStorage.setItem("teodoro_usuario", reg.creado_por);
    toast("✓ Guía guardada para el comparendo " + comparendo);
    limpiarForm();
  }catch(err){
    toast("No se pudo guardar. " + err.message, true);
  }finally{
    btn.disabled = false; btn.textContent = "💾 Guardar guía";
  }
}

function limpiarForm(){
  ["f-cedula","f-nombre","f-comparendo","f-radicado","f-guia","f-fecha",
   "f-direccion","f-municipio","f-responsable","f-folio","f-carpeta",
   "f-url","f-valor","f-resolucion"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
  document.getElementById("f-canal").value = "";
  document.getElementById("f-estado").value = "";
  cambioCanal();
  // NO se borra f-creadopor: queda persistido para los siguientes ingresos.
  document.getElementById("f-canal").focus();
}

// ════════════════════════════════════════════════════════════
// EVENTOS / ARRANQUE  (solo se ejecuta tras sesión válida)
// ════════════════════════════════════════════════════════════
function iniciarApp(){
  document.getElementById("q").addEventListener("keydown", e => { if(e.key==="Enter") buscar(); });
  document.getElementById("empty-state").style.display = "block";

  // Autocompletar nombre del operario desde localStorage
  document.getElementById("f-creadopor").value = localStorage.getItem("teodoro_usuario") || "";

  // Bloquear caracteres no numéricos en tiempo real (cédula y valor multa)
  ["f-cedula","f-valor"].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("input", () => {
      const limpio = el.value.replace(/\D/g, "");
      if(el.value !== limpio) el.value = limpio;
    });
  });

  document.getElementById("q").focus();
  document.addEventListener("keydown", e => { if(e.key==="Escape") cerrarModal(); });
}

// ════════════════════════════════════════════════════════════
// AUTENTICACIÓN — Supabase Auth (replicado de Tutelas / Acuerdos)
// Login unificado: mismo proyecto Supabase y mismo dominio, así que
// la sesión se comparte automáticamente con los demás módulos.
// (SUPABASE_URL y SUPABASE_ANON ya están declaradas arriba.)
// ════════════════════════════════════════════════════════════
let sbAuth = null;
try {
  if (window.supabase && window.supabase.createClient) {
    sbAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  } else {
    console.error("La librería de Supabase no cargó. Revisa la conexión.");
  }
} catch(e) {
  console.error("Error creando cliente Supabase Auth:", e);
}

async function hacerLogin(){
  if(!sbAuth){ mostrarLoginError("Error de conexión con el servidor. Recarga la página."); return; }
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-pass").value;
  const btn   = document.getElementById("login-btn");
  document.getElementById("login-error").style.display="none";
  if(!email || !pass){ mostrarLoginError("Ingresa correo y contraseña."); return; }
  btn.textContent="Ingresando..."; btn.style.pointerEvents="none";
  try{
    const { data, error } = await sbAuth.auth.signInWithPassword({ email, password: pass });
    if(error){ mostrarLoginError("Correo o contraseña incorrectos."); btn.textContent="Ingresar"; btn.style.pointerEvents="auto"; return; }
    entrarAlSistema();
  }catch(e){
    mostrarLoginError("Error de conexión. Intenta de nuevo.");
    btn.textContent="Ingresar"; btn.style.pointerEvents="auto";
  }
}
function mostrarLoginError(msg){
  const e=document.getElementById("login-error");
  e.textContent=msg; e.style.display="block";
}
function entrarAlSistema(){
  document.getElementById("login-screen").style.display="none";
  iniciarApp();
}
async function cerrarSesion(){
  if(sbAuth){ try{ await sbAuth.auth.signOut(); }catch(e){} }
  location.reload();
}
// Al arrancar: si ya hay sesión válida (p.ej. iniciada en otro módulo), entra directo.
(async function verificarSesionInicial(){
  if(!sbAuth) return; // sin librería, se queda en login
  try{
    const { data } = await sbAuth.auth.getSession();
    if(data.session){ entrarAlSistema(); }
  }catch(e){ /* sin sesión, muestra login */ }
})();
