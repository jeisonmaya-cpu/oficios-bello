// ════════════════════════════════════════
// CONFIG & STORAGE
// ════════════════════════════════════════
const CK = 'desembargos_cfg_v1';
// Clave de localStorage para la plantilla .docx (declarada arriba para evitar
// el temporal dead zone: cargarConfigPanel() la usa al arrancar iniciarApp()).
const TMPL_KEY = 'desembargo_tmpl_b64_v1';
let cfg = {};
let cache = [];
let charts = {};

// ════════════════════════════════════════
// SUPABASE — capa de datos (reemplaza GAS)
// ════════════════════════════════════════
const SUPA_URL = 'https://bmurdtfztsltcgwsfbgf.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdXJkdGZ6dHNsdGNnd3NmYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjU2NzYsImV4cCI6MjA5NjcwMTY3Nn0.2Md6ymram4kv82Lirk2ICl9ZOXUsI5Gve02q7FUCHvs';
const SUPA_TABLE = 'desembargos';
const SUPA_VIEW  = 'v_desembargos';

// ════════════════════════════════════════
// AUTENTICACIÓN — Supabase Auth (replicado de Tutelas / Acuerdos / Buscador)
// Login unificado: mismo proyecto Supabase y mismo dominio, la sesión se
// comparte con los demás módulos. (SUPA_URL y SUPA_KEY ya están declaradas.)
// ════════════════════════════════════════
let sbAuth = null;
try {
  if (window.supabase && window.supabase.createClient) {
    sbAuth = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  } else {
    console.error('La librería de Supabase no cargó. Revisa la conexión.');
  }
} catch(e) {
  console.error('Error creando cliente Supabase Auth:', e);
}
async function cerrarSesion(){
  if(sbAuth){ try{ await sbAuth.auth.signOut(); }catch(e){} }
  location.reload();
}

// Helper REST estándar (mismo patrón que los demás módulos)
async function supaFetch(path, opts){
  opts = opts || {};
  const headers = Object.assign({
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json'
  }, opts.headers || {});
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, Object.assign({}, opts, {headers}));
  if(!res.ok){
    let msg = 'HTTP ' + res.status;
    try { const j = await res.json(); if(j && j.message) msg = j.message; } catch(e){}
    throw new Error(msg);
  }
  // 204 No Content (típico en PATCH sin return) → devolver array vacío
  if(res.status === 204) return [];
  const txt = await res.text();
  if(!txt) return [];
  try { return JSON.parse(txt); } catch(e){ return []; }
}

// dedup_key: mismo cálculo que la migración (cedula|tipo|fecha_oficio|radicado → md5)
// MD5 mínimo en JS (suficiente para hash de deduplicación, no para seguridad)
function md5(str){
  function rl(n,c){return(n<<c)|(n>>>(32-c));}
  function au(x,y){var l=(x&0xFFFF)+(y&0xFFFF),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF);}
  function ff(a,b,c,d,x,s,t){return au(rl(au(au(a,(b&c)|(~b&d)),au(x,t)),s),b);}
  function gg(a,b,c,d,x,s,t){return au(rl(au(au(a,(b&d)|(c&~d)),au(x,t)),s),b);}
  function hh(a,b,c,d,x,s,t){return au(rl(au(au(a,b^c^d),au(x,t)),s),b);}
  function ii(a,b,c,d,x,s,t){return au(rl(au(au(a,c^(b|~d)),au(x,t)),s),b);}
  function tb(s){var n=s.length,w=[];for(var i=0;i<n*8;i+=8)w[i>>5]|=(s.charCodeAt(i/8)&0xFF)<<(i%32);return w;}
  function bh(w){var h='';for(var i=0;i<w.length*4;i++)h+=((w[i>>2]>>((i%4)*8+4))&0xF).toString(16)+((w[i>>2]>>((i%4)*8))&0xF).toString(16);return h;}
  function utf8(s){return unescape(encodeURIComponent(s));}
  var x=tb(utf8(str)),len=utf8(str).length*8;
  x[len>>5]|=0x80<<(len%32);x[(((len+64)>>>9)<<4)+14]=len;
  var a=1732584193,b=-271733879,c=-1732584194,d=271733878;
  for(var i=0;i<x.length;i+=16){
    var oa=a,ob=b,oc=c,od=d;
    a=ff(a,b,c,d,x[i],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
    a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
    a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
    a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
    a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i],20,-373897302);
    a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
    a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
    a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
    a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
    a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
    a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
    a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
    a=ii(a,b,c,d,x[i],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
    a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
    a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
    a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
    a=au(a,oa);b=au(b,ob);c=au(c,oc);d=au(d,od);
  }
  return bh([a,b,c,d]);
}
function dedupKey(d){
  const fo = (d.fecha||'').trim();           // ya viene ISO del input date
  const raw = (d.cedula||'')+'|'+(d.tipoOficio||'')+'|'+fo+'|'+(d.radicado||'');
  return md5(raw);
}

// Mapea una fila de v_desembargos (snake_case) a las claves que el frontend ya usa
function mapSupaRow(row){
  return {
    'ID':           String(row.id),
    'id':           String(row.id),
    'Estado':       row.estado || 'GENERADO',
    'Tipo Oficio':  row.tipo_oficio || '',
    'N° Oficio':    row.num_oficio || '',
    'Fecha Oficio': row.fecha_oficio || '',
    'Fecha':        row.fecha_creado_local || '',
    'Hora':         row.hora_creado_local || '',
    'Contribuyente':row.contribuyente || '',
    'Cédula/NIT':   row.cedula_nit || '',
    'Concepto':     row.concepto || '',
    'Radicado':     row.radicado || '',
    'Fecha Auto':   row.fecha_auto || '',
    'Motivo':       row.motivo || '',
    'Proyectó':     row.proyecto || '',
    'Funcionario':  row.funcionario || '',
    'Equipo':       row.equipo || '',
    'Observación':  row.observacion || '',
    'Celular':      row.celular || '',
    'Correo':       row.correo || ''
  };
}

// Convierte los datos del form (getDatos) a fila para INSERT en Supabase
function datosToRow(d, estado){
  return {
    estado:        estado || 'GENERADO',
    tipo_oficio:   d.tipoOficio || null,
    num_oficio:    d.numOficio || '1070.02',
    fecha_oficio:  d.fecha || null,
    contribuyente: d.nombre || null,
    cedula_nit:    d.cedula || null,
    concepto:      d.concepto || null,
    radicado:      d.radicado || null,
    fecha_auto:    d.fechaAuto || null,
    motivo:        d.motivo || null,
    proyecto:      d.proyNombre || null,
    funcionario:   d.funcionario || null,
    equipo:        d.equipo || null,
    observacion:   d.obs || null,
    celular:       d.celular || null,
    correo:        d.correo || null,
    dedup_key:     dedupKey(d) + '-' + Date.now().toString(36)  // único por envío; ver nota
  };
}

// ── Cola de reintentos (fire-and-forget, patrón Teodoro) ──
const RETRY_KEY = 'desembargos_retry_v1';
function encolarReintento(row){
  try{
    const q = JSON.parse(localStorage.getItem(RETRY_KEY)||'[]');
    q.push({row, ts: Date.now()});
    localStorage.setItem(RETRY_KEY, JSON.stringify(q.slice(-100)));
  }catch(e){}
}
async function procesarReintentos(){
  let q;
  try{ q = JSON.parse(localStorage.getItem(RETRY_KEY)||'[]'); }catch(e){ return; }
  if(!q.length) return;
  const quedan = [];
  for(const item of q){
    try{
      await supaFetch(SUPA_TABLE, {
        method:'POST',
        headers:{'Prefer':'resolution=ignore-duplicates,return=minimal'},
        body: JSON.stringify(item.row)
      });
    }catch(e){ quedan.push(item); }
  }
  localStorage.setItem(RETRY_KEY, JSON.stringify(quedan));
  if(q.length && !quedan.length){ toastD('✅ Pendientes sincronizados'); cargarRemoto(); cargarCola(); }
}
setInterval(procesarReintentos, 30000);
window.addEventListener('online', procesarReintentos);
let filActual = [];
let pagActual = 1;
const POR_PAG = 20;
let motivoSeleccionado = '';
let B64 = null; // plantilla docx

