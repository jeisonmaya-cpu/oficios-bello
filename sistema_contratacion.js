// =========================================================
// SISTEMA DE GESTIÓN CONTRACTUAL — app.js
// =========================================================
// Este archivo maneja:
//  1. Estado en memoria de los contratistas (reemplazar por fetch a tu API real)
//  2. Render de tabla + tarjetas resumen
//  3. Modal (tabs, edición de datos, observaciones)
//  4. Selección múltiple + impresión individual/masiva
//  5. Carga de archivos -> backend -> Google Drive (server_drive_upload.js)
// =========================================================

// -----------------------------------------------------
// 1. DATOS (en producción: reemplazar por fetch('/api/contratistas'))
// -----------------------------------------------------
const DOCUMENTOS_REQUERIDOS = [
  { clave: 'cedula', nombre: 'Cédula de ciudadanía' },
  { clave: 'rut', nombre: 'RUT' },
  { clave: 'hoja_vida', nombre: 'Hoja de vida (SIGEP)' },
  { clave: 'antecedentes', nombre: 'Certificado antecedentes' },
  { clave: 'poliza', nombre: 'Póliza de cumplimiento' },
  { clave: 'certificado_bancario', nombre: 'Certificación bancaria' },
];

let contratistas = [
  {
    id: 1, nombre: 'Juan Pérez', cedula: '1034567890', correo: 'juan.perez@example.com',
    telefono: '3001234567', cargo: 'Abogado', dependencia: 'Jurídica',
    valorTotal: 4500000, plazoMeses: 4, plazoDias: 0, vencimientoPoliza: '2026-11-15',
    estado: 'completo', observaciones: '',
    documentos: ['cedula', 'rut', 'hoja_vida', 'antecedentes', 'poliza', 'certificado_bancario'],
    historialEstados: [{ anterior: null, nuevo: 'pendiente', fecha: '2026-05-02T09:00:00' }, { anterior: 'pendiente', nuevo: 'completo', fecha: '2026-06-10T14:30:00' }],
  },
  {
    id: 2, nombre: 'Ana Gómez', cedula: '43125467', correo: 'ana.gomez@example.com',
    telefono: '3009876543', cargo: 'Ingeniera', dependencia: 'Planeación',
    valorTotal: 5200000, plazoMeses: 3, plazoDias: 15, vencimientoPoliza: '2026-07-20',
    estado: 'pendiente', observaciones: '',
    documentos: ['cedula', 'rut', 'hoja_vida', 'antecedentes'],
    historialEstados: [{ anterior: null, nuevo: 'pendiente', fecha: '2026-06-01T11:00:00' }],
  },
  {
    id: 3, nombre: 'Carlos López', cedula: '80987654', correo: 'carlos.lopez@example.com',
    telefono: '3011122233', cargo: 'Contador', dependencia: 'Hacienda',
    valorTotal: 3800000, plazoMeses: 6, plazoDias: 0, vencimientoPoliza: '',
    estado: 'revision', observaciones: '',
    documentos: ['cedula', 'rut'],
    historialEstados: [{ anterior: null, nuevo: 'pendiente', fecha: '2026-06-15T08:00:00' }, { anterior: 'pendiente', nuevo: 'revision', fecha: '2026-06-28T16:45:00' }],
  },
];

// Días para considerar una póliza "por vencer" (alerta amarilla en tarjetas y tabla)
const DIAS_ALERTA_VENCIMIENTO = 30;

// -----------------------------------------------------
// UTILIDADES DE CÁLCULO Y FORMATO
// -----------------------------------------------------
function formatoMoneda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

// Convierte plazo en meses/días a total de días (mes calendario ~ 30 días, criterio administrativo estándar)
function plazoEnDias(meses, dias) {
  return (Number(meses) || 0) * 30 + (Number(dias) || 0);
}

function calcularValores(c) {
  const totalDias = plazoEnDias(c.plazoMeses, c.plazoDias);
  const valorDiario = totalDias > 0 ? c.valorTotal / totalDias : 0;
  const valorMensual = valorDiario * 30;
  return { totalDias, valorDiario, valorMensual };
}

