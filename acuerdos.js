const GAS_INDEX   = "https://script.google.com/macros/s/AKfycbwzZWWIj2zx4_S-qNOK2SRtUsbKm8SIdsyTtIDDLOeKqmH7dsNcngboxo5c7XQ9dfFRlA/exec";
const GAS_ACUERDOS= "https://script.google.com/macros/s/AKfycbzEpNUeH2kZs2cxSw64rM9q8T6vWCfSZxPvCOwjXS41IGulD7Ud-TGWdnyHrEd6JJE/exec";
const PKEY = 'acuerdos_pendientes_v3';
var proyeccion = [];
var pendienteActivo = null;
var tipoSeleccionado = 'IP — Impuesto Predial';

// ── TIPO SELECTOR ──
function selTipo(btn){
  document.querySelectorAll('.tipo-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  tipoSeleccionado = btn.dataset.tipo;
  // Ocultar todos los condicionales
  ['cond-ica','cond-ou','cond-policia','cond-otro'].forEach(function(id){
    document.getElementById(id).classList.remove('show');
  });
  // Mostrar el correspondiente
  if(tipoSeleccionado.startsWith('ICA'))    document.getElementById('cond-ica').classList.add('show');
  if(tipoSeleccionado.startsWith('OU'))     document.getElementById('cond-ou').classList.add('show');
  if(tipoSeleccionado.startsWith('PM'))     document.getElementById('cond-policia').classList.add('show');
  if(tipoSeleccionado.startsWith('OTR'))    document.getElementById('cond-otro').classList.add('show');
}

// ── TABS ──
function goTab(t){
  var pN=document.getElementById('panel-nuevo');
  var pP=document.getElementById('panel-pend');
  var tN=document.getElementById('tab-nuevo');
  var tP=document.getElementById('tab-pend');
  if(t==='pendientes'){
    pN.style.display='none'; pP.style.display='block';
    tN.classList.remove('active'); tP.classList.add('active');
    renderPend();
  } else {
    pN.style.display='block'; pP.style.display='none';
    tP.classList.remove('active'); tN.classList.add('active');
  }
}

// ── PENDIENTES ──
function getPend(){ try{return JSON.parse(localStorage.getItem(PKEY)||'[]');}catch(e){return[];} }
function setPend(lista){ localStorage.setItem(PKEY,JSON.stringify(lista)); updateBadge(); }
function updateBadge(){ var b=document.getElementById('badge'); if(b) b.textContent=getPend().length||'0'; }

function getTipoClass(tipo){
  if(!tipo) return 'otro';
  if(tipo.startsWith('IP')) return 'predial';
  if(tipo.startsWith('ICA')) return 'ica';
  if(tipo.startsWith('OU')) return 'urbanisticas';
  if(tipo.startsWith('PM')) return 'policia';
  return 'otro';
}

function savePend(d){
  var lista=getPend();
  lista.unshift({
    id:'P'+Date.now(),
    fecha:new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}),
    hora:new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),
    nombres:d.nombres, apellidos:d.apellidos, cedula:d.cedula,
    tipoObligacion:d.tipoObligacion, valorFactura:d.valorFactura,
    cuotaInicial:d.cuotaInicial, numCuotas:d.numCuotas,
    funcionario:d.funcionario, tasaMensual:d.tasaMensual
  });
  setPend(lista);
}