// ── Utils (definidas temprano para que init pueda usarlas) ──
function b64ToU8(b){const bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
function esc(t){return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function xmlEsc(t){return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtL(iso){if(!iso)return'';const[y,m,d]=iso.split('-');const M=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];return`${parseInt(d)} de ${M[parseInt(m)-1]} de ${y}`;}
function fmtC(iso){if(!iso)return'';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
function hoyISO(){return new Date().toISOString().split('T')[0];}
function hoyDDMMYYYY(){const d=new Date();const p=n=>String(n).padStart(2,'0');return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();}
function hoyLocal(){return new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'});}
// Sello de impresión: fecha + hora del momento de generación del Word.
// Sirve para identificar cada oficio impreso cuando se generan varios a la vez.
function selloGen(){
  const f=new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'});
  const h=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  return f+' '+h;
}

// ── Toast ──
function toastD(msg, color){
  var t=document.getElementById('toastD');
  if(!t)return;
  t.textContent=msg||'✓ Listo';
  t.style.background=color||'rgba(22,163,74,.95)';
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); },2500);
}

// ── Contador de oficios del día ──
var CONT_KEY_D = 'desembargos_cont_dia';
function cargarContadorD(){
  try{
    var hoy=hoyISO();
    var d=JSON.parse(localStorage.getItem(CONT_KEY_D)||'null');
    return (d&&d.fecha===hoy)?d.count:0;
  }catch(e){return 0;}
}
function incrementarContadorD(){
  try{
    var hoy=hoyISO();
    var d=JSON.parse(localStorage.getItem(CONT_KEY_D)||'null');
    if(!d||d.fecha!==hoy) d={fecha:hoy,count:0};
    d.count++;
    localStorage.setItem(CONT_KEY_D,JSON.stringify(d));
    actualizarContadorDUI(d.count);
  }catch(e){}
}
function actualizarContadorDUI(n){
  var chip=document.getElementById('bannerContador');
  var num =document.getElementById('bannerContNum');
  if(!chip||!num)return;
  num.textContent=n;
  chip.style.display=n>0?'flex':'none';
  num.style.transform='scale(1.3)';
  num.style.color='#fcd34d';
  setTimeout(function(){ num.style.transform='scale(1)'; num.style.color=''; num.style.transition='all .3s'; },300);
}

// ── Último oficio ──
var _ultimoOficio = null;
function guardarUltimo(d){
  _ultimoOficio = d;
  var el=document.getElementById('ultimoOficio');
  var dt=document.getElementById('ultimoOficioData');
  if(!el||!dt)return;
  dt.textContent = d.nombre + ' · ' + d.cedula + (d.concepto?' · '+d.concepto.slice(0,30):'');
  el.style.display='flex';
  el.style.alignItems='center';
}
function reusarUltimo(){
  if(!_ultimoOficio)return;
  var d=_ultimoOficio;
  var fn=document.getElementById('f_nombre');
  var fc=document.getElementById('f_cedula');
  var fo=document.getElementById('f_obs');
  if(fn) fn.value=d.nombre||'';
  if(fc) fc.value=d.cedula||'';
  if(fo) fo.value=d.obs||'';
  // No rellena concepto/radicado — cada oficio puede tener uno diferente
  checkDup(d.nombre||'');
  toastD('↩️ Datos del último oficio cargados');
  document.getElementById('f_concepto').focus();
}

// ── Autocomplete por cédula ──
function onCedulaInput(val){
  var limpio = val.replace(/[.\-\s]/g,'');
  if(limpio !== val){
    var el=document.getElementById('f_cedula');
    if(el){ el.value=limpio; val=limpio; }
  }
  var ac=document.getElementById('ac_cedula');
  if(!ac) return;
  if(val.length < 3){ ac.style.display='none'; return; }
  var encontrados = cache.filter(function(r){
    return (r['Cédula/NIT']||'').replace(/[.\-\s]/g,'').startsWith(val);
  }).slice(0,5);
  if(!encontrados.length){ ac.style.display='none'; return; }
  ac.innerHTML = encontrados.map(function(r){
    var nom = r['Contribuyente']||'';
    var ced = r['Cédula/NIT']||'';
    var tip = (r['Tipo Oficio']||'').split(' ')[0];
    return '<div class="ac-item" data-nombre="'+nom.replace(/"/g,'&quot;')+'" data-cedula="'+ced+'">'
      +'<div><div class="ac-item-name">'+nom+'</div>'
      +'<div class="ac-item-ced">'+ced+'</div></div>'
      +'<span class="ac-item-tipo">'+tip+'</span>'
      +'</div>';
  }).join('');
  ac.querySelectorAll('.ac-item').forEach(function(item){
    item.addEventListener('click', function(){
      seleccionarAC(item.dataset.nombre, item.dataset.cedula);
    });
  });
  ac.style.display='block';
}
function seleccionarAC(nombre, cedula){
  var fn=document.getElementById('f_nombre');
  var fc=document.getElementById('f_cedula');
  var ac=document.getElementById('ac_cedula');
  if(fn) fn.value=nombre;
  if(fc) fc.value=cedula;
  if(ac) ac.style.display='none';
  checkDup(nombre);
  toastD('✓ Datos cargados desde historial');
  setTimeout(function(){ document.getElementById('f_fauto').focus(); },100);
}
document.addEventListener('click',function(e){
  var ac=document.getElementById('ac_cedula');
  if(ac&&!ac.contains(e.target)&&e.target.id!=='f_cedula') ac.style.display='none';
});
;
function dlBlob(blob,nom){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=nom;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}

function loadCfg(){ try{ cfg=JSON.parse(localStorage.getItem(CK)||'{}'); }catch{ cfg={}; } }
function saveCfg(){ localStorage.setItem(CK,JSON.stringify(cfg)); }

// ════════════════════════════════════════
// WIZARD — con Teodoro y URL predeterminada
// ════════════════════════════════════════
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwnmNbavbRApQdq31Mpl0paOBKoau2iBr6YQx0vPZGG4euv2QDgcAXijsytGu8U2g8p3g/exec';

// Frases que Teodoro dice cuando escribes tu nombre
const FRASES_TEO_WIZ = [
  (n)=>`¡Qué bueno verte, ${n}! 😊`,
  (n)=>`Listo ${n}, ¡a trabajar!`,
  (n)=>`Bienvenido, ${n} 🤝`,
  (n)=>`${n}, Teodoro a tu servicio`,
  (n)=>`¡Hola ${n}! Todo listo 🚀`,
];
function onWizNombre(val){
  const bubble=document.getElementById('wizBubble');
  if(!bubble)return;
  const nombre=val.trim().split(' ')[0];
  if(nombre.length>=2){
    const fn=FRASES_TEO_WIZ[Math.floor(Math.random()*FRASES_TEO_WIZ.length)];
    bubble.innerHTML=fn(nombre);
    bubble.style.borderColor='rgba(34,197,94,.4)';
    bubble.style.background='rgba(34,197,94,.1)';
    bubble.style.color='#86efac';
  } else {
    bubble.innerHTML='¡Hola! Soy <strong>Teodoro</strong> 👋<br>¿Con quién tengo el gusto?';
    bubble.style.borderColor='rgba(232,160,32,.3)';
    bubble.style.background='rgba(232,160,32,.12)';
    bubble.style.color='var(--gold2)';
  }
}
function sacudirWizRobot(){
  const r=document.getElementById('wizRobot');
  if(!r)return;
  const frases=['⚡ ¡Beep boop!','🔧 Sistemas OK','📂 Listo para trabajar','💡 ¡Teodoro activo!'];
  const b=document.getElementById('wizBubble');
  if(b){ b.innerHTML=frases[Math.floor(Math.random()*frases.length)]; }
  r.classList.remove('shake');
  void r.offsetWidth;
  r.classList.add('shake');
}

async function conectar(){
  const nom = document.getElementById('wNombre').value.trim();
  const eq  = document.getElementById('wEquipo').value.trim();
  const email = document.getElementById('wCorreo').value.trim();
  const pass  = document.getElementById('wPass').value;
  // 1) Validar nombre (necesario para los oficios)
  if(!nom){
    sacudirWizRobot();
    const b = document.getElementById('wizBubble');
    if(b){
      b.innerHTML = 'Espera, necesito tu nombre 😅';
      b.style.borderColor = 'rgba(239,68,68,.4)';
      b.style.color = '#fca5a5';
      b.style.background = 'rgba(239,68,68,.1)';
    }
    return;
  }
  // 2) Validar credenciales presentes
  if(!email || !pass){
    wizAlert('e', 'Ingresa tu correo y contraseña.');
    return;
  }
  if(!sbAuth){
    wizAlert('e', 'Error de conexión con el servidor. Recarga la página.');
    return;
  }
  const btn = document.getElementById('btnConectar');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Entrando…'; }
  // 3) Login de Supabase
  try{
    const { error } = await sbAuth.auth.signInWithPassword({ email, password: pass });
    if(error){
      wizAlert('e', 'Correo o contraseña incorrectos.');
      if(btn){ btn.disabled = false; btn.innerHTML = '🚀 ¡Entrar con Teodoro!'; }
      return;
    }
  }catch(e){
    wizAlert('e', 'Error de conexión. Intenta de nuevo.');
    if(btn){ btn.disabled = false; btn.innerHTML = '🚀 ¡Entrar con Teodoro!'; }
    return;
  }
  // 4) Sesión OK — guardar identidad para los oficios y entrar
  cfg = { apiUrl: DEFAULT_URL, nombre: nom, equipo: eq };
  saveCfg();
  document.getElementById('wizOverlay').style.display = 'none';
  if(btn){ btn.disabled = false; btn.innerHTML = '🚀 ¡Entrar con Teodoro!'; }
  iniciarApp();
}
// (saltarConfig eliminado: el login es obligatorio, no hay atajo sin sesión)
function reabrirWizard(){
  document.getElementById('wizOverlay').style.display='flex';
  document.getElementById('btnConectar').disabled=false;
}
function wizAlert(t,m){
  const el=document.getElementById('wizAlert');
  if(!el)return;
  el.className='wiz-alert-box show alert-'+(t==='s'?'s':t==='e'?'e':'w');
  const spans=el.querySelectorAll('span');
  if(spans[0]) spans[0].textContent=t==='s'?'✅':t==='e'?'❌':'⏳';
  if(spans[1]) spans[1].textContent=m;
}
async function ping(url){
  try{ await fetch(url+'?accion=ping',{mode:'no-cors'}); return true; }catch(e){ return false; }
}

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
try { loadCfg(); } catch(e){ cfg = {}; }
if(!cfg.apiUrl) cfg.apiUrl = DEFAULT_URL;

// Fechas por defecto
try {
  var _ff = document.getElementById('f_fecha');
  var _fp = document.getElementById('f_proyf');
  if(_ff) _ff.value = hoyISO();
  if(_fp) _fp.value = hoyISO();
  // Fecha del auto: autollenar con hoy en formato dd/mm/yyyy, pero editable
  var _fa = document.getElementById('f_fauto');
  if(_fa && !_fa.value) _fa.value = hoyDDMMYYYY();
} catch(e){}

// Entrada con Enter en los campos del wizard la gestiona el HTML (onkeydown).

// Decidir si mostrar wizard o entrar directo.
// Requiere AMBOS: sesión de Supabase válida + nombre guardado (para los oficios).
(async function decidirArranque(){
  let haySesion = false;
  if(sbAuth){
    try{
      const { data } = await sbAuth.auth.getSession();
      haySesion = !!(data && data.session);
    }catch(e){ haySesion = false; }
  }
  if(haySesion && cfg.nombre){
    // Sesión activa (p.ej. iniciada en otro módulo) y nombre conocido — entrar directo
    try { iniciarApp(); } catch(e){ console.error('Error en iniciarApp:', e); }
  } else {
    // Falta sesión o nombre — mostrar el wizard (login + identidad)
    // Si ya hay sesión pero no nombre, precargar correo no aplica; pedimos datos.
    var _ov = document.getElementById('wizOverlay');
    if(_ov) _ov.classList.add('visible');
  }
})();

function iniciarApp(){
  actualizarBanner();
  cargarConfigPanel();
  cargarConceptos();   // conceptos dinámicos desde Supabase (con fallback offline)
  // Mostrar estado inmediato desde cache local si existe
  const lc = JSON.parse(localStorage.getItem('desembargos_local_cache')||'[]');
  if(lc.length){
    cache = lc;
    setSS('ok', 'Cache local · '+lc.length+' registros');
    document.getElementById('badgeCnt').textContent = lc.length;
  } else {
    setSS('spin','Conectando…');
  }
  cargarRemoto();
}

// ════════════════════════════════════════
// NAV
// ════════════════════════════════════════
function goPanel(n){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');});
  document.getElementById('panel-'+n).classList.add('active');
  const idx={form:0,cola:1,historial:2,registro:3,dashboard:4,config:5}[n];
  if(idx!==undefined){
    const btn=document.querySelectorAll('.nav-tab')[idx];
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
  }
  if(n==='registro')  cargarRemoto();
  if(n==='dashboard') renderDash();
  if(n==='cola')      cargarCola();
}

// ════════════════════════════════════════
// SYNC STATUS
// ════════════════════════════════════════
function setSS(s,t){
  const d=document.getElementById('sdot');
  d.className='sync-dot'+(s==='ok'?'':s==='spin'?' spin':' off');
  document.getElementById('slbl').textContent=t;
}

// ════════════════════════════════════════
// BANNER
// ════════════════════════════════════════
function actualizarBanner(){
  document.getElementById('bannerNombre').textContent=cfg.nombre||'Sin configurar';
  const eq=document.getElementById('bannerEquipo');
  if(eq) eq.textContent=cfg.equipo?'— '+cfg.equipo:'';
  const proyn=document.getElementById('f_proyn');
  if(proyn&&!proyn.value) proyn.value=cfg.nombre||'';
  actualizarContadorDUI(cargarContadorD());
}

// ════════════════════════════════════════
// API
// ════════════════════════════════════════
// apiPost: capa de compatibilidad. Recibe el mismo {accion, ...campos} que
// usaba el GAS y lo traduce a operaciones REST de Supabase. Mantiene el
// contrato de retorno {ok:true/false} que espera el resto del módulo.
async function apiPost(data){
  const accion = data.accion;
  try{
    if(accion==='guardar' || accion==='encolar'){
      const d = {
        tipoOficio: data.tipoOficio, numOficio: data.numOficio,
        fecha: data.fechaOficio, nombre: data.nombre, cedula: data.cedula,
        concepto: data.concepto, radicado: data.radicado,
        fechaAuto: data.fechaAuto, motivo: data.motivo,
        proyNombre: data.proyNombre, funcionario: data.funcionario,
        equipo: data.equipo, obs: data.observacion || data.obs || null,
        celular: data.celular || null, correo: data.correo || null
      };
      const estado = (accion==='encolar') ? 'PENDIENTE' : 'GENERADO';
      const row = datosToRow(d, estado);
      try{
        await supaFetch(SUPA_TABLE, {
          method:'POST',
          headers:{'Prefer':'resolution=ignore-duplicates,return=minimal'},
          body: JSON.stringify(row)
        });
        return {ok:true};
      }catch(e){
        // Sin conexión → a la cola de reintentos
        encolarReintento(row);
        return {ok:false, queued:true, error:e.message};
      }
    }
    if(accion==='marcar_impreso'){
      const ids = data.ids || (data.id ? [data.id] : []);
      for(const id of ids){
        await supaFetch(SUPA_TABLE+'?id=eq.'+encodeURIComponent(id), {
          method:'PATCH',
          headers:{'Prefer':'return=minimal'},
          body: JSON.stringify({estado:'IMPRESO', impreso_en:new Date().toISOString()})
        });
      }
      return {ok:true};
    }
    if(accion==='eliminar_cola'){
      // No borramos el registro: lo sacamos de PENDIENTE marcándolo CANCELADO.
      // (Si prefieres borrado real, cambia a method:'DELETE'.)
      await supaFetch(SUPA_TABLE+'?id=eq.'+encodeURIComponent(data.id), {
        method:'PATCH',
        headers:{'Prefer':'return=minimal'},
        body: JSON.stringify({estado:'GENERADO'})
      });
      return {ok:true};
    }
    return {ok:false, error:'acción no soportada: '+accion};
  }catch(e){
    return {ok:false, error:e.message};
  }
}
async function cargarRemoto(){
  setSS('spin','Sincronizando…');
  document.getElementById('badgeCnt').textContent='…';
  // Mostrar caché local mientras llega Supabase
  const localCache=JSON.parse(localStorage.getItem('desembargos_local_cache')||'[]');
  if(localCache.length){ cache=localCache; renderRegistro(); actualizarStatsReg(); }
  // Registro = oficios GENERADO o IMPRESO (los PENDIENTE viven en la Cola)
  const query='v_desembargos?select=*&estado=in.(GENERADO,IMPRESO)&order=creado_en.desc';
  try{
    const rows=await supaFetch(query);
    cache=rows.map(mapSupaRow);
    // Persistir caché para arranque offline
    localStorage.setItem('desembargos_local_cache', JSON.stringify(cache.slice(0,500)));
    setSS('ok','Sincronizado '+new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}));
    document.getElementById('badgeCnt').textContent=cache.length;
    renderRegistro(); actualizarStatsReg();
    // Aprovechar para reintentar pendientes en cola offline
    procesarReintentos();
  }catch(err){
    setSS('off','Sin conexión');
    if(cache.length){
      document.getElementById('badgeCnt').textContent=cache.length;
      renderRegistro(); actualizarStatsReg();
    }
  }
}
function guardarLocalCache(d){
  const lc=JSON.parse(localStorage.getItem('desembargos_local_cache')||'[]');
  lc.unshift({...d,_local:true});
  localStorage.setItem('desembargos_local_cache',JSON.stringify(lc.slice(0,200)));
}

// ════════════════════════════════════════
// UTILS
// ════════════════════════════════════════

function showAlert(id,t,m){
  const el=document.getElementById(id);
  if(!el)return;
  el.className='alert show alert-'+(t==='s'?'s':t==='e'?'e':'w');
  const s=el.querySelectorAll('span');
  if(s[0]) s[0].textContent=t==='s'?'✅':t==='e'?'❌':'⚠️';
  if(s[1]) s[1].textContent=m;
}
function hideAlert(id){const el=document.getElementById(id);if(el)el.className='alert';}

// ════════════════════════════════════════
// TIPO SELECTOR
// ════════════════════════════════════════
function selTipo(btn){
  document.querySelectorAll('.tipo-btn').forEach(b=>b.classList.remove('active','blue','green','red'));
  btn.classList.add('active');
  const t=btn.dataset.tipo;
  if(t.startsWith('Desembargo')) btn.classList.add('green');
  else if(t.startsWith('Embargo')) btn.classList.add('red');
  else btn.classList.add('blue');
  // Al seleccionar tipo, enfocar nombre automáticamente
  setTimeout(function(){ var n=document.getElementById('f_nombre'); if(n) n.focus(); },80);
}
function getTipo(){
  const a=document.querySelector('.tipo-btn.active');
  return a?a.dataset.tipo:'Desembargo Banco';
}

// ════════════════════════════════════════
// MOTIVO
// ════════════════════════════════════════
function selMotivo(pill,valor){
  document.querySelectorAll('.motivo-pill').forEach(p=>p.classList.remove('active'));
  pill.classList.add('active');
  motivoSeleccionado=valor;
  const manual=document.getElementById('f_motivo_manual');
  if(valor==='OTRO'){
    manual.style.display='block'; manual.focus(); motivoSeleccionado='';
  } else {
    manual.style.display='none';
  }
}
function getMotivoReal(){
  const manual=document.getElementById('f_motivo_manual');
  if(manual&&manual.style.display!=='none') return manual.value.trim();
  return motivoSeleccionado;
}