// Estado de vencimiento de la póliza: 'sin-dato' | 'ok' | 'pronto' | 'vencida'
function estadoVencimiento(fechaISO) {
  if (!fechaISO) return { estado: 'sin-dato', dias: null };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO + 'T00:00:00');
  const dias = Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { estado: 'vencida', dias };
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return { estado: 'pronto', dias };
  return { estado: 'ok', dias };
}

let seleccionados = new Set();
let contratistaActivoId = null;

// -----------------------------------------------------
// 2. RENDER TABLA + TARJETAS
// -----------------------------------------------------
const tablaBody = document.getElementById('tablaBody');
const tablaVacio = document.getElementById('tablaVacio');
const buscador = document.getElementById('buscador');
const filtroEstado = document.getElementById('filtroEstado');

function renderTarjetas() {
  document.getElementById('cardTotal').textContent = contratistas.length;
  document.getElementById('cardCompletos').textContent = contratistas.filter(c => c.estado === 'completo').length;
  document.getElementById('cardPendientes').textContent = contratistas.filter(c => c.estado !== 'completo').length;
  const totalDocs = contratistas.reduce((acc, c) => acc + c.documentos.length, 0);
  document.getElementById('cardDocumentos').textContent = totalDocs;

  const alertas = contratistas.filter(c => {
    const { estado } = estadoVencimiento(c.vencimientoPoliza);
    return estado === 'pronto' || estado === 'vencida';
  }).length;
  document.getElementById('cardAlertas').textContent = alertas;
}

function etiquetaEstado(estado) {
  return { completo: 'Completo', pendiente: 'Pendiente', revision: 'Revisión' }[estado] || estado;
}

function renderTabla() {
  const texto = buscador.value.trim().toLowerCase();
  const filtro = filtroEstado.value;

  const filtrados = contratistas.filter(c => {
    const coincideTexto = !texto || c.nombre.toLowerCase().includes(texto) || c.cedula.includes(texto);
    const coincideEstado = filtro === 'todos' || c.estado === filtro;
    return coincideTexto && coincideEstado;
  });

  tablaBody.innerHTML = '';
  tablaVacio.hidden = filtrados.length > 0;

  filtrados.forEach(c => {
    const tr = document.createElement('tr');
    if (seleccionados.has(c.id)) tr.classList.add('seleccionada');

    const venc = estadoVencimiento(c.vencimientoPoliza);
    const textoVenc = { 'sin-dato': 'Sin dato', ok: `Vigente (${venc.dias} d)`, pronto: `Vence en ${venc.dias} d`, vencida: 'Vencida' }[venc.estado];

    tr.innerHTML = `
      <td><input type="checkbox" class="chk-fila" data-id="${c.id}" ${seleccionados.has(c.id) ? 'checked' : ''}></td>
      <td>${c.nombre}</td>
      <td>${c.cedula}</td>
      <td>${c.cargo}</td>
      <td>${c.dependencia}</td>
      <td><span class="estado ${c.estado}">${etiquetaEstado(c.estado)}</span></td>
      <td>${c.documentos.length}/${DOCUMENTOS_REQUERIDOS.length}</td>
      <td><span class="badge-vence ${venc.estado}">${textoVenc}</span></td>
      <td><button class="gestionar" data-id="${c.id}">Gestionar</button></td>
    `;
    tablaBody.appendChild(tr);
  });

  renderTarjetas();
  actualizarBarraSeleccion();
}

function actualizarBarraSeleccion() {
  const btn = document.getElementById('btnImprimirMasivo');
  const contador = document.getElementById('contadorSeleccion');
  contador.textContent = `(${seleccionados.size})`;
  btn.disabled = seleccionados.size === 0;
}

buscador.addEventListener('input', renderTabla);
filtroEstado.addEventListener('change', renderTabla);

document.getElementById('seleccionarTodos').addEventListener('change', (e) => {
  const filas = tablaBody.querySelectorAll('.chk-fila');
  filas.forEach(chk => {
    const id = Number(chk.dataset.id);
    if (e.target.checked) seleccionados.add(id); else seleccionados.delete(id);
  });
  renderTabla();
});