function renderPend(filtro){
  var lista=getPend();
  if(filtro){
    var f=filtro.toLowerCase();
    lista=lista.filter(function(p){
      return ((p.nombres||'')+' '+(p.apellidos||'')).toLowerCase().indexOf(f)>=0||(p.cedula||'').indexOf(f)>=0;
    });
  }
  var el=document.getElementById('lista-pend');
  if(!el) return;
  if(!lista.length){
    el.innerHTML='<div class="pempty"><div class="pempty-icon">📋</div><p style="font-size:14px;color:var(--soft)">No hay acuerdos pendientes de pago</p><p style="font-size:12px;color:var(--muted);margin-top:4px">Los acuerdos aparecerán aquí al generar el formulario F-GAF-68</p></div>';
    return;
  }
  var html='';
  for(var i=0;i<lista.length;i++){
    var p=lista[i];
    var tc=getTipoClass(p.tipoObligacion);
    html+='<div class="pitem">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'+
        '<span class="pnombre">'+eh(p.nombres)+' '+eh(p.apellidos)+'</span>'+
        '<span style="font-size:11px;color:var(--muted)">'+eh(p.fecha)+' '+eh(p.hora)+'</span>'+
      '</div>'+
      '<span class="ptipo '+tc+'">'+eh(p.tipoObligacion)+'</span>'+
      '<div class="pdatos">'+
        '<span><b style="color:rgba(255,255,255,.7)">CC/NIT:</b> '+eh(p.cedula)+'</span>'+
        '<span><b style="color:rgba(255,255,255,.7)">Factura:</b> '+fmtN(p.valorFactura)+'</span>'+
        '<span><b style="color:rgba(255,255,255,.7)">Cuota inicial:</b> '+fmtN(p.cuotaInicial)+'</span>'+
        '<span><b style="color:rgba(255,255,255,.7)">Cuotas:</b> '+eh(p.numCuotas)+'</span>'+
        '<span><b style="color:rgba(255,255,255,.7)">Funcionario:</b> '+eh(p.funcionario)+'</span>'+
      '</div>'+
      '<div class="pbtns">'+
        '<button class="pbtn pbtn-pago" onclick="abrirDesDe(\''+p.id+'\')">✅ Pagó — Enviar a desembargo</button>'+
        '<button class="pbtn pbtn-del" onclick="delPend(\''+p.id+'\')">🗑️ Eliminar</button>'+
      '</div>'+
    '</div>';
  }
  el.innerHTML=html;
}

function filtrarPend(){ renderPend(document.getElementById('search-pend').value); }
function delPend(id){
  if(!confirm('¿Eliminar este acuerdo de la lista?')) return;
  setPend(getPend().filter(function(p){return p.id!==id;}));
  renderPend();
}
function abrirDesDe(id){
  var p=getPend().filter(function(x){return x.id===id;})[0];
  if(!p) return;
  pendienteActivo=p;
  document.getElementById('des-nom').textContent=(p.nombres||'')+' '+(p.apellidos||'');
  document.getElementById('des-ced').textContent=p.cedula||'';
  document.getElementById('des-tip').textContent=p.tipoObligacion||'';
  document.getElementById('des-rad').value='';
  document.getElementById('des-conc').value='';
  document.getElementById('des-obs').value='Acuerdo de pago — cuota inicial cancelada';
  document.getElementById('des-st').style.display='none';
  document.getElementById('des-ov').classList.add('open');
}

// ── CALCULADORA ──
function calcular(){
  var vF=parseFloat(document.getElementById('valorFactura').value)||0;
  var vI=parseFloat(document.getElementById('cuotaInicial').value)||0;
  var nC=parseInt(document.getElementById('numCuotas').value)||0;
  var tP=parseFloat(document.getElementById('tasaMensual').value)||0;
  var ta=tP/100;
  var vFin=Math.max(0,vF-vI);
  document.getElementById('valorFinanciar').value=Math.round(vFin);
  proyeccion=[];
  document.getElementById('c-fac').textContent=fmt(vF);
  document.getElementById('c-ini').textContent=fmt(vI);
  document.getElementById('c-fin').textContent=fmt(vFin);
  document.getElementById('c-ncu').textContent=nC||'—';
  document.getElementById('c-tas').textContent=tP?tP+'%':'—';
  if(vFin>0&&nC>0&&ta>0){
    var cuo=vFin*(ta*Math.pow(1+ta,nC))/(Math.pow(1+ta,nC)-1);
    document.getElementById('valorCuota').value=Math.round(cuo);
    var saldo=vFin, totalInt=0;
    for(var i=1;i<=nC;i++){
      var interes=saldo*ta;
      var capital=cuo-interes;
      saldo-=capital; totalInt+=interes;
      proyeccion.push({cuota:i,valorCuota:cuo,interes:interes,capital:capital,saldo:Math.max(0,saldo)});
    }
    document.getElementById('c-int').textContent=fmt(totalInt);
    document.getElementById('c-cuo').textContent=fmt(cuo);
    var tbody=document.getElementById('tbody-proy');
    tbody.innerHTML=proyeccion.map(function(p){
      return '<tr><td>'+p.cuota+'</td><td>'+fc(p.valorCuota)+'</td><td>'+fc(p.interes)+'</td><td>'+fc(p.capital)+'</td><td>'+fc(p.saldo)+'</td></tr>';
    }).join('');
    document.getElementById('amort-wrap').style.display='block';
  } else {
    document.getElementById('valorCuota').value='';
    document.getElementById('c-int').textContent='$ 0';
    document.getElementById('c-cuo').textContent='$ 0';
    document.getElementById('amort-wrap').style.display='none';
  }
}