// ════════════════════════════════════════
// CONCEPTOS → BANCOS
// CONCEPTOS se llena desde Supabase al iniciar (cargarConceptos()).
// CONCEPTOS_FALLBACK es el respaldo offline si Supabase no responde.
// ════════════════════════════════════════
let CONCEPTOS = {};
const CONCEPTOS_FALLBACK = {
  "EMBARGO ACUERDOS DE PAGO 2023 TRANSITO": {
    "AV VILLAS":"20252034906","BANCOLOMBIA":"20252034907","BANCOOMEVA":"20252034909",
    "BBVA":"20252034911","BOGOTA":"20252034912","CAJA SOCIAL":"20252034913",
    "DAVIVIENDA":"20252034916","FALABELLA":"20252034917","POPULAR":"20252034918"
  },
  "EMBARGO AP 2016-2019 PREDIAL": {
    "AV VILLAS":"20242036100","BANCA MIA":"20242036081","BANCOLOMBIA":"20242036091",
    "BANCOOMEVA":"20242036087","BBVA":"20242036088","BOGOTA":"2024203089",
    "CAJA SOCIAL":"20242036099","DAVIVIENDA":"20242036080",
    "FALABELLA":"20242036082","POPULAR":"20242036086"
  },
  "EMBARGO AP 2020-2024 PREDIAL": {
    "AV VILLAS":"20252012923","BANCOLOMBIA":"20252012926","BANCOOMEVA":"20262012924",
    "BBVA":"20252012927","BOGOTA":"20252012925","CAJA SOCIAL":"20252012928",
    "COTRAFA":"20252012929","DAVIVIENDA":"20252012930",
    "NEQUI":"20252012938","POPULAR":"20252012937"
  },
  "EMBARGO ICA 2": {
    "AV VILLAS":"20242088853","BANCOOMEVA":"20242088860","BBVA":"20242088864",
    "BOGOTA":"20242088865","CAJA SOCIAL":"20242088866","DAVIVIENDA":"20242088873",
    "FALABELLA":"20242088879","POPULAR":"20242088881"
  },
  "EMBARGO ICA 2024": {
    "AV VILLAS":"20242029991","BANCA MIA":"20242030001","BANCOLOMBIA":"20242029993",
    "BANCOOMEVA":"20242030005","BBVA":"20242099997","BOGOTA":"20242029994",
    "CAJA SOCIAL":"20242029999","COTRAFA":"20242030008","DAVIVIENDA":"20242030006",
    "FALABELLA":"20242030002","POPULAR":"20242030007"
  },
  "EMBARGO 2019 Y 2020 TRANSITO": {
    "AV VILLAS":"20252046360","BANCOLOMBIA (1)":"20252046375","BANCOLOMBIA (2)":"20252046371",
    "BANCOOMEVA":"20252046375","BBVA":"20252046449","BOGOTA":"20252046477",
    "CAJA SOCIAL":"20252046494","COTRAFA":"20252046503",
    "DAVIVIENDA":"20252046499","POPULAR":"20242046507"
  },
  "EMBARGO 2022 TRANSITO": {
    "AV VILLAS":"20242077888","BANCOLOMBIA":"20242077889","BANCOOMEVA":"20242077890",
    "BBVA":"20242077891","BOGOTA":"20242077892","CAJA SOCIAL":"20242077893",
    "COTRAFA":"20242077894","DAVIVIENDA":"20242077895",
    "FALABELLA":"20242077896","POPULAR":"20242077898"
  },
  "EMBARGO POLICIA 2024": {
    "AV VILLAS":"20242112568","BANCA MIA":"2024212569","BANCOLOMBIA":"2024212570",
    "BANCOOMEVA":"2024212572","BBVA":"20242112576","BOGOTA":"20242112577",
    "CAJA SOCIAL":"20242112578","COTRAFA":"20242112579","DAVIVIENDA":"20242112580",
    "FALABELLA":"20242112581","POPULAR":"20242112583"
  },
  "EMBARGO PREDIAL MODULO": {
    "AV VILLAS":"20242136740","BANCA MIA":"20242136743","BANCOLOMBIA":"20242136745",
    "BANCOOMEVA":"20242136746","BBVA":"20242136747","BOGOTA":"20242136748",
    "CAJA SOCIAL":"2024213744","COTRAFA":"20242136752","DAVIVIENDA":"20242136753",
    "FALABELLA":"20242136758","NEQUI":"20242136759","POPULAR":"20242136760"
  },
  "EMBARGO TRANSITO 2023": {
    "TODOS LOS BANCOS":"20252196416"
  }
};

// ════════════════════════════════════════
// CONCEPTOS DINÁMICOS — carga desde Supabase + alta con bancos
// ════════════════════════════════════════
async function cargarConceptos(){
  try{
    // Trae conceptos activos y sus bancos en dos consultas REST
    const cab = await supaFetch('conceptos_desembargo?select=concepto&activo=eq.true&order=concepto.asc');
    const det = await supaFetch('conceptos_bancos?select=concepto,banco,radicado&order=banco.asc');
    if(!Array.isArray(cab) || !cab.length) throw new Error('sin conceptos');
    // Reconstruir el objeto CONCEPTOS { concepto: { banco: radicado } }
    const nuevo = {};
    cab.forEach(c => { nuevo[c.concepto] = {}; });
    (det||[]).forEach(b => {
      if(!nuevo[b.concepto]) nuevo[b.concepto] = {};
      nuevo[b.concepto][b.banco] = String(b.radicado);
    });
    CONCEPTOS = nuevo;
  }catch(e){
    // Sin conexión o error → usar respaldo offline para no quedar sin conceptos
    console.warn('No se pudieron cargar conceptos de Supabase, usando respaldo:', e.message);
    CONCEPTOS = JSON.parse(JSON.stringify(CONCEPTOS_FALLBACK));
  }
  renderSelectConceptos();
}