// Delegación de eventos sobre la tabla (checkboxes + botón gestionar)
tablaBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('chk-fila')) {
    const id = Number(e.target.dataset.id);
    if (e.target.checked) seleccionados.add(id); else seleccionados.delete(id);
    actualizarBarraSeleccion();
    e.target.closest('tr').classList.toggle('seleccionada', e.target.checked);
  }
  if (e.target.classList.contains('gestionar')) {
    abrirModal(Number(e.target.dataset.id));
  }
});

// -----------------------------------------------------
// 3. MODAL — apertura, tabs, edición de datos
// -----------------------------------------------------
const modal = document.getElementById('modal');

function abrirModal(id) {
  const c = contratistas.find(x => x.id === id);
  if (!c) return;
  contratistaActivoId = id;

  document.getElementById('modalNombre').textContent = c.nombre;
  const sello = document.getElementById('modalSello');
  sello.textContent = etiquetaEstado(c.estado);
  sello.className = `sello ${c.estado}`;

  document.getElementById('campoNombre').value = c.nombre;
  document.getElementById('campoCedula').value = c.cedula;
  document.getElementById('campoCorreo').value = c.correo || '';
  document.getElementById('campoTelefono').value = c.telefono || '';
  document.getElementById('campoCargo').value = c.cargo || '';
  document.getElementById('campoDependencia').value = c.dependencia || '';
  document.getElementById('campoEstado').value = c.estado;
  document.getElementById('campoVencimientoPoliza').value = c.vencimientoPoliza || '';
  document.getElementById('campoValorTotal').value = c.valorTotal ? c.valorTotal : '';
  document.getElementById('campoPlazoMeses').value = c.plazoMeses || 0;
  document.getElementById('campoPlazoDias').value = c.plazoDias || 0;
  document.getElementById('campoObservaciones').value = c.observaciones || '';
  limpiarErrores();
  actualizarValoresCalculados();

  renderListaDocumentos(c);
  renderHistorial(c);
  cambiarPanel('datos');
  modal.classList.add('abierto');
}

// Recalcula valor mensual/diario en vivo mientras se edita valor o plazo
function actualizarValoresCalculados() {
  const valorTotal = Number(document.getElementById('campoValorTotal').value) || 0;
  const meses = Number(document.getElementById('campoPlazoMeses').value) || 0;
  const dias = Number(document.getElementById('campoPlazoDias').value) || 0;
  const { totalDias, valorDiario, valorMensual } = calcularValores({ valorTotal, plazoMeses: meses, plazoDias: dias });

  document.getElementById('calcValorMensual').textContent = formatoMoneda(valorMensual);
  document.getElementById('calcValorDiario').textContent = formatoMoneda(valorDiario);
  document.getElementById('calcPlazoDias').textContent = totalDias;
}

['campoValorTotal', 'campoPlazoMeses', 'campoPlazoDias'].forEach(id => {
  document.getElementById(id).addEventListener('input', actualizarValoresCalculados);
});

// -----------------------------------------------------
// HISTORIAL DE CAMBIOS DE ESTADO
// -----------------------------------------------------
function renderHistorial(c) {
  const cont = document.getElementById('listaHistorial');
  const historial = c.historialEstados || [];

  if (!historial.length) {
    cont.innerHTML = '<p class="historial-vacio">Sin cambios de estado registrados.</p>';
    return;
  }

  cont.innerHTML = [...historial].reverse().map(h => {
    const fecha = new Date(h.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    const cambio = h.anterior
      ? `${etiquetaEstado(h.anterior)} → ${etiquetaEstado(h.nuevo)}`
      : `Registrado como ${etiquetaEstado(h.nuevo)}`;
    return `
      <div class="hito">
        <div class="hito-cambio">${cambio}</div>
        <div class="hito-fecha">${fecha}</div>
      </div>
    `;
  }).join('');
}

function cerrarModal() {
  modal.classList.remove('abierto');
  contratistaActivoId = null;
}

document.getElementById('cerrar').addEventListener('click', cerrarModal);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('abierto')) cerrarModal(); });

// Tabs internos del modal
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => cambiarPanel(tab.dataset.panel));
});

function cambiarPanel(nombre) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.panel === nombre));
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.dataset.panel !== nombre);
}