function fmt(n){ return '$ '+Math.round(n||0).toLocaleString('es-CO'); }
function fmtN(n){ return '$ '+Math.round(n||0).toLocaleString('es-CO'); }
function fc(n){ return Math.round(n||0).toLocaleString('es-CO'); }
function eh(v){ if(!v&&v!==0)return''; return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── GET TIPO DESCRIPCIÓN COMPLETA ──
function getTipoDesc(){
  var base=tipoSeleccionado;
  if(tipoSeleccionado.startsWith('ICA')){
    var vigencias=[...document.querySelectorAll('#ica-vigencias input:checked')].map(function(c){return 'ICA '+c.value;});
    var res=document.getElementById('ica-resolucion').value.trim();
    if(vigencias.length) base='ICA — '+vigencias.join(', ');
    if(res) base+=' ('+res+')';
  } else if(tipoSeleccionado.startsWith('OU')){
    var lote=document.getElementById('ou-lote').value.trim();
    var resou=document.getElementById('ou-resolucion').value.trim();
    if(lote) base+=' — Lote '+lote;
    if(resou) base+=' '+resou;
  } else if(tipoSeleccionado.startsWith('PM')){
    var comp=document.getElementById('pm-orden').value.trim();
    var inf=document.getElementById('pm-infraccion').value.trim();
    if(comp) base+=' — Comparendo N°'+comp;
    if(inf) base+=' ('+inf+')';
  } else if(tipoSeleccionado.startsWith('OTR')){
    var desc=document.getElementById('otro-desc').value.trim();
    if(desc) base=desc;
  }
  return base;
}

// ── VALIDAR ──
function validar(){
  var req=[['tasaMensual','Tasa mensual'],['funcionario','Funcionario'],['nombres','Nombres'],['apellidos','Apellidos'],['cedula','Cédula'],['valorFactura','Valor factura'],['cuotaInicial','Cuota inicial'],['numCuotas','Número de cuotas']];
  for(var i=0;i<req.length;i++){
    var el=document.getElementById(req[i][0]);
    if(!el||!el.value.trim()){setSt('err','⚠️ El campo "'+req[i][1]+'" es obligatorio.');if(el)el.focus();return false;}
  }
  if(!proyeccion.length){setSt('err','⚠️ Verifique los valores — la proyección no está calculada.');return false;}
  // Validar ICA
  if(tipoSeleccionado.startsWith('ICA')){
    var vigChecks=[...document.querySelectorAll('#ica-vigencias input:checked')];
    if(!vigChecks.length){setSt('err','⚠️ Seleccione al menos una vigencia de ICA.');return false;}
  }
  return true;
}

function setSt(tipo,msg){
  var el=document.getElementById('st');
  el.className='st show-'+tipo;
  el.innerHTML=tipo==='load'?'<div class="spin"></div><span>'+msg+'</span>':msg;
}

// ── GETDATOS ──
function getDatos(){
  var ocu=document.querySelector('input[name="ocu"]:checked');
  return {
    tipoObligacion: getTipoDesc(),
    tasaMensual: document.getElementById('tasaMensual').value,
    mesInicio: document.getElementById('mesInicio').value,
    funcionario: document.getElementById('funcionario').value,
    nombres: document.getElementById('nombres').value,
    apellidos: document.getElementById('apellidos').value,
    tipoDoc: document.getElementById('tipoDoc').value,
    cedula: document.getElementById('cedula').value,
    telefono: document.getElementById('telefono').value,
    celular: document.getElementById('celular').value,
    correo: document.getElementById('correo').value,
    direccion: document.getElementById('direccion').value,
    ocupacion: ocu?ocu.value:'',
    cargo: document.getElementById('cargo').value,
    ingresoMensual: document.getElementById('ingresoMensual').value,
    valorFactura: parseFloat(document.getElementById('valorFactura').value)||0,
    cuotaInicial: parseFloat(document.getElementById('cuotaInicial').value)||0,
    valorFinanciar: parseFloat(document.getElementById('valorFinanciar').value)||0,
    numCuotas: parseInt(document.getElementById('numCuotas').value)||0,
    cod_nombres: document.getElementById('cod_nombres').value,
    cod_apellidos: document.getElementById('cod_apellidos').value,
    cod_tipoDoc: document.getElementById('cod_tipoDoc').value,
    cod_cedula: document.getElementById('cod_cedula').value,
    cod_telefono: document.getElementById('cod_telefono').value,
    cod_direccion: document.getElementById('cod_direccion').value,
    matricula: document.getElementById('matricula').value,
    cod_dirPredio: document.getElementById('cod_dirPredio').value
  };
}

// ── REGISTRAR EN SHEET ──
async function registrarSheet(d){
  try{
    var p=new URLSearchParams({accion:'registrar',funcionario:d.funcionario,tipoObligacion:d.tipoObligacion,nombres:d.nombres,apellidos:d.apellidos,cedula:d.cedula,telefono:d.telefono,celular:d.celular,correo:d.correo,direccion:d.direccion,valorFactura:d.valorFactura,cuotaInicial:d.cuotaInicial,valorFinanciar:d.valorFinanciar,numCuotas:d.numCuotas,valorCuota:proyeccion[0]?Math.round(proyeccion[0].valorCuota):0,totalIntereses:Math.round(proyeccion.reduce(function(s,x){return s+x.interes;},0)),tasaMensual:d.tasaMensual,mesInicio:d.mesInicio,ocupacion:d.ocupacion,ingresoMensual:d.ingresoMensual});
    await fetch(GAS_ACUERDOS+'?'+p);
  }catch(e){console.warn('Sheet error:',e.message);}
}

// ── GENERAR FORMULARIO ──
async function generarFormulario(){
  if(!validar()) return;
  setSt('load','Generando formulario F-GAF-68...');
  try{
    var d=getDatos();
    await registrarSheet(d);
    savePend(d); updateBadge();
    mostrarFormPrev(d);
    setSt('ok','✅ Formulario generado. Quedó en la lista de pendientes de pago.');
    document.getElementById('btn-des').style.display='flex';
    pendienteActivo=null;
  }catch(e){setSt('err','❌ Error: '+e.message);}
}

function mostrarFormPrev(d){
  var fecha=new Date().toLocaleDateString('es-CO');
  document.getElementById('prev-title').textContent='📄 F-GAF-68 — '+d.apellidos+', '+d.nombres;
  document.getElementById('prev-doc').innerHTML=
    '<table class="dh-table"><tr><td style="width:15%;text-align:center;font-weight:bold;font-size:11pt">1070.02</td><td class="dh-blue">SOLICITUD ACUERDOS Y/O CONVENIOS DE PAGO</td><td style="width:18%;text-align:center"><b>FECHA:</b><br>'+fecha+'</td></tr></table>'+
    '<div class="dsec">INFORMACIÓN DEL CONTRIBUYENTE</div>'+
    '<div class="dfila"><b>Nombres:</b> '+eh(d.nombres)+' &nbsp;&nbsp; <b>Apellidos:</b> '+eh(d.apellidos)+'</div>'+
    '<div class="dfila"><b>Tipo documento:</b> '+eh(d.tipoDoc)+' &nbsp;&nbsp; <b>Número:</b> '+eh(d.cedula)+'</div>'+
    '<div class="dfila"><b>Origen obligación:</b> '+eh(d.tipoObligacion)+'</div>'+
    '<div class="dfila"><b>Dirección:</b> '+eh(d.direccion||'___________________________')+'</div>'+
    '<div class="dfila"><b>Teléfono:</b> '+eh(d.telefono||'_______________')+' &nbsp;&nbsp; <b>Celular:</b> '+eh(d.celular||'_______________')+'</div>'+
    '<div class="dfila"><b>Correo:</b> '+eh(d.correo||'___________________________')+'</div>'+
    '<div class="dfila"><b>Valor factura:</b> '+fmt(d.valorFactura)+'</div>'+
    '<div class="dfila"><b>Cuota inicial:</b> '+fmt(d.cuotaInicial)+' &nbsp;&nbsp; <b>Valor a financiar:</b> '+fmt(d.valorFinanciar)+' &nbsp;&nbsp; <b>N° cuotas:</b> '+d.numCuotas+'</div>'+
    '<div class="dfila"><b>Ocupación:</b> '+eh(d.ocupacion||'_______________')+' &nbsp;&nbsp; <b>Ingreso mensual:</b> '+(d.ingresoMensual?fmt(d.ingresoMensual):'_______________')+'</div>'+
    '<div class="dsec">INFORMACIÓN DEL CODEUDOR</div>'+
    '<div class="dfila"><b>Nombres:</b> '+eh(d.cod_nombres||'___________________________')+' &nbsp;&nbsp; <b>Apellidos:</b> '+eh(d.cod_apellidos||'___________________________')+'</div>'+
    '<div class="dfila"><b>Tipo documento:</b> '+eh(d.cod_tipoDoc)+' &nbsp;&nbsp; <b>Número:</b> '+eh(d.cod_cedula||'_______________')+'</div>'+
    '<div class="dfila"><b>Dirección:</b> '+eh(d.cod_direccion||'___________________________')+' &nbsp;&nbsp; <b>Teléfono:</b> '+eh(d.cod_telefono||'_______________')+'</div>'+
    '<div class="dfila"><b>Matrícula:</b> '+eh(d.matricula||'_______________')+' &nbsp;&nbsp; <b>Dir. predio:</b> '+eh(d.cod_dirPredio||'_______________')+'</div>'+
    '<div class="dsec">AUTORIZACIÓN</div>'+
    '<p class="dnota">- REPORTE A CONTADURÍA GRAL DE LA NACIÓN: tanto el titular de la obligación, como el deudor solidario, a través del presente convenio autorizan a la administración Municipal para la consulta, reporte y suministro de información a la contaduría general de la nación, división de deudores morosos del estado; según la ley 1266 de 2008 en el artículo 3º y la sentencia c-1011 de 2008.</p>'+
    '<p class="dnota">- Así mismo autorizo recibir la notificación por correo electrónico en caso de inicio del cobro coactivo.</p>'+
    '<p class="dnota">- Autorizo que si pasados cinco (5) días hábiles NO SE HA LEGALIZADO el convenio solicitado por parte del contribuyente será anulado, y el saldo existente se cargará en el próximo periodo de facturación.</p>'+
    '<table class="dfirmas"><tr><td>'+eh(d.nombres)+' '+eh(d.apellidos)+'<br><span style="font-size:8pt;font-weight:normal">'+eh(d.tipoDoc)+': '+eh(d.cedula)+'</span></td><td>FIRMA</td><td>AUTORIZO</td></tr></table>'+
    '<table class="dpie"><tr><td>Código: F-GAF-68</td><td class="dpie-blue">Versión: 03 | Fecha: 2026/01/01</td><td style="text-align:center">Página 1 de 1</td></tr></table>';
  abrirPrev();
}

// ── PROYECCIÓN ──
async function generarProyeccion(){
  if(!validar()) return;
  setSt('load','Generando proyección de pagos...');
  try{
    var d=getDatos();
    var mi=document.getElementById('mesInicio').value;
    var fb=mi?new Date(mi+'-01'):new Date();
    var totalInt=proyeccion.reduce(function(s,p){return s+p.interes;},0);
    var cuo=proyeccion[0]?proyeccion[0].valorCuota:0;
    var filas=proyeccion.map(function(p,i){
      var fc2=new Date(fb); fc2.setMonth(fc2.getMonth()+i);
      var mes=fc2.toLocaleDateString('es-CO',{month:'long',year:'numeric'});
      return '<tr><td style="text-align:center">'+p.cuota+'</td><td>'+mes+'</td><td style="text-align:right">'+fc(p.valorCuota)+'</td><td style="text-align:right">'+fc(p.interes)+'</td><td style="text-align:right">'+fc(p.capital)+'</td><td style="text-align:right">'+fc(p.saldo)+'</td></tr>';
    }).join('');
    document.getElementById('prev-title').textContent='📊 Proyección — '+d.apellidos+', '+d.nombres;
    document.getElementById('prev-doc').innerHTML=
      '<div style="background:#0f2d5e;color:white;text-align:center;padding:10px;font-weight:bold;font-size:12pt">SECRETARÍA DE RECAUDOS Y PAGOS</div>'+
      '<div style="text-align:center;font-size:10pt;color:#0f2d5e;margin:6pt 0;font-weight:bold">DIRECCIÓN ADMINISTRATIVA DE EJECUCIONES FISCALES<br>PROYECCIÓN DE PAGOS — CONVENIO DE PAGO</div>'+
      '<table class="ddatos"><tr><td class="lbl">DEUDOR</td><td colspan="3">'+eh(d.nombres)+' '+eh(d.apellidos)+'</td></tr><tr><td class="lbl">CÉDULA</td><td>'+eh(d.cedula)+'</td><td class="lbl">TELÉFONO</td><td>'+eh(d.celular||d.telefono||'—')+'</td></tr><tr><td class="lbl">CONCEPTO</td><td>'+eh(d.tipoObligacion)+'</td><td class="lbl">TASA MENSUAL</td><td>'+eh(d.tasaMensual)+'%</td></tr><tr><td class="lbl">VALOR FACTURA</td><td>'+fmt(d.valorFactura)+'</td><td class="lbl">CUOTA INICIAL</td><td>'+fmt(d.cuotaInicial)+'</td></tr><tr><td class="lbl">V/FINANCIACIÓN</td><td>'+fmt(d.valorFinanciar)+'</td><td class="lbl">V/CUOTA</td><td>'+fmt(cuo)+'</td></tr><tr><td class="lbl">N° CUOTAS</td><td>'+d.numCuotas+'</td><td class="lbl">TOTAL INTERESES</td><td>'+fmt(totalInt)+'</td></tr></table>'+
      '<table class="damort"><thead><tr><th>#</th><th>MES</th><th>VALOR CUOTA</th><th>ABONO INTERÉS</th><th>ABONO CAPITAL</th><th>SALDO CAPITAL</th></tr></thead><tbody>'+filas+'</tbody></table>'+
      '<table class="dfirmas"><tr><td>'+eh(d.funcionario)+'</td><td>JUAN PABLO GÓMEZ</td><td>&nbsp;</td></tr><tr style="border:none"><td style="border:none;font-size:8pt">ELABORÓ</td><td style="border:none;font-size:8pt">REVISÓ</td><td style="border:none;font-size:8pt">AUTORIZÓ</td></tr></table>';
    abrirPrev();
    setSt('ok','✅ Proyección generada.');
  }catch(e){setSt('err','❌ Error: '+e.message);}
}

// ── VISTA PREVIA ──
function abrirPrev(){ document.getElementById('prev-ov').classList.add('open'); document.body.style.overflow='hidden'; }
function cerrarPrev(){ document.getElementById('prev-ov').classList.remove('open'); document.body.style.overflow=''; }

// ── DESEMBARGO ──
function abrirDes(){
  var d=getDatos();
  pendienteActivo=null;
  document.getElementById('des-nom').textContent=d.nombres+' '+d.apellidos;
  document.getElementById('des-ced').textContent=d.cedula;
  document.getElementById('des-tip').textContent=d.tipoObligacion;
  document.getElementById('des-rad').value='';
  document.getElementById('des-conc').value='';
  document.getElementById('des-obs').value='Acuerdo de pago — cuota inicial cancelada';
  document.getElementById('des-st').style.display='none';
  document.getElementById('des-ov').classList.add('open');
}
function cerrarDes(){ document.getElementById('des-ov').classList.remove('open'); }

async function enviarDes(){
  var d=pendienteActivo||getDatos();
  var rad=document.getElementById('des-rad').value.trim();
  var conc=document.getElementById('des-conc').value.trim();
  var obs=document.getElementById('des-obs').value.trim();
  var stEl=document.getElementById('des-st');
  stEl.style.cssText='display:flex;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:500;margin-top:10px;background:rgba(45,141,232,.15);color:#93c5fd;border:1px solid rgba(45,141,232,.3)';
  stEl.textContent='⏳ Enviando a la cola...';
  try{
    var fecha=new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'});
    var params=new URLSearchParams({accion:'encolar',tipoOficio:'Desembargo',numOficio:'',fechaOficio:fecha,nombre:(d.nombres||'')+' '+(d.apellidos||''),cedula:d.cedula||'',concepto:conc||d.tipoObligacion||'',radicado:rad||'(Pendiente)',fechaAuto:fecha,motivo:'Acuerdo de pago suscrito y cuota inicial cancelada',proyNombre:d.funcionario||'',funcionario:d.funcionario||'',equipo:'',observacion:obs||'Acuerdo de pago — cuota inicial cancelada',comparendo:''});
    await fetch(GAS_INDEX+'?'+params);
    var localCola=JSON.parse(localStorage.getItem('cola_local_desem')||'[]');
    localCola.unshift({id:'AC-'+Date.now(),'ID':'AC-'+Date.now(),'Fecha':fecha,'Hora':new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),'Funcionario':d.funcionario||'','Estado':'PENDIENTE','Tipo Oficio':'Desembargo','N° Oficio':'','Fecha Oficio':fecha,'Contribuyente':(d.nombres||'')+' '+(d.apellidos||''),'Cédula/NIT':d.cedula||'','Radicado':rad||'(Pendiente)','Concepto':conc||d.tipoObligacion||'','Motivo':'Acuerdo de pago suscrito y cuota inicial cancelada','Proyectó':d.funcionario||'','Observación':obs});
    localStorage.setItem('cola_local_desem',JSON.stringify(localCola));
    if(pendienteActivo){
      setPend(getPend().filter(function(p){return p.id!==pendienteActivo.id;}));
      pendienteActivo=null;
    }
    stEl.style.cssText='display:flex;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:500;margin-top:10px;background:rgba(22,163,74,.15);color:#86efac;border:1px solid rgba(22,163,74,.3)';
    stEl.textContent='✅ Enviado a la cola correctamente.';
    setTimeout(function(){cerrarDes();renderPend();},2000);
  }catch(e){
    stEl.style.cssText='display:flex;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:500;margin-top:10px;background:rgba(220,38,38,.15);color:#fca5a5;border:1px solid rgba(220,38,38,.3)';
    stEl.textContent='❌ Error: '+e.message;
  }
}