function renderSelectConceptos(){
  const sel = document.getElementById('f_concepto');
  if(!sel) return;
  const actual = sel.value; // preservar selección si existe
  const nombres = Object.keys(CONCEPTOS).sort((a,b)=>a.localeCompare(b,'es'));
  let html = '<option value="">— Seleccione concepto —</option>';
  html += nombres.map(n => `<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join('');
  html += '<option value="OTRO">✏️ Otro (digitar manualmente)</option>';
  sel.innerHTML = html;
  if(actual && (CONCEPTOS[actual] || actual==='OTRO')) sel.value = actual;
}

// ── Modal: agregar concepto nuevo con sus bancos ──
function abrirModalConcepto(){
  const ov = document.getElementById('conceptoModal');
  if(ov){ ov.classList.add('visible'); ov.style.display='flex'; }
  document.getElementById('mc_nombre').value='';
  const tb = document.getElementById('mc_bancos');
  tb.innerHTML='';
  agregarFilaBanco(); // arranca con una fila
  document.getElementById('mc_alert').className='wiz-alert-box alert-w';
  document.getElementById('mc_nombre').focus();
}
function cerrarModalConcepto(){
  const ov = document.getElementById('conceptoModal');
  if(ov){ ov.classList.remove('visible'); ov.style.display='none'; }
}
function agregarFilaBanco(){
  const tb = document.getElementById('mc_bancos');
  const div = document.createElement('div');
  div.className = 'mc-fila';
  div.innerHTML = `
    <input type="text" class="mc-banco" placeholder="Banco (ej. BANCOLOMBIA)">
    <input type="text" class="mc-rad" placeholder="Radicado" inputmode="numeric">
    <button type="button" class="mc-del" onclick="this.parentElement.remove()" title="Quitar">✕</button>`;
  tb.appendChild(div);
}
function mcAlert(tipo,msg){
  const el = document.getElementById('mc_alert');
  el.className = 'wiz-alert-box show alert-'+(tipo==='s'?'s':tipo==='e'?'e':'w');
  const spans = el.querySelectorAll('span');
  if(spans[0]) spans[0].textContent = tipo==='s'?'✅':tipo==='e'?'❌':'⏳';
  if(spans[1]) spans[1].textContent = msg;
}
async function guardarConceptoNuevo(){
  const nombre = document.getElementById('mc_nombre').value.trim().toUpperCase();
  if(!nombre){ mcAlert('e','Escribe el nombre del concepto.'); return; }
  if(CONCEPTOS[nombre]){ mcAlert('e','Ese concepto ya existe.'); return; }
  // Recoger bancos
  const filas = [...document.querySelectorAll('#mc_bancos .mc-fila')];
  const bancos = [];
  for(const f of filas){
    const banco = f.querySelector('.mc-banco').value.trim().toUpperCase();
    const rad   = f.querySelector('.mc-rad').value.trim();
    if(!banco && !rad) continue;            // fila vacía: ignorar
    if(!banco || !rad){ mcAlert('e','Completa banco y radicado, o deja la fila vacía.'); return; }
    bancos.push({ banco, radicado: rad });
  }
  if(!bancos.length){ mcAlert('e','Agrega al menos un banco con su radicado.'); return; }
  const btn = document.getElementById('mc_guardar');
  btn.disabled = true; btn.textContent = '⏳ Guardando…';
  try{
    // 1) Insertar cabecera
    await supaFetch('conceptos_desembargo', {
      method:'POST',
      headers:{ 'Prefer':'return=minimal' },
      body: JSON.stringify({ concepto: nombre, creado_por: (cfg && cfg.nombre) || null })
    });
    // 2) Insertar bancos
    await supaFetch('conceptos_bancos', {
      method:'POST',
      headers:{ 'Prefer':'return=minimal' },
      body: JSON.stringify(bancos.map(b => ({ concepto: nombre, banco: b.banco, radicado: b.radicado })))
    });
    // 3) Recargar selector y seleccionar el nuevo
    await cargarConceptos();
    const sel = document.getElementById('f_concepto');
    sel.value = nombre;
    onConceptoChange();
    cerrarModalConcepto();
  }catch(e){
    mcAlert('e','No se pudo guardar: '+(e.message||'error'));
  }finally{
    btn.disabled = false; btn.textContent = '💾 Guardar concepto';
  }
}

function onConceptoChange(){
  const concepto=document.getElementById('f_concepto').value;
  const grpTabla =document.getElementById('grp_bancos_tabla');
  const grpManual=document.getElementById('grp_concepto_manual');
  const grpRad   =document.getElementById('grp_radicado_manual');
  const radInput =document.getElementById('f_radicado');
  grpTabla.style.display='none'; grpManual.style.display='none'; grpRad.style.display='none';
  if(radInput){radInput.value='';radInput.readOnly=false;}
  actualizarBotonGenerar(concepto);
  if(!concepto) return;
  if(concepto==='OTRO'){ grpManual.style.display='flex'; grpRad.style.display='flex'; return; }
  const bancos=CONCEPTOS[concepto];
  if(!bancos) return;
  const keys=Object.keys(bancos);
  if(keys.length===1){
    grpRad.style.display='flex';
    if(radInput){
      radInput.value=bancos[keys[0]];
      radInput.readOnly=true;
      // Asegurar que el valor quede visible aunque esté readonly
      radInput.setAttribute('data-radicado', bancos[keys[0]]);
    }
    document.getElementById('f_radicado_badge').style.display='inline';
    document.getElementById('f_radicado_hint').textContent='Radicado para '+keys[0];
  } else {
    grpTabla.style.display='flex'; renderBancosTabla(concepto,bancos);
  }
}

function renderBancosTabla(concepto,bancos){
  const tbody=document.getElementById('bancos_tbody');
  const keys=Object.keys(bancos);
  tbody.innerHTML=keys.map((banco,i)=>`
    <tr>
      <td class="banco-name">${banco}</td>
      <td class="banco-rad">${bancos[banco]}</td>
      <td style="text-align:center">
        <input type="checkbox" id="chk_${i}" value="${banco}" checked onchange="actualizarConteo()">
      </td>
    </tr>`).join('');
  actualizarConteo();
}

function actualizarConteo(){
  const checks=document.querySelectorAll('#bancos_tbody input[type=checkbox]');
  const sel=[...checks].filter(c=>c.checked).length;
  document.getElementById('bancos_count').textContent=`${sel} de ${checks.length} bancos seleccionados`;
}
function toggleTodos(estado){
  document.querySelectorAll('#bancos_tbody input[type=checkbox]').forEach(c=>c.checked=estado);
  actualizarConteo();
}
function actualizarBotonGenerar(concepto){
  const btn=document.getElementById('btnGen');
  if(!btn)return;
  if(concepto&&concepto!=='OTRO'&&CONCEPTOS[concepto]&&Object.keys(CONCEPTOS[concepto]).length>1)
    btn.innerHTML='⬇️ Generar oficio con todos los bancos';
  else
    btn.innerHTML='⬇️ Generar y descargar Word';
}
function getBancosSeleccionados(){
  const tbody=document.getElementById('bancos_tbody');
  if(!tbody||tbody.style.display==='none'||tbody.closest('#grp_bancos_tabla').style.display==='none') return null;
  const checks=[...document.querySelectorAll('#bancos_tbody input[type=checkbox]:checked')];
  if(!checks.length) return [];
  const concepto=document.getElementById('f_concepto').value;
  const bancos=CONCEPTOS[concepto]||{};
  return checks.map(c=>({banco:c.value, radicado:bancos[c.value]||''}));
}
function getConceptoReal(){
  const sel=document.getElementById('f_concepto').value;
  if(sel==='OTRO') return document.getElementById('f_concepto_manual').value.trim();
  return sel;
}
function getRadicadoForm(){
  const el=document.getElementById('f_radicado');
  if(!el) return '';
  // Si está readonly, asegurar que devuelva el valor (puede tener data-radicado)
  return el.value.trim() || el.getAttribute('data-radicado') || '';
}

// ════════════════════════════════════════
// DUPLICADOS
// ════════════════════════════════════════
function checkDup(val){
  const dup=document.getElementById('f_dup');
  if(!val||val.length<4){ if(dup) dup.className='alert'; return; }
  const v=val.toLowerCase();

  // 1. Revisar cola activa (PENDIENTE) — más urgente
  const enCola=colaCache.find(r=>
    (r['Estado']||'').toUpperCase()==='PENDIENTE' &&
    ((r['Contribuyente']&&r['Contribuyente'].toLowerCase()===v)||
     (r['Cédula/NIT']&&r['Cédula/NIT'].toLowerCase()===v))
  );
  if(enCola){
    document.getElementById('f_dupmsg').innerHTML=
      `⏳ <strong>Ya está en cola pendiente:</strong> "${enCola['Contribuyente']}" — `+
      `${enCola['Tipo Oficio']||'—'} · ${enCola['Concepto']||'—'} `+
      `(${enCola['Fecha']||'?'} ${enCola['Hora']||''} por ${enCola['Funcionario']||'?'})`;
    dup.className='alert show alert-e';
    return;
  }

  // 2. Revisar historial (ya generado antes)
  const f=cache.find(r=>
    (r['Contribuyente']&&r['Contribuyente'].toLowerCase()===v)||
    (r['Cédula/NIT']&&r['Cédula/NIT'].toLowerCase()===v)
  );
  if(f){
    document.getElementById('f_dupmsg').innerHTML=
      `⚠️ <strong>Ya existe en historial:</strong> "${f['Contribuyente']}" — `+
      `Rad. ${f['Radicado']||'—'} (${f['Fecha']||'?'} por ${f['Funcionario']||'?'})`;
    dup.className='alert show alert-w';
  } else {
    dup.className='alert';
  }
}

// ════════════════════════════════════════
// GET DATOS FORM
// ════════════════════════════════════════
function getDatos(){
  return{
    tipoOficio: getTipo(),
    numOficio:  document.getElementById('f_num').value.trim()||'1070.02',
    fecha:      document.getElementById('f_fecha').value,
    nombre:     document.getElementById('f_nombre').value.trim(),
    cedula:     document.getElementById('f_cedula').value.trim(),
    concepto:   getConceptoReal(),
    radicado:   getRadicadoForm(),
    fechaAuto:  document.getElementById('f_fauto').value.trim(),
    motivo:     getMotivoReal(),
    proyNombre: document.getElementById('f_proyn').value.trim()||(cfg.nombre||''),
    proyFecha:  document.getElementById('f_proyf').value,
    obs:        document.getElementById('f_obs').value.trim(),
    celular:    (document.getElementById('f_celular')||{}).value ? document.getElementById('f_celular').value.trim() : '',
    correo:     (document.getElementById('f_correo')||{}).value ? document.getElementById('f_correo').value.trim() : '',
    funcionario:cfg.nombre||'',
    equipo:     cfg.equipo||'',
  };
}

function validar(d,id){
  const req=[['fecha','Fecha'],['nombre','Nombre contribuyente'],['cedula','Cédula / NIT'],['fechaAuto','Fecha del auto']];
  for(const[k,l] of req){if(!d[k]){showAlert(id,'e',`"${l}" es obligatorio.`);return false;}}
  if(!getMotivoReal()){showAlert(id,'e','Seleccione o escriba el motivo.');return false;}
  if(!d.concepto){showAlert(id,'e','Seleccione o escriba un concepto.');return false;}
  const hayBancos=getBancosSeleccionados();
  if(!hayBancos&&!d.radicado){showAlert(id,'e','"Radicado" es obligatorio.');return false;}
  if(hayBancos&&!hayBancos.length){showAlert(id,'e','Seleccione al menos un banco.');return false;}
  return true;
}

// ════════════════════════════════════════
// PLANTILLA ROW (DOCX)
// ════════════════════════════════════════
const DATA_ROW_TPL='<w:tr w:rsidR="005F262D" w:rsidTr="005F262D"><w:trPr><w:jc w:val="center"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2065" w:type="dxa"/></w:tcPr><w:p w:rsidR="005F262D" w:rsidRDefault="005F262D" w:rsidP="0081139F"><w:pPr><w:spacing w:after="0"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>__NOMBRE__</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="2065" w:type="dxa"/></w:tcPr><w:p w:rsidR="005F262D" w:rsidRDefault="005F262D" w:rsidP="0081139F"><w:pPr><w:spacing w:after="0"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>__CEDULA__</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="3959" w:type="dxa"/></w:tcPr><w:p w:rsidR="005F262D" w:rsidRDefault="005F262D" w:rsidP="0081139F"><w:pPr><w:spacing w:after="0"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>__CONCEPTO_RADICADOS__</w:t></w:r></w:p></w:tc></w:tr>';

// ════════════════════════════════════════
// CARGAR PLANTILLA DOCX (lazy, desde index)
// ════════════════════════════════════════

// Plantilla oficial predeterminada (Desembargo_bancario.docx — aprobado Alcaldía de Bello)
// Se puede sobreescribir desde Config → "Plantilla Word oficial"
const PLANTILLA_DEFAULT = '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';

function cargarPlantilla(){
  if(B64) return true;
  // Migración F-GAF-77: la estructura de relleno cambió, por lo que cualquier
  // plantilla vieja guardada en localStorage ya no es compatible y generaría
  // oficios en blanco. Se limpia una sola vez para forzar la predeterminada.
  const MIGR_KEY = 'desembargo_tmpl_migr_fgaf77';
  const claves = [TMPL_KEY, 'desembargo_template_b64', 'tmpl_desembargo_b64'];
  if(!localStorage.getItem(MIGR_KEY)){
    for(const k of claves) localStorage.removeItem(k);
    localStorage.setItem(MIGR_KEY,'1');
  }
  // 1. Buscar versión personalizada en localStorage (subida desde Config)
  for(const k of claves){
    const stored = localStorage.getItem(k);
    if(stored && stored.length > 100){ B64 = stored; return true; }
  }
  // 2. Usar la plantilla oficial predeterminada
  B64 = PLANTILLA_DEFAULT;
  return true;
}

function cargarPlantillaArchivo(input){
  const file = input.files[0];
  if(!file) return;
  if(!file.name.endsWith('.docx')){
    alert('Solo se aceptan archivos .docx'); return;
  }
  const btn = input.closest('label');
  if(btn) btn.textContent = '⏳ Cargando…';

  const reader = new FileReader();
  reader.onerror = function(){
    if(btn) btn.innerHTML = '📂 Seleccionar plantilla .docx';
    showAlert('c_alert','e','Error al leer el archivo. Intenta de nuevo.');
  };
  reader.onload = function(e){
    try {
      // Convertir por chunks para evitar límite del call stack con archivos grandes
      const bytes = new Uint8Array(e.target.result);
      let b64 = '';
      const CHUNK = 8192;
      for(let i = 0; i < bytes.length; i += CHUNK){
        b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      b64 = btoa(b64);

      // Guardar — localStorage tiene límite ~5MB, el docx es ~80KB, bien
      try {
        localStorage.setItem(TMPL_KEY, b64);
      } catch(storageErr){
        // Si localStorage está lleno, limpiar claves viejas y reintentar
        localStorage.removeItem('desembargo_template_b64');
        localStorage.removeItem('tmpl_desembargo_b64');
        localStorage.setItem(TMPL_KEY, b64);
      }

      B64 = b64;
      actualizarEstadoPlantilla(file.name, b64.length);
      toastD('✅ Plantilla "'+file.name+'" lista');
      showAlert('c_alert','s','✅ Plantilla cargada — ya puedes generar oficios Word');
    } catch(err){
      showAlert('c_alert','e','Error procesando la plantilla: '+err.message);
    } finally {
      // Restaurar botón
      const lbl = document.querySelector('label[for="inputPlantilla"], label:has(#inputPlantilla)');
      if(lbl) lbl.childNodes[0].textContent = '📂 Seleccionar plantilla .docx';
    }
  };
  reader.readAsArrayBuffer(file);
}

function actualizarEstadoPlantilla(nombre, len){
  const ok    = document.getElementById('plantilla-ok');
  const vacia = document.getElementById('plantilla-vacia');
  const nomEl = document.getElementById('plantilla-nombre');
  // Siempre hay plantilla (predeterminada o personalizada)
  if(ok)    ok.style.display    = 'flex';
  if(vacia) vacia.style.display = 'none';
  if(nomEl) nomEl.textContent   = nombre || 'Plantilla cargada';
}

function eliminarPlantilla(){
  if(!confirm('¿Eliminar la plantilla? Tendrás que cargarla de nuevo para generar Word.')) return;
  localStorage.removeItem(TMPL_KEY);
  B64 = null;
  actualizarEstadoPlantilla('', 0);
  toastD('Plantilla eliminada', 'rgba(234,88,12,.95)');
}

// Aplica los reemplazos quirúrgicos sobre el document.xml de la plantilla
// y devuelve SOLO el XML resultante (string). Reutilizado por generarDocx
// (un oficio) y por generarDocxCombinado (varios en un mismo Word).
function construirDocXml(xml, d){
  // ── Relleno para plantilla F-GAF-77 (Desembargo en bancos) ──
  // Los datos se insertan por anclas estables (paraId) en las celdas vacías,
  // por el SDT de fecha y por textos marcadores. Cada helper añade un run.

  // Runs con formato de la plantilla
  const _r20 = (t) =>
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'+
    '<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">'+t+'</w:t></w:r>';
  const _r18 = (t) =>
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'+
    '<w:sz w:val="18"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">'+t+'</w:t></w:r>';
  // Inserta un run dentro del párrafo vacío identificado por su w14:paraId
  const _fillPara = (pid, runXml) => {
    const re = new RegExp('(w14:paraId="'+pid+'"[^>]*>[\\s\\S]*?<\\/w:pPr>)(<\\/w:p>)');
    xml = xml.replace(re, (m,a,b) => a+runXml+b);
  };

  // 1. Número de oficio ("1070." + "2" en dos <w:t>)
  const _num = xmlEsc(d.numOficio || '1070.02');
  xml = xml.replace('<w:t>1070.</w:t>', '<w:t>'+_num+'</w:t>');
  xml = xml.replace('<w:t>2</w:t>', '<w:t></w:t>');

  // 2. Fecha del oficio (SDT junto a "Bello,")
  xml = xml.replace(
    '<w:r w:rsidR="00F63CCB"><w:rPr><w:rFonts w:ascii="Arial" w:eastAsiaTheme="minorHAnsi" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:szCs w:val="20"/></w:rPr><w:t>Fecha</w:t></w:r>',
    '<w:r w:rsidR="00F63CCB"><w:rPr><w:rFonts w:ascii="Arial" w:eastAsiaTheme="minorHAnsi" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:szCs w:val="20"/></w:rPr><w:t>'+xmlEsc(fmtL(d.fecha))+'</w:t></w:r>'
  );

  // 3. Tabla de contribuyentes (celdas vacías por paraId)
  _fillPara('4EF79F7F', _r20(xmlEsc(d.nombre||'')));                       // Nombres y apellidos
  _fillPara('0CAE9AA4', _r20(xmlEsc(d.cedula||'')));                       // Cédula/NIT
  _fillPara('216F2E57', _r20(xmlEsc(((d.concepto||'')+' '+(d.radicado||'')).trim()))); // Concepto y radicado

  // 4. Motivo del levantamiento (marcador entre paréntesis)
  xml = xml.replace(
    '<w:t>(motivo del levantamiento del embargo).</w:t>',
    '<w:t xml:space="preserve">'+xmlEsc(d.motivo||'')+'</w:t>'
  );

  // 5. Fila "Proyectó": Nombre, Firma (mismo nombre) y Fecha (fecha del auto)
  const _proyN = xmlEsc(d.proyNombre || cfg.nombre || '');
  _fillPara('25B9C88D', _r18(_proyN));                    // Nombre
  _fillPara('634F9D4A', _r18(_proyN));                    // Firma
  _fillPara('00521872', _r18(xmlEsc(d.fechaAuto||'')));   // Fecha

  // 12. Recuadro de control de impresión (esquina superior derecha)
  //     Fecha/hora de generación + funcionario. Permite identificar cada
  //     oficio cuando se imprimen varios a la vez para llevar a radicar.
  //     Se inyecta justo al abrir <w:body> para que quede arriba del oficio.
  const _sello   = selloGen();
  const _func    = d.proyNombre || cfg.nombre || 'Funcionario';
  const _rprSello = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="14"/><w:szCs w:val="14"/><w:color w:val="555555"/></w:rPr>';
  const _bordeCelda =
    '<w:tcBorders>'+
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/>'+
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="999999"/>'+
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>'+
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="999999"/>'+
    '</w:tcBorders>';
  const _lineaSello = (txt) =>
    '<w:p><w:pPr><w:spacing w:after="0" w:line="200" w:lineRule="auto"/>'+
    '<w:jc w:val="left"/>'+_rprSello+'</w:pPr>'+
    '<w:r>'+_rprSello+'<w:t xml:space="preserve">'+txt+'</w:t></w:r></w:p>';
  const _recuadro =
    '<w:tbl>'+
    '<w:tblPr>'+
    '<w:tblW w:w="2600" w:type="dxa"/>'+
    '<w:jc w:val="right"/>'+
    '<w:tblLayout w:type="fixed"/>'+
    '<w:tblLook w:val="04A0" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/>'+
    '</w:tblPr>'+
    '<w:tblGrid><w:gridCol w:w="2600"/></w:tblGrid>'+
    '<w:tr><w:tc>'+
    '<w:tcPr><w:tcW w:w="2600" w:type="dxa"/>'+_bordeCelda+
    '<w:shd w:val="clear" w:color="auto" w:fill="F5F5F5"/>'+
    '<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'+
    '</w:tcPr>'+
    _lineaSello('Generado: '+xmlEsc(_sello))+
    _lineaSello('Enviado por correo electrónico: '+xmlEsc(_func))+
    '</w:tc></w:tr>'+
    '</w:tbl>'+
    '<w:p><w:pPr><w:spacing w:after="0" w:line="120" w:lineRule="auto"/></w:pPr></w:p>';
  xml = xml.replace(/(<w:body>)/, '$1'+_recuadro);

  return xml;
}

async function generarDocx(d){
  if(!B64) throw new Error('Plantilla no cargada.');
  const zip = await JSZip.loadAsync(b64ToU8(B64));
  let xml   = await zip.file('word/document.xml').async('string');
  xml = construirDocXml(xml, d);
  zip.file('word/document.xml', xml);
  return zip.generateAsync({
    type:'blob',
    mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression:'DEFLATE'
  });
}

async function generarDocxMulti(d, bancos){
  if(!B64) throw new Error('Plantilla no cargada.');
  // Para multi-banco, usamos el mismo documento pero con todos los radicados
  // El radicado en el asunto muestra todos separados por coma
  const allRad = bancos.map(b => b.radicado).join(', ');
  const dMulti  = Object.assign({}, d, { radicado: allRad });
  // La tabla del contribuyente muestra la primera fila con el primer banco
  // y el concepto del contribuyente con todos los radicados
  const dConcepto = Object.assign({}, dMulti, {
    concepto: d.concepto + ' ' + bancos.map(b => b.banco+': '+b.radicado).join(' | ')
  });
  return generarDocx(dConcepto);
}

// ════════════════════════════════════════
// WORD COMBINADO — varios oficios en un solo .docx
// Cada oficio en su propia página, formato idéntico a la plantilla oficial.
// Técnica: el primer oficio es la base; de los siguientes se inyecta el
// contenido de su <w:body> como una nueva sección (preservando su sectPr
// para que el encabezado/escudo se repita), con salto de página antes.
// ════════════════════════════════════════
async function generarDocxCombinado(items){
  if(!B64) throw new Error('Plantilla no cargada.');
  if(!items || !items.length) throw new Error('No hay oficios para combinar.');

  // Plantilla base (se reutiliza para generar el XML de cada oficio)
  const tplZip = await JSZip.loadAsync(b64ToU8(B64));
  const tplXml = await tplZip.file('word/document.xml').async('string');

  // Construye el XML de cada oficio aplicando los reemplazos
  const xmls = items.map(d => construirDocXml(tplXml, d));

  // Helpers para extraer partes del body
  const getBodyInner = (xml) => {
    const m = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
    return m ? m[1] : '';
  };
  // Separa el sectPr final del resto del cuerpo
  const splitSectPr = (bodyInner) => {
    const m = bodyInner.match(/([\s\S]*?)(<w:sectPr[\s\S]*?<\/w:sectPr>)\s*$/);
    if(m) return { contenido: m[1], sectPr: m[2] };
    return { contenido: bodyInner, sectPr: '' };
  };

  // Salto de página (en su propio párrafo)
  const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

  // El primer oficio es la base: conservamos su documento entero,
  // solo vamos a inyectar los siguientes ANTES de su sectPr final.
  const base = xmls[0];
  const baseBody = getBodyInner(base);
  const baseSplit = splitSectPr(baseBody);

  // Para insertar una sección por oficio, el sectPr del oficio anterior
  // debe ir envuelto en un párrafo (w:p > w:pPr > w:sectPr).
  const sectPrComoParrafo = (sectPr) =>
    `<w:p><w:pPr>${sectPr}</w:pPr></w:p>`;

  // Empezamos con el contenido del primer oficio
  let nuevoBody = baseSplit.contenido;

  // Para cada oficio siguiente: cerramos la sección anterior con su sectPr,
  // metemos salto de página y agregamos el contenido del nuevo oficio.
  for(let i = 1; i < xmls.length; i++){
    const prevSect = (i === 1)
      ? baseSplit.sectPr
      : splitSectPr(getBodyInner(xmls[i-1])).sectPr;
    // Cerrar sección del oficio anterior
    if(prevSect) nuevoBody += sectPrComoParrafo(prevSect);
    // Salto de página y contenido del oficio actual
    const curSplit = splitSectPr(getBodyInner(xmls[i]));
    nuevoBody += PAGE_BREAK + curSplit.contenido;
  }

  // El sectPr final del documento es el del último oficio
  const ultimoSect = splitSectPr(getBodyInner(xmls[xmls.length-1])).sectPr
                     || baseSplit.sectPr;
  nuevoBody += ultimoSect;

  // Reensamblar el document.xml de la base con el nuevo body
  const docFinal = base.replace(
    /<w:body>[\s\S]*<\/w:body>/,
    '<w:body>' + nuevoBody + '</w:body>'
  );

  tplZip.file('word/document.xml', docFinal);
  return tplZip.generateAsync({
    type:'blob',
    mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression:'DEFLATE'
  });
}

// Convierte un item de la cola en el objeto `d` que esperan las funciones de
// generación, resolviendo multi-banco igual que generarEImprimir.
function itemAColaDatos(item){
  const d = {
    tipoOficio: item['Tipo Oficio']||'',
    numOficio:  item['N° Oficio']||'',
    fecha:      item['Fecha Oficio']||'',
    nombre:     item['Contribuyente']||'',
    cedula:     item['Cédula/NIT']||'',
    concepto:   item['Concepto']||'',
    radicado:   item['Radicado']||'',
    fechaAuto:  item['Fecha Auto']||'',
    motivo:     item['Motivo']||'',
    proyNombre: item['Proyectó']||'',
    proyFecha:  '',
  };
  // Si el radicado ya viene como "BANCO:rad | BANCO:rad", el concepto debe
  // incluir esa lista (igual que generarDocxMulti arma dConcepto).
  // Si no vienen bancos y el registro no trae radicado (caso cola), se
  // reconstruyen desde CONCEPTOS según el concepto.
  let bancos = item._bancos || null;
  if(!bancos && !d.radicado && d.concepto && CONCEPTOS[d.concepto]){
    bancos = Object.entries(CONCEPTOS[d.concepto]).map(([banco,radicado])=>({banco,radicado}));
  }
  // Banco único (ej. "TODOS LOS BANCOS"): radicado directo en d.radicado.
  if(!d.radicado && bancos && bancos.length===1){
    d.radicado = bancos[0].radicado;
  }
  if(bancos && bancos.length>1){
    const allRad = bancos.map(b=>b.radicado).join(', ');
    return Object.assign({}, d, {
      radicado: allRad,
      concepto: d.concepto + ' ' + bancos.map(b=>b.banco+': '+b.radicado).join(' | ')
    });
  }
  return d;
}

// Genera UN Word con todos los oficios seleccionados (check) en la cola
// y los marca como IMPRESO en Supabase.
async function generarWordCombinado(){
  const checks=[...document.querySelectorAll('.chk-cola:checked')];
  if(!checks.length){ alert('Selecciona al menos un oficio de la cola.'); return; }
  const ok=cargarPlantilla();
  if(!ok) return;

  const btn=document.getElementById('btnWordComb');
  const original = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled=true; btn.innerHTML='⏳ Combinando…'; }

  const ids=checks.map(c=>c.dataset.id);
  const items=ids.map(id=>colaCache.find(r=>(r['ID']||r.id)===id)).filter(Boolean);
  if(!items.length){ if(btn){btn.disabled=false;btn.innerHTML=original;} return; }

  try{
    const datos=items.map(itemAColaDatos);
    const blob=await generarDocxCombinado(datos);
    const hoy=new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-');
    dlBlob(blob, `Desembargos_combinado_${items.length}_oficios_${hoy}.docx`);

    // Marcar impresos en Supabase
    await apiPost({accion:'marcar_impreso', ids});
    await cargarCola();

    showAlert('f_alert','s',`✅ Word combinado con ${items.length} oficio(s). Marcados como impresos.`);
  }catch(e){
    showAlert('f_alert','e','Error al combinar: '+e.message);
  }
  if(btn){ btn.disabled=false; btn.innerHTML=original || `📄 Word combinado (<span id="cntSelComb">0</span>)`; }
}

// ════════════════════════════════════════
// GENERAR DESDE FORM
// ════════════════════════════════════════
async function generarDesdeForm(){
  const ok=cargarPlantilla();
  if(!ok) return;
  const d=getDatos();
  const bancosSelec=getBancosSeleccionados();
  const btn=document.getElementById('btnGen');

  if(bancosSelec){
    if(!bancosSelec.length){showAlert('f_alert','e','Seleccione al menos un banco.');return;}
    if(!getMotivoReal()){showAlert('f_alert','e','Seleccione o escriba el motivo.');return;}
    const req=[['numOficio','N° Oficio'],['fecha','Fecha'],['nombre','Nombre'],['cedula','Cédula'],['fechaAuto','Fecha del auto']];
    for(const[k,l] of req){if(!d[k]){showAlert('f_alert','e',`"${l}" es obligatorio.`);return;}}
    if(!d.concepto){showAlert('f_alert','e','Seleccione un concepto.');return;}
    btn.disabled=true; btn.textContent=`⏳ Generando ${bancosSelec.length} banco(s)…`;
    showAlert('f_alert','w',`Generando oficio con ${bancosSelec.length} banco(s)…`);
    try{
      const blob=await generarDocxMulti(d,bancosSelec);
      dlBlob(blob,`Oficio_${d.concepto.replace(/[^a-zA-Z0-9]/g,'_')}_${d.nombre.split(' ')[0]}.docx`);
      const todosRad=bancosSelec.map(b=>b.banco+':'+b.radicado).join(' | ');
      const pd={accion:'guardar',tipoOficio:d.tipoOficio,numOficio:d.numOficio,fechaOficio:d.fecha,nombre:d.nombre,cedula:d.cedula,concepto:d.concepto,radicado:todosRad,fechaAuto:d.fechaAuto,motivo:d.motivo,proyNombre:d.proyNombre,funcionario:d.funcionario,equipo:d.equipo,observacion:d.obs||'',celular:d.celular||'',correo:d.correo||''};
      await apiPost(pd); guardarLocalCache(pd);
      showAlert('f_alert','s',`✅ Oficio generado con ${bancosSelec.length} banco(s). Revise Descargas.`);
      incrementarContadorD(); guardarUltimo(d);
      cargarRemoto(); mostrarModalResumen(d, bancosSelec.length); setTimeout(()=>document.getElementById('modalSig').classList.add('open'),800);
    }catch(e){showAlert('f_alert','e','Error: '+e.message);}
    btn.disabled=false; btn.innerHTML='⬇️ Generar oficio con todos los bancos';
  } else {
    if(!validar(d,'f_alert')) return;
    btn.disabled=true; btn.textContent='⏳ Generando…';
    try{
      const blob=await generarDocx(d);
      dlBlob(blob,`${d.tipoOficio.replace(/ /g,'_')}_${d.nombre.split(' ')[0]}.docx`);
      showAlert('f_alert','w','Guardando en Google Sheets…');
      const res=await apiPost({accion:'guardar',tipoOficio:d.tipoOficio,numOficio:d.numOficio,fechaOficio:d.fecha,nombre:d.nombre,cedula:d.cedula,concepto:d.concepto,radicado:d.radicado,fechaAuto:d.fechaAuto,motivo:d.motivo,proyNombre:d.proyNombre,funcionario:d.funcionario,equipo:d.equipo,observacion:d.obs||'',celular:d.celular||'',correo:d.correo||''});
      if(res&&res.ok){
        guardarLocalCache({tipoOficio:d.tipoOficio,nombre:d.nombre,cedula:d.cedula,concepto:d.concepto,radicado:d.radicado,fechaAuto:d.fechaAuto,motivo:d.motivo,proyNombre:d.proyNombre});
        showAlert('f_alert','s','✅ Oficio generado y registrado en Google Sheets.');
        incrementarContadorD(); guardarUltimo(d);
        cargarRemoto(); mostrarModalResumen(d, null); setTimeout(()=>document.getElementById('modalSig').classList.add('open'),800);
      } else if(res&&res.local){
        showAlert('f_alert','w','Descargado. Sin conexión al Sheet.');
      } else {
        showAlert('f_alert','w','Descargado. Error al guardar en Sheet.');
      }
    }catch(e){showAlert('f_alert','e','Error: '+e.message);}
    btn.disabled=false; btn.innerHTML='⬇️ Generar y descargar Word';
  }
}

// ════════════════════════════════════════
// LIMPIAR / MODAL SIGUIENTE
// ════════════════════════════════════════
function confirmarLimpiar(){
  // Si el formulario ya está vacío, no molestar con el modal
  const tocado = ['f_nombre','f_cedula','f_fauto','f_obs'].some(id=>{
    const el=document.getElementById(id); return el && el.value.trim()!=='';
  }) || motivoSeleccionado;
  if(!tocado){ limpiarForm(); toastD('✓ Formulario ya estaba vacío'); return; }
  document.getElementById('confirmLimpiar').classList.add('open');
}
function cerrarConfirmLimpiar(){
  document.getElementById('confirmLimpiar').classList.remove('open');
}
function ejecutarLimpiar(){
  cerrarConfirmLimpiar();
  limpiarForm();
  toastD('🗑️ Formulario vacío');
}
function limpiarForm(){
  ['f_nombre','f_cedula','f_fauto','f_concepto_manual','f_motivo_manual','f_obs','f_celular','f_correo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('f_concepto').selectedIndex=0;
  document.getElementById('grp_bancos_tabla').style.display='none';
  document.getElementById('grp_radicado_manual').style.display='none';
  var radEl=document.getElementById('f_radicado');
  if(radEl){ radEl.readOnly=false; radEl.removeAttribute('data-radicado'); radEl.value=''; }
  document.getElementById('grp_concepto_manual').style.display='none';
  document.getElementById('bancos_tbody').innerHTML='';
  document.querySelectorAll('.tipo-btn').forEach(b=>b.classList.remove('active','blue','green','red'));
  document.querySelector('[data-tipo="Desembargo Banco"]').classList.add('active','blue');
  document.querySelectorAll('.motivo-pill').forEach(p=>p.classList.remove('active'));
  motivoSeleccionado='';
  document.getElementById('f_motivo_manual').style.display='none';
  document.getElementById('f_fecha').value=hoyISO();
  document.getElementById('f_proyf').value=hoyISO();
  const proyn=document.getElementById('f_proyn');
  if(proyn) proyn.value=cfg.nombre||'';
  document.getElementById('f_num').value='1070.02';
  document.getElementById('btnGen').innerHTML='⬇️ Generar y descargar Word';
  hideAlert('f_alert'); hideAlert('f_dup');
}
function mostrarModalResumen(d, bancosN){
  const el = document.getElementById('modal-resumen');
  if(!el) return;
  const fila = (label, val) =>
    `<div style="color:rgba(255,255,255,.45);font-size:11px">${label}</div>`+
    `<div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${val||'—'}</div>`;
  const bancosStr = bancosN ? bancosN+' banco(s)' : '—';
  el.innerHTML =
    fila('Contribuyente', d.nombre) +
    fila('Cédula / NIT',  d.cedula) +
    fila('Tipo',          d.tipoOficio) +
    fila('Concepto',      d.concepto ? d.concepto.substring(0,30)+(d.concepto.length>30?'…':'') : '—') +
    fila('Fecha auto',    d.fechaAuto) +
    fila('Bancos',        bancosStr);
}

function sigMismoContrib(){
  // Conserva los datos del CONTRIBUYENTE; limpia solo lo específico del oficio
  // (el comparendo en Observación lo vuelve a poner la persona si aplica).
  const g=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const datos={
    nombre:   g('f_nombre'),
    cedula:   g('f_cedula'),
    concepto: g('f_concepto'),
    fauto:    g('f_fauto'),
    celular:  g('f_celular'),
    correo:   g('f_correo'),
  };
  const tipoBtn=document.querySelector('.tipo-btn.active');
  const tipoVal=tipoBtn?tipoBtn.dataset.tipo:null;
  const motivoPill=document.querySelector('.motivo-pill.active');

  document.getElementById('modalSig').classList.remove('open');
  limpiarForm();

  // Restaurar datos del contribuyente
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  set('f_nombre',datos.nombre);
  set('f_cedula',datos.cedula);
  set('f_fauto',datos.fauto);
  set('f_celular',datos.celular);
  set('f_correo',datos.correo);
  // Restaurar concepto (dispara el cruce de bancos/radicado)
  const selC=document.getElementById('f_concepto');
  if(selC && datos.concepto){ selC.value=datos.concepto; onConceptoChange(); }
  // Restaurar tipo de oficio
  if(tipoVal){ const b=document.querySelector(`.tipo-btn[data-tipo="${tipoVal}"]`); if(b) selTipo(b); }
  // Restaurar motivo (si era una pastilla predefinida)
  if(motivoPill){ selMotivo(motivoPill, motivoPill.dataset.motivo||motivoPill.textContent.trim()); }

  // Foco en Observación para que ponga el nuevo comparendo (opcional)
  const obs=document.getElementById('f_obs');
  if(obs){ obs.value=''; obs.focus(); }
}
function sigNuevo(){
  document.getElementById('modalSig').classList.remove('open');
  limpiarForm();
  document.getElementById('f_nombre').focus();
}

// ════════════════════════════════════════
// REGISTRO — RENDER
// ════════════════════════════════════════
function actualizarStatsReg(){
  const hoy=hoyLocal();
  document.getElementById('stTotal').textContent=cache.length;
  document.getElementById('stHoy').textContent=cache.filter(r=>r['Fecha']===hoy||r['Fecha Oficio']===hoyISO()).length;
  document.getElementById('stDesem').textContent=cache.filter(r=>(r['Tipo Oficio']||'').startsWith('Desembargo')).length;
  document.getElementById('stEmbargo').textContent=cache.filter(r=>(r['Tipo Oficio']||'').startsWith('Embargo')).length;
  document.getElementById('badgeCnt').textContent=cache.length;
}

function renderRegistro(){
  const txt=document.getElementById('sTxt').value.toLowerCase();
  const tipo=document.getElementById('sTipo').value;
  const mes=document.getElementById('sMes').value;

  // Poblar filtros
  const tipos=[...new Set(cache.map(r=>r['Tipo Oficio']).filter(Boolean))];
  const selT=document.getElementById('sTipo').value;
  document.getElementById('sTipo').innerHTML='<option value="">Todos los tipos</option>'+tipos.map(t=>`<option value="${t}"${t===selT?' selected':''}>${t}</option>`).join('');

  let fil=cache;
  if(txt) fil=fil.filter(r=>((r['Contribuyente']||'')+(r['Cédula/NIT']||'')+(r['Radicado']||'')+(r['N° Oficio']||'')).toLowerCase().includes(txt));
  if(tipo) fil=fil.filter(r=>r['Tipo Oficio']===tipo);
  if(mes)  fil=fil.filter(r=>(r['Fecha Oficio']||'').startsWith(mes));

  filActual=fil;
  renderPagina();
  actualizarStatsReg();
}

function renderPagina(){
  const inicio=(pagActual-1)*POR_PAG;
  const pagina=filActual.slice(inicio,inicio+POR_PAG);
  const tbody=document.getElementById('tbReg');
  if(!pagina.length){
    tbody.innerHTML=`<tr><td colspan="9" class="tbl-empty">📭 No hay registros que coincidan</td></tr>`;
  } else {
    tbody.innerHTML=pagina.map((r,i)=>{
      const tipo=r['Tipo Oficio']||'';
      const tagClass=tipo.startsWith('Desembargo')?'tag-desembargo':tipo.startsWith('Embargo')?'tag-embargo':'tag-otro';
      return`<tr>
        <td class="mono" style="color:var(--soft)">${inicio+i+1}</td>
        <td class="mono">${r['Fecha']||r['Fecha Oficio']||'—'}</td>
        <td><span class="tipo-tag ${tagClass}">${tipo}</span></td>
        <td class="mono">${r['N° Oficio']||'—'}</td>
        <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r['Contribuyente']||'—'}</td>
        <td class="mono">${r['Cédula/NIT']||'—'}</td>
        <td class="mono" style="max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r['Radicado']||'—'}</td>
        <td style="color:var(--soft);font-size:11px">${r['Proyectó']||r['Funcionario']||'—'}</td>
        <td style="display:flex;gap:3px;align-items:center">
          <button class="bi" title="Volver a enviar a cola" onclick="reenviarACola('${r['ID']||''}')">↩️</button>
          <button class="bi del" title="Eliminar" onclick="eliminar('${r['ID']||''}')">✕</button>
        </td>
      </tr>`;
    }).join('');
  }
  renderPaginacion();
}

function renderPaginacion(){
  const total=Math.ceil(filActual.length/POR_PAG);
  const pg=document.getElementById('pagination');
  if(total<=1){pg.innerHTML='';return;}
  let html=`<button class="pg-btn" onclick="irPag(${pagActual-1})" ${pagActual===1?'disabled':''}>‹</button>`;
  for(let i=1;i<=total;i++){
    if(i===1||i===total||Math.abs(i-pagActual)<=2)
      html+=`<button class="pg-btn${i===pagActual?' active':''}" onclick="irPag(${i})">${i}</button>`;
    else if(Math.abs(i-pagActual)===3)
      html+=`<span class="pg-info">…</span>`;
  }
  html+=`<button class="pg-btn" onclick="irPag(${pagActual+1})" ${pagActual===total?'disabled':''}>›</button>`;
  html+=`<span class="pg-info">${filActual.length} registros</span>`;
  pg.innerHTML=html;
}
function irPag(n){ pagActual=n; renderPagina(); }

async function eliminar(id){
  if(!id||!confirm('¿Eliminar este registro?')) return;
  await apiPost({accion:'eliminar',id});
  cargarRemoto();
}

// Vuelve a enviar un registro del historial a la cola como PENDIENTE.
// Reutiliza la acción 'encolar' de apiPost (inserta una fila nueva).
async function reenviarACola(id){
  const item = cache.find(r=>(r['ID']||r.id)===id);
  if(!item){ alert('No se encontró el registro.'); return; }
  if(!confirm(`¿Volver a enviar a la cola el oficio de "${item['Contribuyente']||'este registro'}"?`)) return;
  const payload = {
    accion:     'encolar',
    tipoOficio: item['Tipo Oficio']||'',
    numOficio:  item['N° Oficio']||'',
    fechaOficio:item['Fecha Oficio']||'',
    nombre:     item['Contribuyente']||'',
    cedula:     item['Cédula/NIT']||'',
    concepto:   item['Concepto']||'',
    radicado:   item['Radicado']||'',
    fechaAuto:  item['Fecha Auto']||'',
    motivo:     item['Motivo']||'',
    proyNombre: item['Proyectó']||'',
    funcionario:item['Funcionario']||item['Proyectó']||'',
    equipo:     '',
    observacion:item['Observación']||'',
    celular:    item['Celular']||'',
    correo:     item['Correo']||''
  };
  const res = await apiPost(payload);
  if(res && res.ok){
    await cargarCola();
    actualizarBadgeCola();
    showAlert('f_alert','s','✅ Reenviado a la cola como pendiente.');
    goPanel('cola');
  } else if(res && res.queued){
    showAlert('f_alert','w','Guardado localmente. Se sincronizará al reconectar.');
  } else {
    alert('No se pudo reenviar a la cola: '+((res&&res.error)||'error'));
  }
}

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
function dc(id){if(charts[id]){charts[id].destroy();delete charts[id];}}
function renderDash(){
  const arr=cache;
  const hoy=hoyLocal();
  document.getElementById('dashStats').innerHTML=`
    <div class="stat-tile"><div class="stat-tile-label">Total</div><div class="stat-tile-val">${arr.length}</div><div class="stat-tile-sub">Sheets</div></div>
    <div class="stat-tile"><div class="stat-tile-label">Hoy</div><div class="stat-tile-val">${arr.filter(r=>r['Fecha']===hoy).length}</div><div class="stat-tile-sub">generados</div></div>
    <div class="stat-tile"><div class="stat-tile-label">Funcionarios</div><div class="stat-tile-val">${new Set(arr.map(r=>r['Funcionario']).filter(Boolean)).size}</div><div class="stat-tile-sub">activos</div></div>
    <div class="stat-tile"><div class="stat-tile-label">Tipos</div><div class="stat-tile-val">${new Set(arr.map(r=>r['Tipo Oficio']).filter(Boolean)).size}</div><div class="stat-tile-sub">distintos</div></div>
  `;
  if(!arr.length) return;
  const C=['rgba(26,111,196,.8)','rgba(232,160,32,.8)','rgba(22,163,74,.8)','rgba(220,38,38,.8)','rgba(139,92,246,.8)','rgba(6,182,212,.8)','rgba(234,88,12,.8)','rgba(245,192,80,.8)'];
  const chartOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,color:'rgba(255,255,255,.4)'},grid:{color:'rgba(255,255,255,.06)'}},x:{ticks:{color:'rgba(255,255,255,.4)'},grid:{display:false}}}};
  const pMes={};arr.forEach(r=>{const m=(r['Fecha Oficio']||'').substring(0,7);if(m)pMes[m]=(pMes[m]||0)+1;});
  const mK=Object.keys(pMes).sort().slice(-10);
  dc('cMes');charts['cMes']=new Chart(document.getElementById('cMes'),{type:'bar',data:{labels:mK,datasets:[{data:mK.map(m=>pMes[m]),backgroundColor:C[0],borderRadius:4}]},options:chartOpts});
  const pT={};arr.forEach(r=>{const k=r['Tipo Oficio']||'Sin tipo';pT[k]=(pT[k]||0)+1;});
  const tK=Object.entries(pT).sort((a,b)=>b[1]-a[1]);
  dc('cTipo');charts['cTipo']=new Chart(document.getElementById('cTipo'),{type:'doughnut',data:{labels:tK.map(x=>x[0]),datasets:[{data:tK.map(x=>x[1]),backgroundColor:C,borderWidth:2,borderColor:'rgba(10,31,61,.8)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'rgba(255,255,255,.6)',font:{size:10},boxWidth:12}}}}});
  const pF={};arr.forEach(r=>{const k=r['Funcionario']||'Sin asignar';pF[k]=(pF[k]||0)+1;});
  const fK=Object.entries(pF).sort((a,b)=>b[1]-a[1]).slice(0,7);
  dc('cFunc');charts['cFunc']=new Chart(document.getElementById('cFunc'),{type:'bar',data:{labels:fK.map(x=>x[0]),datasets:[{data:fK.map(x=>x[1]),backgroundColor:C[1],borderRadius:4}]},options:{...chartOpts,indexAxis:'y',scales:{y:{ticks:{color:'rgba(255,255,255,.5)',font:{size:10}},grid:{display:false}},x:{ticks:{color:'rgba(255,255,255,.4)'},grid:{color:'rgba(255,255,255,.06)'},beginAtZero:true}}}});
  const dias={};const h30=new Date();h30.setHours(0,0,0,0);
  for(let i=29;i>=0;i--){const d=new Date(h30);d.setDate(d.getDate()-i);dias[d.toISOString().split('T')[0]]=0;}
  arr.forEach(r=>{if(r['Fecha Oficio']&&dias.hasOwnProperty(r['Fecha Oficio']))dias[r['Fecha Oficio']]++;});
  const dK=Object.keys(dias);
  dc('cDia');charts['cDia']=new Chart(document.getElementById('cDia'),{type:'line',data:{labels:dK.map(d=>d.substring(5)),datasets:[{data:dK.map(d=>dias[d]),borderColor:'rgba(232,160,32,.9)',backgroundColor:'rgba(232,160,32,.08)',fill:true,tension:.35,pointRadius:3,pointBackgroundColor:'rgba(245,192,80,.9)'}]},options:{...chartOpts}});
}

// ════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════
function cargarConfigPanel(){
  const u=document.getElementById('c_url');const n=document.getElementById('c_nom');const e=document.getElementById('c_eq');
  if(u)u.value=cfg.apiUrl||'';
  if(n)n.value=cfg.nombre||'';
  if(e)e.value=cfg.equipo||'';
  // Estado de la plantilla
  const b64stored = localStorage.getItem(TMPL_KEY)||localStorage.getItem('desembargo_template_b64')||'';
  if(b64stored && b64stored.length > 100){
    B64 = b64stored;
    actualizarEstadoPlantilla('Desembargo_bancario.docx (personalizada)', b64stored.length);
  } else {
    // Hay plantilla predeterminada integrada
    B64 = PLANTILLA_DEFAULT;
    actualizarEstadoPlantilla('F-GAF-77_desembargo_en_bancos.docx (predeterminada — oficial Alcaldía)', PLANTILLA_DEFAULT.length);
  }
}
function guardarConfig(){
  const urlInput=document.getElementById('c_url').value.trim();
  cfg={...cfg,
    apiUrl: urlInput||DEFAULT_URL,
    nombre: document.getElementById('c_nom').value.trim()||cfg.nombre,
    equipo: document.getElementById('c_eq').value.trim()
  };
  saveCfg();actualizarBanner();cargarConfigPanel();
  showAlert('c_alert','s','Configuración guardada ✅');
}
async function probarConexion(){
  showAlert('c_alert','w','Probando conexión con Supabase…');
  try{
    // HEAD count sobre la vista: confirma URL + key + RLS de lectura
    const rows = await supaFetch('v_desembargos?select=id&limit=1');
    showAlert('c_alert','s','✅ Conexión exitosa con Supabase');
  }catch(e){
    showAlert('c_alert','e','❌ No se pudo conectar a Supabase: '+e.message);
  }
}

// ════════════════════════════════════════
// COLA DE IMPRESIÓN
// ════════════════════════════════════════
let colaCache = [];

function limpiarItem(r){
  return {
    'ID':          r['ID']||r.id||'',
    'Fecha':       r['Fecha']||'',
    'Hora':        r['Hora']||'',
    'Funcionario': r['Funcionario']||'',
    'Estado':      r['Estado']||'PENDIENTE',
    'Tipo Oficio': r['Tipo Oficio']||r.tipoOficio||'',
    'N° Oficio':   r['N° Oficio']||r.numOficio||'',
    'Fecha Oficio':r['Fecha Oficio']||r.fechaOficio||'',
    'Contribuyente':r['Contribuyente']||r.nombre||'',
    'Cédula/NIT':  r['Cédula/NIT']||r.cedula||'',
    'Concepto':    r['Concepto']||r.concepto||'',
    'Radicado':    r['Radicado']||r.radicado||'',
    'Fecha Auto':  r['Fecha Auto']||r.fechaAuto||'',
    'Motivo':      r['Motivo']||r.motivo||'',
    'Proyectó':    r['Proyectó']||r.proyNombre||'',
    'Observación': r['Observación']||r.obs||'',
    'Celular':     r['Celular']||r.celular||'',
    'Correo':      r['Correo']||r.correo||'',
    _datos:        r._datos||null,
  };
}

function calcEdad(fecha, hora) {
  if(!fecha) return null;
  try {
    const [d,m,y] = (fecha||'').split('/');
    const base = new Date(`${y}-${m}-${d}T${hora||'00:00'}:00`);
    const diff = (Date.now() - base.getTime()) / 60000; // minutos
    if(diff < 60)   return {txt: Math.round(diff)+'m',  cls:'edad-ok'};
    if(diff < 1440) return {txt: Math.round(diff/60)+'h', cls:'edad-warn'};
    return {txt: Math.round(diff/1440)+'d', cls:'edad-old'};
  } catch(e){ return null; }
}

async function encolarDesdeForm(){
  const d = getDatos();
  const bancosEncolar = getBancosSeleccionados();
  const req=[['numOficio','N° Oficio'],['nombre','Nombre'],['cedula','Cédula'],
             ['concepto','Concepto'],['fechaAuto','Fecha del auto']];
  for(const[k,l] of req){
    if(!d[k]){showAlert('f_alert','e',`"${l}" es obligatorio.`);return;}
  }
  if(!getMotivoReal()){showAlert('f_alert','e','Seleccione o escriba el motivo.');return;}
  if(!bancosEncolar&&!d.radicado){showAlert('f_alert','e','"Radicado" es obligatorio.');return;}
  if(bancosEncolar&&!bancosEncolar.length){showAlert('f_alert','e','Seleccione al menos un banco.');return;}

  const btn=document.getElementById('btnEncolar');
  btn.disabled=true; btn.textContent='⏳ Enviando…';

  const radicadoEncolar=bancosEncolar
    ?bancosEncolar.map(b=>b.banco+':'+b.radicado).join(' | ')
    :d.radicado;

  const payload={
    accion:'encolar', tipoOficio:d.tipoOficio, numOficio:d.numOficio,
    fechaOficio:d.fecha, nombre:d.nombre, cedula:d.cedula,
    concepto:d.concepto, radicado:radicadoEncolar, fechaAuto:d.fechaAuto,
    motivo:d.motivo, proyNombre:d.proyNombre, funcionario:d.funcionario,
    equipo:d.equipo, observacion:d.obs||'', celular:d.celular||'', correo:d.correo||'',
  };

  const res = await apiPost(payload);

  // Refrescar cola desde Supabase (fuente de verdad).
  // Si no hubo conexión, apiPost ya dejó el registro en la cola de reintentos.
  await cargarCola();
  actualizarBadgeCola();

  if(res && res.ok){
    showAlert('f_alert','s','✅ Enviado a la cola de impresión 🖨️');
    btn.disabled=false; btn.innerHTML='🖨️ Enviar a cola';
    // Preguntar si desea otro oficio para el mismo contribuyente
    mostrarModalResumen(d, bancosEncolar?bancosEncolar.length:null);
    setTimeout(()=>document.getElementById('modalSig').classList.add('open'),300);
    return;
  } else if(res && res.queued){
    showAlert('f_alert','w','Guardado localmente. Se sincronizará al reconectar.');
  } else {
    showAlert('f_alert','w','No se pudo enviar a la cola. Reintentando en segundo plano.');
  }
  btn.disabled=false; btn.innerHTML='🖨️ Enviar a cola';
  limpiarForm();
}

async function cargarCola(){
  // Respaldo local primero (arranque offline)
  const local=JSON.parse(localStorage.getItem('cola_local_desem')||'[]');
  colaCache=local.map(limpiarItem);
  actualizarBadgeCola();
  renderCola();

  // Supabase es la fuente de verdad para la cola: PENDIENTE + IMPRESO
  const query='v_desembargos?select=*&estado=in.(PENDIENTE,IMPRESO)&order=creado_en.desc';
  try{
    const rows=await supaFetch(query);
    colaCache = rows.map(r=>limpiarItem(mapSupaRow(r)));
    // Guardar respaldo local
    localStorage.setItem('cola_local_desem', JSON.stringify(colaCache.slice(0,300)));
    actualizarBadgeCola();
    renderCola();
  }catch(e){
    // Sin conexión: nos quedamos con el respaldo local ya pintado
  }
}

function actualizarBadgeCola(){
  const pend=colaCache.filter(r=>(r['Estado']||'').toUpperCase()==='PENDIENTE').length;
  const el=document.getElementById('badgeCola');
  if(el) el.textContent=pend||'0';
  const pc=document.getElementById('colaPendCount');
  const ic=document.getElementById('colaImpCount');
  const tc=document.getElementById('colaTotalCount');
  if(pc) pc.textContent=pend;
  if(ic) ic.textContent=colaCache.filter(r=>(r['Estado']||'').toUpperCase()==='IMPRESO').length;
  if(tc) tc.textContent=colaCache.length;
}

function renderCola(){
  const filtro=document.getElementById('colaFiltro')?document.getElementById('colaFiltro').value:'PENDIENTE';
  const busq=(document.getElementById('colaTxt')?document.getElementById('colaTxt').value:'').toLowerCase();
  let items=[...colaCache];
  if(filtro==='PENDIENTE') items=items.filter(r=>(r['Estado']||'').toUpperCase()==='PENDIENTE');
  if(filtro==='IMPRESO')   items=items.filter(r=>(r['Estado']||'').toUpperCase()==='IMPRESO');
  if(busq) items=items.filter(r=>
    (r['Contribuyente']||'').toLowerCase().includes(busq)||
    (r['Cédula/NIT']||'').toLowerCase().includes(busq)||
    (r['Radicado']||'').toLowerCase().includes(busq)||
    (r['N° Oficio']||'').toLowerCase().includes(busq)||
    (r['Funcionario']||'').toLowerCase().includes(busq)
  );
  const pendTotal=colaCache.filter(r=>(r['Estado']||'').toUpperCase()==='PENDIENTE').length;
  const infoEl=document.getElementById('colaInfo');
  if(infoEl) infoEl.textContent=`${pendTotal} pendiente(s) de ${colaCache.length} total — mostrando ${items.length}`;

  const tbody=document.getElementById('tbCola');
  if(!items.length){
    tbody.innerHTML=`<tr><td colspan="10" class="tbl-empty">${filtro==='PENDIENTE'?'✅ No hay oficios pendientes en cola':'📂 Sin registros'}</td></tr>`;
    actualizarConteoSel();
    return;
  }
  tbody.innerHTML=items.map(r=>{
    const id=r['ID']||r.id||'';
    const esPend=(r['Estado']||'').toUpperCase()==='PENDIENTE';
    const estadoTag=esPend
      ?'<span class="estado-pend">⏳ Pendiente</span>'
      :'<span class="estado-imp">✅ Impreso</span>';
    const edad=calcEdad(r['Fecha'],r['Hora']);
    const edadHtml=edad?`<br><span class="edad-badge ${edad.cls}">${edad.txt}</span>`:'';
    const tipo=r['Tipo Oficio']||'';
    const tagClass=tipo.startsWith('Desembargo')?'tag-desembargo':tipo.startsWith('Embargo')?'tag-embargo':'tag-otro';
    // Determinar urgencia: PENDIENTE y más de 3 días
    const esUrgente = esPend && edad && edad.cls === 'edad-old';
    const filaClass = esUrgente ? 'fila-urgente' : '';
    const edadClsReal = esUrgente ? 'edad-urgente' : edad ? edad.cls : '';
    const edadHtmlFinal = edad
      ? `<br><span class="edad-badge ${edadClsReal}">${esUrgente?'🔴 ':''} ${edad.txt}</span>`
      : '';
    return `<tr class="${filaClass}">
      <td><input type="checkbox" class="chk-cola" data-id="${id}" ${esPend?'':'disabled'}
        style="width:14px;height:14px;accent-color:var(--blue2)" onchange="actualizarConteoSel()"></td>
      <td style="font-size:10.5px;color:var(--soft)">${r['Fecha']||''} ${r['Hora']||''}${edadHtmlFinal}</td>
      <td style="font-size:11.5px">${r['Funcionario']||'—'}</td>
      <td>${estadoTag}</td>
      <td><span class="tipo-tag ${tagClass}">${tipo}</span></td>
      <td class="mono">${r['N° Oficio']||'—'}</td>
      <td style="font-weight:600;font-size:12px">${r['Contribuyente']||'—'}</td>
      <td style="font-size:11px;color:var(--soft)">${r['Concepto']||'—'}</td>
      <td style="font-size:11px;color:var(--gold2);font-style:italic">${r['Observación']||'—'}</td>
      <td style="display:flex;gap:3px;align-items:center">
        ${esPend?`<button class="bi" onclick="imprimirUno('${id}')" title="Generar Word">⬇️</button>`:''}
        <button class="bi del" onclick="eliminarCola('${id}')" title="Eliminar">✕</button>
      </td>
    </tr>`;
  }).join('');
  actualizarConteoSel();
}

function actualizarConteoSel(){
  const sel=document.querySelectorAll('.chk-cola:checked').length;
  const el=document.getElementById('cntSel');
  if(el) el.textContent=sel;
  const elPdf=document.getElementById('cntSelPdf');
  if(elPdf) elPdf.textContent=sel;
  const elComb=document.getElementById('cntSelComb');
  if(elComb) elComb.textContent=sel;
  const btn=document.getElementById('btnImprimirSel');
  if(btn) btn.disabled=sel===0;
  const btnPdf=document.getElementById('btnPdfSel');
  if(btnPdf) btnPdf.disabled=sel===0;
  const btnComb=document.getElementById('btnWordComb');
  if(btnComb) btnComb.disabled=sel===0;
}
function seleccionarTodosCola(estado){
  document.querySelectorAll('.chk-cola:not(:disabled)').forEach(c=>c.checked=estado);
  const chk=document.getElementById('chkTodos');
  if(chk) chk.checked=estado;
  actualizarConteoSel();
}

async function imprimirSeleccionados(){
  const checks=[...document.querySelectorAll('.chk-cola:checked')];
  if(!checks.length) return;
  const ok=cargarPlantilla();
  if(!ok) return;
  const btn=document.getElementById('btnImprimirSel');
  btn.disabled=true;
  const ids=checks.map(c=>c.dataset.id);
  let done=0;
  for(let i=0;i<ids.length;i++){
    btn.innerHTML=`⏳ Generando ${i+1}/${ids.length}…`;
    const item=colaCache.find(r=>(r['ID']||r.id)===ids[i]);
    if(!item) continue;
    try{ await generarEImprimir(item); done++; }catch(e){console.error(e);}
    await new Promise(r=>setTimeout(r,280));
  }
  await apiPost({accion:'marcar_impreso',ids});
  const local=JSON.parse(localStorage.getItem('cola_local_desem')||'[]');
  ids.forEach(id=>{
    const idx=local.findIndex(x=>x.id===id||x['ID']===id);
    if(idx>-1) local[idx]['Estado']='IMPRESO';
  });
  localStorage.setItem('cola_local_desem',JSON.stringify(local));
  await cargarCola();
  btn.disabled=false;
  btn.innerHTML=`⬇️ Generar seleccionados (<span id="cntSel">0</span>)`;
  showAlert('f_alert','s',`✅ ${done} oficio(s) generado(s) y marcados como impresos.`);
}

async function imprimirUno(id){
  const ok=cargarPlantilla();
  if(!ok) return;
  const item=colaCache.find(r=>(r['ID']||r.id)===id);
  if(!item) return;
  try{
    await generarEImprimir(item);
    await apiPost({accion:'marcar_impreso',ids:[id]});
    const local=JSON.parse(localStorage.getItem('cola_local_desem')||'[]');
    const idx=local.findIndex(x=>x.id===id||x['ID']===id);
    if(idx>-1) local[idx]['Estado']='IMPRESO';
    localStorage.setItem('cola_local_desem',JSON.stringify(local));
    await cargarCola();
  }catch(e){alert('Error: '+e.message);}
}

async function generarEImprimir(item){
  const d={
    tipoOficio: item['Tipo Oficio']||'',
    numOficio:  item['N° Oficio']||'',
    fecha:      item['Fecha Oficio']||'',
    nombre:     item['Contribuyente']||'',
    cedula:     item['Cédula/NIT']||'',
    concepto:   item['Concepto']||'',
    radicado:   item['Radicado']||'',
    fechaAuto:  item['Fecha Auto']||'',
    motivo:     item['Motivo']||'',
    proyNombre: item['Proyectó']||'',
    proyFecha:  '',
  };
  // Detectar bancos del concepto (cola sin radicado los reconstruye desde CONCEPTOS)
  const bancos=item._bancos||(d.concepto&&CONCEPTOS[d.concepto]
    ?Object.entries(CONCEPTOS[d.concepto]).map(([banco,radicado])=>({banco,radicado}))
    :null);
  // Si el registro no trae radicado, tomarlo del concepto.
  // Banco único (ej. "TODOS LOS BANCOS" de TRÁNSITO 2023): radicado directo.
  if(!d.radicado && bancos && bancos.length===1){
    d.radicado = bancos[0].radicado;
  }
  let blob;
  if(bancos&&bancos.length>1) blob=await generarDocxMulti(d,bancos);
  else blob=await generarDocx(d);
  const nombre=`Oficio_${(d.nombre||'').split(' ')[0]}_${d.numOficio||'SN'}.docx`.replace(/[^a-zA-Z0-9_.]/g,'_');
  dlBlob(blob,nombre);
}

// ── Modal de confirmación Teodoro para eliminar ──
let _pendingDeleteId = null;

function eliminarCola(id){
  const item = colaCache.find(r=>(r['ID']||r.id)===id);
  const nombre = item ? (item['Contribuyente']||'este registro') : 'este registro';
  document.getElementById('delNombre').textContent = nombre;
  _pendingDeleteId = id;
  document.getElementById('modalEliminar').classList.add('open');
}

async function confirmarEliminar(){
  const id = _pendingDeleteId;
  if(!id){ cancelarEliminar(); return; }
  document.getElementById('btnConfirmarDel').disabled = true;
  document.getElementById('btnConfirmarDel').textContent = '⏳ Eliminando…';
  await apiPost({accion:'eliminar_cola', id});
  const local = JSON.parse(localStorage.getItem('cola_local_desem')||'[]');
  localStorage.setItem('cola_local_desem', JSON.stringify(
    local.filter(x => x.id !== id && x['ID'] !== id)
  ));
  _pendingDeleteId = null;
  cancelarEliminar();
  await cargarCola();
}


// ════════════════════════════════════════
// PDF UNIFICADO — impresión de todos los seleccionados
// ════════════════════════════════════════
async function generarPdfUnificado(){
  const checks=[...document.querySelectorAll('.chk-cola:checked')];
  if(!checks.length){ alert('Selecciona al menos un oficio.'); return; }

  const btn=document.getElementById('btnPdfSel');
  btn.disabled=true;
  btn.innerHTML='⏳ Preparando…';

  const ids=checks.map(c=>c.dataset.id);
  const items=ids.map(id=>colaCache.find(r=>(r['ID']||r.id)===id)).filter(Boolean);

  // Construir HTML de cada oficio
  const paginas = items.map((item,idx) => {
    const nombre   = item['Contribuyente'] || '—';
    const cedula   = item['Cédula/NIT']    || '—';
    const tipo     = item['Tipo Oficio']   || '—';
    const concepto = item['Concepto']      || '—';
    const radicado = item['Radicado']      || '—';
    const fechaAuto= item['Fecha Auto']    || '—';
    const motivo   = item['Motivo']        || '—';
    const fecha    = item['Fecha Oficio']  || item['Fecha'] || '—';
    const proyNom  = item['Proyectó']      || item['Funcionario'] || '—';
    const numOficio= item['N° Oficio']     || '1070.02';
    const funcion  = item['Funcionario']   || '—';

    // Formatear fecha larga
    const meses=['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    let fechaLarga = fecha;
    try{
      const [d,m,y] = fecha.includes('-') ? fecha.split('-') : fecha.split('/');
      const dd=parseInt(d), mm=parseInt(m)-1, yy=parseInt(y);
      fechaLarga = `${dd} de ${meses[mm]} de ${yy}`;
    }catch(e){}

    return `
    <div class="oficio-page" ${idx>0?'style="page-break-before:always"':''}>
      <div class="oficio-header">
        <div class="oficio-membrete">
          <div class="oficio-logo">🏛️</div>
          <div>
            <div class="oficio-entidad">ALCALDÍA DE BELLO</div>
            <div class="oficio-dep">Dirección Administrativa de Ejecuciones Fiscales</div>
          </div>
        </div>
        <div class="oficio-num-fecha">
          <div><strong>Oficio N°</strong> ${numOficio}</div>
          <div>Bello, ${fechaLarga}</div>
        </div>
      </div>

      <div class="oficio-asunto">
        <strong>ASUNTO:</strong> ${tipo} — Radicado(s): <span class="oficio-rad">${radicado}</span>
      </div>

      <div class="oficio-destinatario">
        <strong>Señores:</strong><br>
        Entidades Bancarias y Financieras / Autoridades competentes<br>
        <strong>Ciudad</strong>
      </div>

      <div class="oficio-cuerpo">
        <p>La Dirección Administrativa de Ejecuciones Fiscales de la Alcaldía de Bello, en uso de sus facultades legales,
        <strong>${tipo.toLowerCase().includes('desembargo')?'LEVANTA':'ORDENA'}</strong>
        la medida cautelar que pesa sobre el contribuyente identificado a continuación,
        por concepto de <strong>${concepto}</strong>, toda vez que el motivo es:
        <strong>${motivo}</strong>.</p>

        <p>Fecha del auto que ordena el ${tipo.toLowerCase().includes('desembargo')?'levantamiento':'embargo'}: <u>${fechaAuto}</u></p>
      </div>

      <div class="oficio-tabla">
        <table>
          <thead>
            <tr>
              <th>Contribuyente</th>
              <th>Cédula / NIT</th>
              <th>Concepto / Radicado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${nombre}</strong></td>
              <td>${cedula}</td>
              <td>${concepto} ${radicado}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="oficio-firmas">
        <div class="oficio-firma">
          <div class="firma-linea"></div>
          <div class="firma-nombre">${proyNom}</div>
          <div class="firma-cargo">Proyectó</div>
        </div>
        <div class="oficio-firma">
          <div class="firma-linea"></div>
          <div class="firma-nombre">Director(a)</div>
          <div class="firma-cargo">Dirección de Ejecuciones Fiscales</div>
        </div>
      </div>

      <div class="oficio-pie">
        Generado por Sistema de Oficios — Alcaldía de Bello &nbsp;·&nbsp;
        Funcionario: ${funcion} &nbsp;·&nbsp; ${new Date().toLocaleString('es-CO')}
      </div>
    </div>`;
  }).join('');

  // CSS de impresión
  const estilos = `
    @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; }
    .oficio-page { padding: 2cm 2.5cm; min-height: 27cm; position: relative; }
    @media print {
      .oficio-page { page-break-after: always; padding: 1.5cm 2cm; }
      .oficio-page:last-child { page-break-after: avoid; }
    }
    .oficio-header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #0f2d5e; padding-bottom: 10px; margin-bottom: 16px; }
    .oficio-membrete { display: flex; align-items: center; gap: 12px; }
    .oficio-logo { font-size: 32px; }
    .oficio-entidad { font-size: 14pt; font-weight: 700; color: #0f2d5e; }
    .oficio-dep { font-size: 9pt; color: #555; margin-top: 2px; }
    .oficio-num-fecha { text-align: right; font-size: 10pt; color: #333; line-height: 1.8; }
    .oficio-asunto { background: #f0f4ff; border-left: 4px solid #0f2d5e;
      padding: 8px 12px; margin-bottom: 16px; font-size: 10.5pt; border-radius: 0 4px 4px 0; }
    .oficio-rad { color: #dc2626; font-weight: 700; }
    .oficio-destinatario { margin-bottom: 16px; font-size: 10.5pt; line-height: 1.7; }
    .oficio-cuerpo { margin-bottom: 16px; font-size: 10.5pt; line-height: 1.8; text-align: justify; }
    .oficio-cuerpo p { margin-bottom: 10px; }
    .oficio-tabla { margin-bottom: 24px; }
    .oficio-tabla table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .oficio-tabla th { background: #0f2d5e; color: #fff; padding: 7px 10px; text-align: left; }
    .oficio-tabla td { border: 1px solid #d1d5db; padding: 7px 10px; }
    .oficio-tabla tr:nth-child(even) td { background: #f9fafb; }
    .oficio-firmas { display: flex; gap: 40px; margin-top: 40px; margin-bottom: 16px; }
    .oficio-firma { flex: 1; text-align: center; }
    .firma-linea { border-top: 1px solid #333; margin-bottom: 6px; }
    .firma-nombre { font-weight: 700; font-size: 10pt; }
    .firma-cargo { font-size: 9pt; color: #555; }
    .oficio-pie { font-size: 8pt; color: #aaa; border-top: 1px solid #e5e7eb;
      padding-top: 8px; text-align: center; position: absolute; bottom: 1cm; left: 2.5cm; right: 2.5cm; }
  `;

  // Abrir ventana de impresión
  const win = window.open('', '_blank', 'width=900,height=700');
  if(!win){ alert('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio.'); btn.disabled=false; btn.innerHTML='🖨️ Imprimir PDF unificado (<span id="cntSelPdf">0</span>)'; return; }

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Oficios — ${new Date().toLocaleDateString('es-CO')} — ${items.length} oficio(s)</title>
  <style>${estilos}</style>
</head>
<body>
  ${paginas}
  <script>
    window.onload = function(){
      window.print();
      // No cerrar automáticamente — el usuario puede guardar como PDF
    };
  <\/script>
</body>
</html>`);
  win.document.close();

  // Marcar como impresos
  await apiPost({accion:'marcar_impreso', ids});
  const local=JSON.parse(localStorage.getItem('cola_local_desem')||'[]');
  ids.forEach(id=>{
    const idx=local.findIndex(x=>x.id===id||x['ID']===id);
    if(idx>-1) local[idx]['Estado']='IMPRESO';
  });
  localStorage.setItem('cola_local_desem',JSON.stringify(local));
  await cargarCola();

  btn.disabled=false;
  btn.innerHTML=`🖨️ Imprimir PDF unificado (<span id="cntSelPdf">0</span>)`;
  actualizarConteoSel();
}
function cancelarEliminar(){
  document.getElementById('modalEliminar').classList.remove('open');
  document.getElementById('btnConfirmarDel').disabled = false;
  document.getElementById('btnConfirmarDel').innerHTML = '🗑️ Sí, eliminar';
  _pendingDeleteId = null;
}

// ════════════════════════════════════════
// HISTORIAL POR CONTRIBUYENTE
// ════════════════════════════════════════
function buscarHistorial(q){
  const el=document.getElementById('h_resultado');
  if(!q||q.length<3){
    el.innerHTML='<span style="color:var(--soft)">Escriba al menos 3 caracteres para buscar.</span>';
    return;
  }
  const v=q.toLowerCase();
  const todos=[...cache,...colaCache];
  const encontrados=todos.filter(r=>{
    const nom=(r['Contribuyente']||r.nombre||'').toLowerCase();
    const ced=(r['Cédula/NIT']||r.cedula||'').toLowerCase();
    return nom.includes(v)||ced.includes(v);
  });
  if(!encontrados.length){
    el.innerHTML=`<div style="text-align:center;padding:28px;color:var(--soft)">📂 Sin registros para "<strong>${q}</strong>"</div>`;
    return;
  }
  // Agrupar por nombre
  const grupos={};
  encontrados.forEach(r=>{
    const key=(r['Contribuyente']||r.nombre||'Sin nombre').toUpperCase();
    if(!grupos[key]) grupos[key]=[];
    grupos[key].push(r);
  });
  el.innerHTML=Object.entries(grupos).map(([nombre,regs])=>`
    <div class="hist-grupo">
      <div class="hist-grupo-head">
        <span class="hist-grupo-name">👤 ${nombre}</span>
        <span class="hist-grupo-count">${regs.length} oficio(s)</span>
      </div>
      <div class="tbl-wrap" style="border-radius:0;border:none">
        <table style="min-width:500px">
          <thead><tr>
            <th>Fecha</th><th>Tipo</th><th>N°Oficio</th>
            <th>Concepto</th><th>Radicado</th><th>Motivo</th><th>Funcionario</th>
          </tr></thead>
          <tbody>
            ${regs.map(r=>{
              const tipo=r['Tipo Oficio']||'';
              const tagCls=tipo.startsWith('Desembargo')?'tag-desembargo':tipo.startsWith('Embargo')?'tag-embargo':'tag-otro';
              return`<tr>
                <td class="mono" style="font-size:11px">${r['Fecha']||r['Fecha Oficio']||'—'}</td>
                <td><span class="tipo-tag ${tagCls}">${tipo}</span></td>
                <td class="mono">${r['N° Oficio']||'—'}</td>
                <td style="font-size:11px;color:var(--soft)">${r['Concepto']||'—'}</td>
                <td class="mono" style="font-size:11px;color:var(--soft)">${r['Radicado']||'—'}</td>
                <td style="font-size:11px">${r['Motivo']||'—'}</td>
                <td style="font-size:11px;color:var(--soft)">${r['Funcionario']||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}

function limpiarHistorial(){
  const el=document.getElementById('h_buscar');
  if(el) el.value='';
  document.getElementById('h_resultado').innerHTML=
    'Escriba al menos 3 caracteres para buscar.';
}

// ════════════════════════════════════════
// EXPORTAR PLANILLA
// ════════════════════════════════════════
function exportarPlanilla(){
  const todos = [...colaCache, ...cache];
  if(!todos.length){ alert('No hay datos para exportar.'); return; }

  const cols = [
    'ID','Fecha','Hora','Estado','Tipo Oficio','N\u00b0 Oficio',
    'Fecha Oficio','Contribuyente','C\u00e9dula/NIT','Concepto',
    'Radicado','Fecha Auto','Motivo','Proyecto\u0301','Funcionario',
    'Equipo','Observaci\u00f3n'
  ];

  var BOM = '\uFEFF';
  var CRLF = '\r\n';
  var SEP = ';';

  var lines = [BOM + cols.join(SEP)];

  var vistos = new Set();
  todos.forEach(function(r){
    var id = r['ID']||r.id||'';
    if(id && vistos.has(id)) return;
    if(id) vistos.add(id);
    var fila = cols.map(function(col){
      var val = String(r[col] || '').replace(/"/g, '""');
      if(val.indexOf(SEP)!==-1 || val.indexOf('"')!==-1 || val.indexOf('\n')!==-1)
        val = '"' + val + '"';
      return val;
    });
    lines.push(fila.join(SEP));
  });

  var csv = lines.join(CRLF);
  var fecha = new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url;
  a.download = 'Planilla_Desembargos_' + fecha + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