// -----------------------------------------------------
// VALIDACIONES DE CAMPOS
// -----------------------------------------------------
function limpiarErrores() {
  ['Nombre', 'Cedula', 'Correo', 'ValorTotal'].forEach(campo => {
    document.getElementById(`campo${campo}`).classList.remove('campo-invalido');
    const err = document.getElementById(`error${campo}`);
    if (err) err.textContent = '';
  });
}

function marcarError(campo, mensaje) {
  document.getElementById(`campo${campo}`).classList.add('campo-invalido');
  document.getElementById(`error${campo}`).textContent = mensaje;
}

// Valida los campos del panel Datos. Devuelve true si todo está correcto.
function validarFormularioDatos() {
  limpiarErrores();
  let valido = true;

  const nombre = document.getElementById('campoNombre').value.trim();
  const cedula = document.getElementById('campoCedula').value.trim();
  const correo = document.getElementById('campoCorreo').value.trim();
  const valorTotal = document.getElementById('campoValorTotal').value.trim();

  if (!nombre) { marcarError('Nombre', 'El nombre es obligatorio.'); valido = false; }

  if (!cedula) {
    marcarError('Cedula', 'La cédula es obligatoria.'); valido = false;
  } else if (!/^\d{6,10}$/.test(cedula)) {
    marcarError('Cedula', 'Debe contener solo números (6 a 10 dígitos).'); valido = false;
  }

  if (!correo) {
    marcarError('Correo', 'El correo es obligatorio.'); valido = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    marcarError('Correo', 'El formato del correo no es válido.'); valido = false;
  }

  if (valorTotal && (isNaN(Number(valorTotal)) || Number(valorTotal) < 0)) {
    marcarError('ValorTotal', 'Ingrese solo números, sin puntos ni símbolos.'); valido = false;
  }

  // Cédula duplicada en otro contratista
  const duplicada = contratistas.some(c => c.cedula === cedula && c.id !== contratistaActivoId);
  if (duplicada) { marcarError('Cedula', 'Ya existe un contratista con esta cédula.'); valido = false; }

  return valido;
}

// Guardar datos generales
document.getElementById('btnGuardarDatos').addEventListener('click', () => {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c) return;

  if (!validarFormularioDatos()) return;

  c.nombre = document.getElementById('campoNombre').value.trim();
  c.cedula = document.getElementById('campoCedula').value.trim();
  c.correo = document.getElementById('campoCorreo').value.trim();
  c.telefono = document.getElementById('campoTelefono').value.trim();
  c.cargo = document.getElementById('campoCargo').value.trim();
  c.dependencia = document.getElementById('campoDependencia').value.trim();
  c.vencimientoPoliza = document.getElementById('campoVencimientoPoliza').value;
  c.valorTotal = Number(document.getElementById('campoValorTotal').value) || 0;
  c.plazoMeses = Number(document.getElementById('campoPlazoMeses').value) || 0;
  c.plazoDias = Number(document.getElementById('campoPlazoDias').value) || 0;

  const nuevoEstado = document.getElementById('campoEstado').value;
  if (nuevoEstado !== c.estado) {
    if (!c.historialEstados) c.historialEstados = [];
    c.historialEstados.push({ anterior: c.estado, nuevo: nuevoEstado, fecha: new Date().toISOString() });
    c.estado = nuevoEstado;
  }

  renderTabla();
  abrirModal(c.id); // refresca cabecera (nombre, sello) e historial
  // TODO: reemplazar por PUT /api/contratistas/:id
});

document.getElementById('btnGuardarObs').addEventListener('click', () => {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c) return;
  c.observaciones = document.getElementById('campoObservaciones').value;
  // TODO: reemplazar por PUT /api/contratistas/:id/observaciones
});

// Nuevo contratista (alta rápida)
document.getElementById('btnNuevo').addEventListener('click', () => {
  const nuevoId = Math.max(0, ...contratistas.map(c => c.id)) + 1;
  const nuevo = {
    id: nuevoId, nombre: 'Nuevo contratista', cedula: '', correo: '', telefono: '',
    cargo: '', dependencia: '', valorTotal: 0, plazoMeses: 0, plazoDias: 0, vencimientoPoliza: '',
    estado: 'pendiente', observaciones: '', documentos: [],
    historialEstados: [{ anterior: null, nuevo: 'pendiente', fecha: new Date().toISOString() }],
  };
  contratistas.push(nuevo);
  renderTabla();
  abrirModal(nuevoId);
  // TODO: reemplazar por POST /api/contratistas
});