// ── LIMPIAR ──
function confirmarLimpiar(){
  var n=document.getElementById('nombres');
  var c=document.getElementById('cedula');
  if((!n||!n.value)&&(!c||!c.value)){limpiarForm();return;}
  document.getElementById('mLimpiar').classList.add('open');
}
function limpiarForm(){
  document.getElementById('mLimpiar').classList.remove('open');
  document.querySelectorAll('input[type=text],input[type=number],input[type=email],input[type=month],select,textarea').forEach(function(el){el.value='';});
  document.querySelectorAll('input[type=radio],input[type=checkbox]').forEach(function(el){el.checked=false;});
  document.getElementById('tipoDoc').value='C.C';
  document.getElementById('cod_tipoDoc').value='C.C';
  // Reset tipo
  document.querySelectorAll('.tipo-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelector('[data-tipo="IP — Impuesto Predial"]').classList.add('active');
  tipoSeleccionado='IP — Impuesto Predial';
  ['cond-ica','cond-ou','cond-policia','cond-otro'].forEach(function(id){document.getElementById(id).classList.remove('show');});
  proyeccion=[];
  document.getElementById('amort-wrap').style.display='none';
  document.getElementById('tbody-proy').innerHTML='';
  ['c-fac','c-ini','c-fin'].forEach(function(id){document.getElementById(id).textContent='$ 0';});
  document.getElementById('c-ncu').textContent='—';
  document.getElementById('c-tas').textContent='—';
  document.getElementById('c-int').textContent='$ 0';
  document.getElementById('c-cuo').textContent='$ 0';
  document.getElementById('st').className='st';
  document.getElementById('btn-des').style.display='none';
  document.getElementById('mesInicio').value=new Date().toISOString().slice(0,7);
}

// ════════════════════════════════════════
// AUTENTICACIÓN — Supabase Auth (replicado de Tutelas)
// Login unificado: mismo proyecto Supabase y mismo dominio que los demás
// módulos, así que la sesión se comparte automáticamente.
// ════════════════════════════════════════
const SUPABASE_URL  = "https://bmurdtfztsltcgwsfbgf.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdXJkdGZ6dHNsdGNnd3NmYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjU2NzYsImV4cCI6MjA5NjcwMTY3Nn0.2Md6ymram4kv82Lirk2ICl9ZOXUsI5Gve02q7FUCHvs";

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

// ── INIT (solo se ejecuta tras sesión válida) ──
function iniciarApp(){
  document.getElementById('mesInicio').value=new Date().toISOString().slice(0,7);
  updateBadge();
  renderPend();
}