// -----------------------------------------------------
// 4. DOCUMENTOS — lista de requeridos vs cargados
// -----------------------------------------------------
function renderListaDocumentos(c) {
  const cont = document.getElementById('listaDocumentos');
  cont.innerHTML = '';
  DOCUMENTOS_REQUERIDOS.forEach(doc => {
    const cargado = c.documentos.includes(doc.clave);
    const div = document.createElement('div');
    div.className = 'doc-item';
    div.innerHTML = `
      <div class="doc-info">
        <i class="fa-solid ${cargado ? 'fa-file-pdf' : 'fa-file-circle-question'}"></i>
        <span>${doc.nombre}</span>
      </div>
      <span class="doc-estado ${cargado ? 'cargado' : 'faltante'}">${cargado ? 'Cargado' : 'Faltante'}</span>
    `;
    cont.appendChild(div);
  });
}

// -----------------------------------------------------
// 5. CARGA DE ARCHIVOS -> BACKEND -> GOOGLE DRIVE
// -----------------------------------------------------
// El navegador NUNCA debe llamar directamente a la API de Google Drive con
// credenciales de servicio: eso expone el token. Aquí se envían los archivos
// por FormData a un endpoint propio (ver server_drive_upload.js), que es
// quien habla con Drive usando la cuenta de servicio o el token OAuth.

const dropzone = document.getElementById('dropzone');
const inputArchivo = document.getElementById('inputArchivo');

document.getElementById('btnSeleccionarArchivo').addEventListener('click', () => inputArchivo.click());

['dragenter', 'dragover'].forEach(evento => {
  dropzone.addEventListener(evento, (e) => { e.preventDefault(); dropzone.classList.add('sobre-arrastre'); });
});
['dragleave', 'drop'].forEach(evento => {
  dropzone.addEventListener(evento, (e) => { e.preventDefault(); dropzone.classList.remove('sobre-arrastre'); });
});

dropzone.addEventListener('drop', (e) => subirArchivos(e.dataTransfer.files));
inputArchivo.addEventListener('change', (e) => subirArchivos(e.target.files));

function subirArchivos(fileList) {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c || !fileList.length) return;

  const formData = new FormData();
  formData.append('nombre', c.nombre);
  formData.append('cedula', c.cedula);
  Array.from(fileList).forEach(file => formData.append('archivos', file));

  const progreso = document.getElementById('progresoSubida');
  const relleno = document.getElementById('progresoRelleno');
  const texto = document.getElementById('progresoTexto');
  progreso.hidden = false;
  relleno.style.width = '0%';
  texto.textContent = 'Subiendo a Google Drive...';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload', true);

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      relleno.style.width = pct + '%';
    }
  });

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      texto.textContent = 'Documentos subidos correctamente.';
      // El backend responde con las claves de documento que reconoció por nombre de archivo
      try {
        const respuesta = JSON.parse(xhr.responseText);
        (respuesta.clavesReconocidas || []).forEach(clave => {
          if (!c.documentos.includes(clave)) c.documentos.push(clave);
        });
      } catch (err) { /* respuesta no JSON, se ignora */ }
      renderListaDocumentos(c);
      renderTabla();
    } else {
      texto.textContent = 'Error al subir. Intente nuevamente.';
    }
    setTimeout(() => { progreso.hidden = true; }, 1500);
  };

  xhr.onerror = () => { texto.textContent = 'Error de conexión con el servidor.'; };
  xhr.send(formData);
}

// -----------------------------------------------------
// 6. IMPRESIÓN INDIVIDUAL
// -----------------------------------------------------
document.querySelectorAll('[data-formato]').forEach(btn => {
  btn.addEventListener('click', () => {
    const c = contratistas.find(x => x.id === contratistaActivoId);
    if (!c) return;
    imprimirFormato(c, btn.dataset.formato);
  });
});

const NOMBRES_FORMATO = {
  contrato: 'Contrato de Prestación de Servicios',
  acta_inicio: 'Acta de Inicio',
  seguridad_social: 'Afiliación Seguridad Social',
  hoja_vida: 'Hoja de Vida',
};

function plantillaFormato(c, formato) {
  const titulo = NOMBRES_FORMATO[formato] || 'Documento';
  const { totalDias, valorMensual, valorDiario } = calcularValores(c);
  const plazoTexto = `${c.plazoMeses || 0} meses y ${c.plazoDias || 0} días (${totalDias} días)`;

  return `
    <h1 style="font-size:20px;margin-bottom:4px;">${titulo}</h1>
    <p style="color:#555;margin-bottom:24px;">Generado el ${new Date().toLocaleDateString('es-CO')}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;width:180px;color:#555;">Nombre</td><td style="padding:6px 0;">${c.nombre}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Cédula</td><td style="padding:6px 0;">${c.cedula}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Cargo</td><td style="padding:6px 0;">${c.cargo}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Dependencia</td><td style="padding:6px 0;">${c.dependencia}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor total</td><td style="padding:6px 0;">${formatoMoneda(c.valorTotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Plazo</td><td style="padding:6px 0;">${plazoTexto}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor mensual</td><td style="padding:6px 0;">${formatoMoneda(valorMensual)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor diario</td><td style="padding:6px 0;">${formatoMoneda(valorDiario)}</td></tr>
    </table>
    <p style="margin-top:40px;font-size:12px;color:#888;">Documento generado automáticamente por el Sistema de Gestión Contractual.</p>
  `;
}

function imprimirFormato(c, formato) {
  const area = document.getElementById('areaImprimible');
  area.innerHTML = plantillaFormato(c, formato);
  area.hidden = false;
  window.print();
  area.hidden = true;
}

// -----------------------------------------------------
// 7. IMPRESIÓN MASIVA (contratistas seleccionados en la tabla)
// -----------------------------------------------------
document.getElementById('btnImprimirMasivo').addEventListener('click', () => {
  if (!seleccionados.size) return;
  const area = document.getElementById('areaImprimible');
  const elegidos = contratistas.filter(c => seleccionados.has(c.id));

  area.innerHTML = elegidos.map(c => `
    <div style="page-break-after:always;">
      ${plantillaFormato(c, 'contrato')}
    </div>
  `).join('');

  area.hidden = false;
  window.print();
  area.hidden = true;
});

// -----------------------------------------------------
// 8. EXPORTAR A CSV
// -----------------------------------------------------
// Exporta lo que esté visible según el buscador/filtro activos, no toda la base.
document.getElementById('btnExportarCSV').addEventListener('click', () => {
  const texto = buscador.value.trim().toLowerCase();
  const filtro = filtroEstado.value;

  const filtrados = contratistas.filter(c => {
    const coincideTexto = !texto || c.nombre.toLowerCase().includes(texto) || c.cedula.includes(texto);
    const coincideEstado = filtro === 'todos' || c.estado === filtro;
    return coincideTexto && coincideEstado;
  });

  const encabezados = [
    'Nombre', 'Cédula', 'Correo', 'Teléfono', 'Cargo', 'Dependencia', 'Estado',
    'Valor total', 'Plazo (meses)', 'Plazo (días)', 'Valor mensual', 'Valor diario',
    'Vencimiento póliza', 'Documentos cargados',
  ];

  const filas = filtrados.map(c => {
    const { valorMensual, valorDiario } = calcularValores(c);
    return [
      c.nombre, c.cedula, c.correo || '', c.telefono || '', c.cargo || '', c.dependencia || '',
      etiquetaEstado(c.estado), c.valorTotal || 0, c.plazoMeses || 0, c.plazoDias || 0,
      Math.round(valorMensual), Math.round(valorDiario), c.vencimientoPoliza || '',
      `${c.documentos.length}/${DOCUMENTOS_REQUERIDOS.length}`,
    ];
  });

  // Escapa comillas y envuelve en comillas los campos con comas, saltos de línea o comillas
  const escaparCelda = (valor) => {
    const texto = String(valor ?? '');
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const contenidoCSV = [encabezados, ...filas]
    .map(fila => fila.map(escaparCelda).join(','))
    .join('\n');

  // BOM (\ufeff) para que Excel abra los acentos correctamente en Windows
  const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  enlace.href = url;
  enlace.download = `contratistas_${fechaArchivo}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
});

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
renderTabla();
