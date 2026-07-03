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
  { clave: 'redam', nombre: 'Certificado del Registro de Deudores Alimentarios Morosos – REDAM' },
  { clave: 'cedula', nombre: 'Fotocopia cédula de ciudadanía (PDF)' },
  { clave: 'eps', nombre: 'Certificado de la Entidad Promotora de Salud - EPS' },
  { clave: 'pension', nombre: 'Certificado de afiliación al Fondo de Pensión' },
  { clave: 'educacion_formal', nombre: 'Certificados de estudio de educación formal' },
  { clave: 'certificados_educacion', nombre: 'Certificados de Educación' },
  { clave: 'tarjeta_profesional', nombre: 'Tarjeta, Registro o Matrícula profesional en los casos exigidos por la Ley' },
  { clave: 'laborales', nombre: 'Certificados laborales' },
  { clave: 'antecedentes_disciplinarios', nombre: 'Certificado Vigente de Antecedentes disciplinarios profesionales en los casos exigidos por la Ley' },
  { clave: 'rut', nombre: 'RUT (Registro Único Tributario)' },
  { clave: 'libreta_militar', nombre: 'Copia Libreta militar o certificado de definición de situación militar' },
  { clave: 'hoja_vida_sigep', nombre: 'Hoja de Vida del SIGEP II' },
  { clave: 'cuenta_bancaria', nombre: 'Certificado cuenta bancaria' },
];

// Documentos requeridos para un contratista: la lista base + los agregados manualmente
function docsRequeridos(c) {
  return [...DOCUMENTOS_REQUERIDOS, ...(c.documentosExtra || [])];
}

let contratistas = [
  {
    id: 1, nombre: 'Juan Pérez', cedula: '1034567890', correo: 'juan.perez@example.com',
    telefono: '3001234567', cargo: 'Abogado', dependencia: 'Jurídica',
    numeroContrato: 'CB-2026-001', tipoContrato: 'Prestación de Servicios', modalidad: 'Contratación Directa',
    supervisor: 'Juan Pablo Gómez Londoño', fechaFirma: '2026-05-02', fechaInicio: '2026-05-04',
    valorMensual: 3800000, valorTotal: 15200000, plazoMeses: 4, plazoDias: 0,
    estado: 'completo', actualizadoEn: '2026-06-10T14:30:00',
    bitacora: [{ texto: 'Expediente completo. Póliza verificada con la aseguradora.', fecha: '2026-06-10T14:32:00' }],
    documentosExtra: [],
    documentos: ['redam', 'cedula', 'eps', 'pension', 'educacion_formal', 'certificados_educacion', 'tarjeta_profesional', 'laborales', 'antecedentes_disciplinarios', 'rut', 'libreta_militar', 'hoja_vida_sigep', 'cuenta_bancaria'],
    historialEstados: [{ anterior: null, nuevo: 'pendiente', fecha: '2026-05-02T09:00:00' }, { anterior: 'pendiente', nuevo: 'completo', fecha: '2026-06-10T14:30:00' }],
  },
  {
    id: 2, nombre: 'Ana Gómez', cedula: '43125467', correo: 'ana.gomez@example.com',
    telefono: '3009876543', cargo: 'Ingeniera', dependencia: 'Planeación',
    numeroContrato: 'CB-2026-002', tipoContrato: 'Prestación de Servicios', modalidad: 'Mínima Cuantía',
    supervisor: '', fechaFirma: '2026-06-01', fechaInicio: '2026-06-03',
    valorMensual: 3200000, valorTotal: 11200000, plazoMeses: 3, plazoDias: 15,
    estado: 'pendiente', actualizadoEn: '2026-06-01T11:00:00',
    bitacora: [{ texto: 'Se solicitó por correo el certificado de cuenta bancaria y la hoja de vida del SIGEP II.', fecha: '2026-06-01T11:05:00' }],
    documentosExtra: [],
    documentos: ['redam', 'cedula', 'eps', 'pension', 'educacion_formal', 'laborales', 'rut'],
    historialEstados: [{ anterior: null, nuevo: 'pendiente', fecha: '2026-06-01T11:00:00' }],
  },
  {
    id: 3, nombre: 'Carlos López', cedula: '80987654', correo: 'carlos.lopez@example.com',
    telefono: '3011122233', cargo: 'Contador', dependencia: 'Hacienda',
    numeroContrato: 'CB-2026-003', tipoContrato: 'Prestación de Servicios', modalidad: 'Contratación Directa',
    supervisor: '', fechaFirma: '', fechaInicio: '',
    valorMensual: 2900000, valorTotal: 17400000, plazoMeses: 6, plazoDias: 0,
    estado: 'revision', actualizadoEn: '2026-06-28T16:45:00',
    bitacora: [],
    documentosExtra: [],
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
  const valorMensual = Number(c.valorMensual) || 0;
  const valorDiario = valorMensual / 30;
  const meses = Number(c.plazoMeses) || 0;
  const diasExtra = Number(c.plazoDias) || 0;
  const valorTotalCalculado = meses * valorMensual + diasExtra * valorDiario;
  return { totalDias, valorDiario, valorTotalCalculado };
}

// Calcula la fecha estimada de terminación a partir de fecha de inicio + plazo (meses/días)
function fechaTerminacionEstimada(fechaInicioISO, meses, dias) {
  if (!fechaInicioISO) return null;
  const fecha = new Date(fechaInicioISO + 'T00:00:00');
  fecha.setMonth(fecha.getMonth() + (Number(meses) || 0));
  fecha.setDate(fecha.getDate() + (Number(dias) || 0));
  return fecha;
}

// Genera el siguiente consecutivo "CB-AAAA-NNN" (Contratación Bello) según el año actual
function siguienteNumeroContrato() {
  const anio = new Date().getFullYear();
  const delAnio = contratistas.filter(c => (c.numeroContrato || '').includes(`-${anio}-`));
  const consecutivo = delAnio.length + 1;
  return `CB-${anio}-${String(consecutivo).padStart(3, '0')}`;
}

let seleccionados = new Set();
let contratistaActivoId = null;
let ordenActual = { campo: 'nombre', direccion: 1 }; // 1 asc, -1 desc
let _snapshotModal = null; // estado del formulario al abrir, para detectar cambios sin guardar

// -----------------------------------------------------
// NOTIFICACIONES (TOASTS)
// -----------------------------------------------------
function notificar(mensaje, tipo = 'exito') {
  const cont = document.getElementById('toasts');
  const toast = document.createElement('div');
  const icono = tipo === 'exito' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<i class="fa-solid ${icono}"></i> ${mensaje}`;
  cont.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('saliendo');
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

// -----------------------------------------------------
// TEMA CLARO / OSCURO
// -----------------------------------------------------
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  const icono = document.querySelector('#btnTema i');
  icono.className = tema === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  localStorage.setItem('contratacion_tema', tema);
}

document.getElementById('btnTema').addEventListener('click', () => {
  const actual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  aplicarTema(actual);
});

aplicarTema(localStorage.getItem('contratacion_tema') || 'light');

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

  const alertas = contratistas.filter(c => diasParaTerminacion(c) !== null && diasParaTerminacion(c) <= DIAS_ALERTA_VENCIMIENTO).length;
  document.getElementById('cardAlertas').textContent = alertas;
}

// Días restantes hasta la fecha de terminación estimada (null si no hay fecha de inicio)
function diasParaTerminacion(c) {
  const fin = fechaTerminacionEstimada(c.fechaInicio, c.plazoMeses, c.plazoDias);
  if (!fin) return null;
  return Math.round((fin - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
}

function etiquetaEstado(estado) {
  return { completo: 'Completo', pendiente: 'Pendiente', revision: 'Revisión' }[estado] || estado;
}

function renderTabla() {
  const texto = buscador.value.trim().toLowerCase();
  const filtro = filtroEstado.value;

  const filtrados = contratistas.filter(c => {
    const coincideTexto = !texto || c.nombre.toLowerCase().includes(texto) || c.cedula.includes(texto) || (c.numeroContrato && c.numeroContrato.toLowerCase().includes(texto));
    const coincideEstado = filtro === 'todos' || c.estado === filtro;
    return coincideTexto && coincideEstado;
  });

  // Ordenamiento según la columna activa
  const valorOrden = (c) => {
    switch (ordenActual.campo) {
      case 'documentos': return c.documentos.length;
      case 'numeroContrato': return c.numeroContrato || '';
      default: return (c[ordenActual.campo] || '').toString().toLowerCase();
    }
  };
  filtrados.sort((a, b) => {
    const va = valorOrden(a), vb = valorOrden(b);
    if (va < vb) return -1 * ordenActual.direccion;
    if (va > vb) return 1 * ordenActual.direccion;
    return 0;
  });

  tablaBody.innerHTML = '';
  tablaVacio.hidden = filtrados.length > 0;

  filtrados.forEach(c => {
    const tr = document.createElement('tr');
    if (seleccionados.has(c.id)) tr.classList.add('seleccionada');

    tr.innerHTML = `
      <td><input type="checkbox" class="chk-fila" data-id="${c.id}" ${seleccionados.has(c.id) ? 'checked' : ''}></td>
      <td class="celda-contrato">${c.numeroContrato || '<span class="sin-asignar">Sin asignar</span>'}</td>
      <td>${c.nombre}</td>
      <td>${c.cedula}</td>
      <td>${c.cargo}</td>
      <td>${c.dependencia}</td>
      <td><span class="estado ${c.estado}">${etiquetaEstado(c.estado)}</span></td>
      <td>${c.documentos.length}/${docsRequeridos(c).length}</td>
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

// Ordenamiento al hacer clic en el encabezado de la columna
document.querySelectorAll('th.ordenable').forEach(th => {
  th.addEventListener('click', () => {
    const campo = th.dataset.orden;
    if (ordenActual.campo === campo) {
      ordenActual.direccion *= -1; // segundo clic invierte la dirección
    } else {
      ordenActual = { campo, direccion: 1 };
    }
    document.querySelectorAll('th.ordenable').forEach(t => t.classList.toggle('activa', t === th));
    renderTabla();
  });
});

// Atajo: "/" enfoca el buscador desde cualquier parte del dashboard
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !modal.classList.contains('abierto') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    buscador.focus();
  }
});

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
  document.getElementById('modalCedula').textContent = c.cedula || '—';
  document.getElementById('modalAvatar').textContent = obtenerIniciales(c.nombre);

  const badgeContrato = document.getElementById('modalNumeroContrato');
  if (c.numeroContrato) { badgeContrato.textContent = c.numeroContrato; badgeContrato.hidden = false; }
  else { badgeContrato.hidden = true; }

  const sello = document.getElementById('modalSello');
  sello.textContent = etiquetaEstado(c.estado);
  sello.className = `sello ${c.estado}`;

  const actualizado = document.getElementById('modalActualizado');
  actualizado.textContent = c.actualizadoEn
    ? `Última actualización: ${new Date(c.actualizadoEn).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}`
    : '';

  document.getElementById('campoNombre').value = c.nombre;
  document.getElementById('campoCedula').value = c.cedula;
  document.getElementById('campoCorreo').value = c.correo || '';
  document.getElementById('campoTelefono').value = c.telefono || '';
  document.getElementById('campoCargo').value = c.cargo || '';
  document.getElementById('campoDependencia').value = c.dependencia || '';
  document.getElementById('campoEstado').value = c.estado;
  document.getElementById('campoNumeroContrato').value = c.numeroContrato || '';
  document.getElementById('campoTipoContrato').value = c.tipoContrato || '';
  document.getElementById('campoModalidad').value = c.modalidad || '';
  document.getElementById('campoSupervisor').value = c.supervisor || '';
  document.getElementById('campoFechaFirma').value = c.fechaFirma || '';
  document.getElementById('campoFechaInicio').value = c.fechaInicio || '';
  document.getElementById('campoValorMensual').value = c.valorMensual ? c.valorMensual : '';
  document.getElementById('campoValorTotal').value = c.valorTotal ? c.valorTotal : '';
  document.getElementById('campoPlazoMeses').value = c.plazoMeses || 0;
  document.getElementById('campoPlazoDias').value = c.plazoDias || 0;
  document.getElementById('campoNuevaAnotacion').value = '';
  limpiarErrores();
  actualizarValoresCalculados();
  actualizarAvanceExpediente(c);

  renderListaDocumentos(c);
  renderHistorial(c);
  renderBitacora(c);
  cambiarPanel('datos');
  modal.classList.add('abierto');

  // Snapshot del formulario para detectar cambios sin guardar al cerrar
  _snapshotModal = snapshotFormulario();
}

// Iniciales para el avatar circular (primeras letras del nombre y apellido)
function obtenerIniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '—';
  return (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
}

// Serializa el estado actual del formulario de Datos
function snapshotFormulario() {
  return ['campoNombre', 'campoCedula', 'campoCorreo', 'campoTelefono', 'campoCargo',
    'campoDependencia', 'campoEstado', 'campoNumeroContrato',
    'campoTipoContrato', 'campoModalidad', 'campoSupervisor', 'campoFechaFirma', 'campoFechaInicio',
    'campoValorMensual', 'campoValorTotal', 'campoPlazoMeses', 'campoPlazoDias']
    .map(id => document.getElementById(id).value)
    .join('|');
}

// Barra de avance del expediente (documentos cargados vs requeridos)
function actualizarAvanceExpediente(c) {
  const total = docsRequeridos(c).length;
  const cargados = c.documentos.length;
  const pct = total > 0 ? Math.round((cargados / total) * 100) : 0;
  const relleno = document.getElementById('avanceRelleno');
  relleno.style.width = pct + '%';
  relleno.classList.toggle('completo', cargados === total);
  document.getElementById('avanceTexto').textContent = `${cargados} de ${total} documentos (${pct}%)`;
}

// Recalcula el valor total (mensual × plazo) y lo deja escrito en el campo,
// que sigue siendo editable por si el abogado necesita ajustarlo a mano
// (adiciones, redondeos, etc. — por eso NO se vuelve a pisar salvo que cambie mensual o plazo).
function actualizarValoresCalculados() {
  const valorMensual = Number(document.getElementById('campoValorMensual').value) || 0;
  const meses = Number(document.getElementById('campoPlazoMeses').value) || 0;
  const dias = Number(document.getElementById('campoPlazoDias').value) || 0;
  const { totalDias, valorDiario, valorTotalCalculado } = calcularValores({ valorMensual, plazoMeses: meses, plazoDias: dias });

  document.getElementById('campoValorTotal').value = valorMensual > 0 ? Math.round(valorTotalCalculado) : '';
  document.getElementById('calcValorDiario').textContent = formatoMoneda(valorDiario);
  document.getElementById('calcPlazoDias').textContent = totalDias;

  const fechaInicio = document.getElementById('campoFechaInicio').value;
  const caja = document.getElementById('calcTerminacionCaja');
  const texto = document.getElementById('calcFechaTerminacion');
  const fin = fechaTerminacionEstimada(fechaInicio, meses, dias);

  if (!fin) {
    texto.textContent = 'Falta fecha de inicio';
    caja.classList.remove('alerta-vencimiento');
    return;
  }

  const finTexto = fin.toLocaleDateString('es-CO', { dateStyle: 'medium' });
  const diasRestantes = Math.round((fin - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    texto.textContent = `${finTexto} (venció hace ${Math.abs(diasRestantes)} días)`;
    caja.classList.add('alerta-vencimiento');
  } else if (diasRestantes <= DIAS_ALERTA_VENCIMIENTO) {
    texto.textContent = `${finTexto} (en ${diasRestantes} días)`;
    caja.classList.add('alerta-vencimiento');
  } else {
    texto.textContent = finTexto;
    caja.classList.remove('alerta-vencimiento');
  }
}

// El total SOLO se recalcula automáticamente cuando cambian el mensual o el plazo;
// si el abogado edita el total directamente, ese valor manual se respeta.
['campoValorMensual', 'campoPlazoMeses', 'campoPlazoDias', 'campoFechaInicio'].forEach(id => {
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

function cerrarModal(forzar = false) {
  // Guard: si hay cambios sin guardar en el formulario, pedir confirmación
  if (!forzar && _snapshotModal !== null && snapshotFormulario() !== _snapshotModal) {
    const confirmar = confirm('Hay cambios sin guardar en los datos del contratista. ¿Cerrar de todas formas?');
    if (!confirmar) return;
  }
  modal.classList.remove('abierto');
  contratistaActivoId = null;
  _snapshotModal = null;
}

document.getElementById('cerrar').addEventListener('click', () => cerrarModal());
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('abierto')) cerrarModal(); });

// Atajo Ctrl+S dentro del modal: guarda los datos sin pasar por el mouse
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && modal.classList.contains('abierto')) {
    e.preventDefault();
    document.getElementById('btnGuardarDatos').click();
  }
});

// Clic en la cédula de la cabecera: copiar al portapapeles
document.getElementById('copiarCedula').addEventListener('click', () => {
  const cedula = document.getElementById('modalCedula').textContent;
  if (!cedula || cedula === '—') return;
  navigator.clipboard.writeText(cedula).then(() => {
    const el = document.getElementById('copiarCedula');
    el.classList.add('copiado');
    notificar('Cédula copiada al portapapeles');
    setTimeout(() => el.classList.remove('copiado'), 1500);
  }).catch(() => notificar('No se pudo copiar. Copie manualmente.', 'error'));
});

// -----------------------------------------------------
// BITÁCORA DEL EXPEDIENTE (anotaciones fechadas, solo agregar)
// -----------------------------------------------------
function renderBitacora(c) {
  const cont = document.getElementById('listaBitacora');
  const bitacora = c.bitacora || [];

  if (!bitacora.length) {
    cont.innerHTML = '<p class="historial-vacio">Sin anotaciones. Registre aquí cada actuación del proceso.</p>';
    return;
  }

  cont.innerHTML = [...bitacora].reverse().map(a => {
    const fecha = new Date(a.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    return `
      <div class="anotacion">
        <div class="anotacion-fecha"><i class="fa-regular fa-clock"></i> ${fecha}</div>
        <div class="anotacion-texto">${escaparHTML(a.texto)}</div>
      </div>
    `;
  }).join('');
}

// Escapa HTML del texto libre de la bitácora para evitar inyección en el DOM
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function agregarAnotacion() {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c) return;
  const campo = document.getElementById('campoNuevaAnotacion');
  const texto = campo.value.trim();
  if (!texto) { notificar('Escriba la anotación antes de agregarla.', 'error'); return; }

  if (!c.bitacora) c.bitacora = [];
  c.bitacora.push({ texto, fecha: new Date().toISOString() });
  c.actualizadoEn = new Date().toISOString();
  campo.value = '';
  renderBitacora(c);
  notificar('Anotación registrada en la bitácora');
  // TODO: reemplazar por POST /api/contratistas/:id/bitacora
}

document.getElementById('btnAgregarAnotacion').addEventListener('click', agregarAnotacion);

// Ctrl+Enter en el campo de anotación la agrega directo
document.getElementById('campoNuevaAnotacion').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    agregarAnotacion();
  }
});

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
  ['Nombre', 'Cedula', 'Correo', 'ValorMensual'].forEach(campo => {
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
  const valorMensual = document.getElementById('campoValorMensual').value.trim();

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

  if (!valorMensual) {
    marcarError('ValorMensual', 'El valor mensual es obligatorio.'); valido = false;
  } else if (isNaN(Number(valorMensual)) || Number(valorMensual) < 0) {
    marcarError('ValorMensual', 'Ingrese solo números, sin puntos ni símbolos.'); valido = false;
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
  c.numeroContrato = document.getElementById('campoNumeroContrato').value.trim();
  c.tipoContrato = document.getElementById('campoTipoContrato').value;
  c.modalidad = document.getElementById('campoModalidad').value;
  c.supervisor = document.getElementById('campoSupervisor').value.trim();
  c.fechaFirma = document.getElementById('campoFechaFirma').value;
  c.fechaInicio = document.getElementById('campoFechaInicio').value;
  c.valorMensual = Number(document.getElementById('campoValorMensual').value) || 0;
  c.valorTotal = Number(document.getElementById('campoValorTotal').value) || 0;
  c.plazoMeses = Number(document.getElementById('campoPlazoMeses').value) || 0;
  c.plazoDias = Number(document.getElementById('campoPlazoDias').value) || 0;

  const nuevoEstado = document.getElementById('campoEstado').value;
  if (nuevoEstado !== c.estado) {
    if (!c.historialEstados) c.historialEstados = [];
    c.historialEstados.push({ anterior: c.estado, nuevo: nuevoEstado, fecha: new Date().toISOString() });
    c.estado = nuevoEstado;
  }

  c.actualizadoEn = new Date().toISOString();

  renderTabla();
  abrirModal(c.id); // refresca cabecera (nombre, sello), historial y snapshot
  notificar('Cambios guardados correctamente');
  // TODO: reemplazar por PUT /api/contratistas/:id
});

// Nuevo contratista (alta rápida)
document.getElementById('btnNuevo').addEventListener('click', () => {
  const nuevoId = Math.max(0, ...contratistas.map(c => c.id)) + 1;
  const nuevo = {
    id: nuevoId, nombre: 'Nuevo contratista', cedula: '', correo: '', telefono: '',
    cargo: '', dependencia: '', numeroContrato: siguienteNumeroContrato(), tipoContrato: '',
    modalidad: '', supervisor: '', fechaFirma: '', fechaInicio: '',
    valorTotal: 0, valorMensual: 0, plazoMeses: 0, plazoDias: 0,
    estado: 'pendiente', actualizadoEn: new Date().toISOString(), bitacora: [], documentos: [],
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

  docsRequeridos(c).forEach(doc => {
    const cargado = c.documentos.includes(doc.clave);
    const div = document.createElement('div');
    div.className = 'doc-item';
    div.innerHTML = `
      <div class="doc-info">
        <i class="fa-solid ${cargado ? 'fa-file-circle-check' : 'fa-file-circle-question'}"></i>
        <span>${doc.nombre}</span>
      </div>
      <div class="doc-controles">
        <button type="button" class="doc-adjuntar" data-clave="${doc.clave}" title="Adjuntar archivo de este documento">
          <i class="fa-solid fa-paperclip"></i> Adjuntar
        </button>
        <span class="doc-estado ${cargado ? 'cargado' : 'faltante'}" data-clave="${doc.clave}" title="Clic para marcar manualmente">${cargado ? 'Cargado' : 'Faltante'}</span>
      </div>
    `;
    cont.appendChild(div);
  });

  // Adjuntar archivo para un documento específico: al subir, ese ítem queda Cargado
  cont.querySelectorAll('.doc-adjuntar').forEach(btn => {
    btn.addEventListener('click', () => {
      docPendienteClave = btn.dataset.clave;
      inputArchivoItem.click();
    });
  });

  // Toggle manual del estado (para documentos entregados en físico, etc.)
  cont.querySelectorAll('.doc-estado').forEach(pill => {
    pill.addEventListener('click', () => {
      const clave = pill.dataset.clave;
      const idx = c.documentos.indexOf(clave);
      if (idx >= 0) {
        c.documentos.splice(idx, 1);
        notificar('Documento marcado como faltante');
      } else {
        c.documentos.push(clave);
        notificar('Documento marcado como cargado');
      }
      c.actualizadoEn = new Date().toISOString();
      renderListaDocumentos(c);
      actualizarAvanceExpediente(c);
      renderTabla();
      // TODO: persistir el cambio en la API/Supabase
    });
  });
}

// -----------------------------------------------------
// AGREGAR DOCUMENTO REQUERIDO ADICIONAL (por contratista)
// -----------------------------------------------------
document.getElementById('btnAgregarDoc').addEventListener('click', () => {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c) return;
  const campo = document.getElementById('campoNuevoDoc');
  const nombre = campo.value.trim();
  if (!nombre) { notificar('Escriba el nombre del documento.', 'error'); return; }

  const yaExiste = docsRequeridos(c).some(d => d.nombre.toLowerCase() === nombre.toLowerCase());
  if (yaExiste) { notificar('Ese documento ya está en la lista.', 'error'); return; }

  if (!c.documentosExtra) c.documentosExtra = [];
  const clave = 'extra_' + Date.now(); // clave única para el documento personalizado
  c.documentosExtra.push({ clave, nombre });
  c.actualizadoEn = new Date().toISOString();
  campo.value = '';
  renderListaDocumentos(c);
  actualizarAvanceExpediente(c);
  renderTabla();
  notificar('Documento agregado a la lista de requeridos');
  // TODO: persistir en la API/Supabase (tabla documentos_extra o tipos_documento)
});

document.getElementById('campoNuevoDoc').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAgregarDoc').click(); }
});

// -----------------------------------------------------
// 5. CARGA DE ARCHIVOS -> BACKEND -> GOOGLE DRIVE
// -----------------------------------------------------
// El navegador NUNCA debe llamar directamente a la API de Google Drive con
// credenciales de servicio: eso expone el token. Aquí se envían los archivos
// por FormData a un endpoint propio (ver server_drive_upload.js), que es
// quien habla con Drive usando la cuenta de servicio o el token OAuth.

const dropzone = document.getElementById('dropzone');
const inputArchivo = document.getElementById('inputArchivo');
const inputArchivoItem = document.getElementById('inputArchivoItem');
let docPendienteClave = null; // clave del documento al que se está adjuntando archivo

document.getElementById('btnSeleccionarArchivo').addEventListener('click', () => inputArchivo.click());

['dragenter', 'dragover'].forEach(evento => {
  dropzone.addEventListener(evento, (e) => { e.preventDefault(); dropzone.classList.add('sobre-arrastre'); });
});
['dragleave', 'drop'].forEach(evento => {
  dropzone.addEventListener(evento, (e) => { e.preventDefault(); dropzone.classList.remove('sobre-arrastre'); });
});

dropzone.addEventListener('drop', (e) => subirArchivos(e.dataTransfer.files));
inputArchivo.addEventListener('change', (e) => { subirArchivos(e.target.files); e.target.value = ''; });

// Subida de un archivo asociado a un documento específico de la lista
inputArchivoItem.addEventListener('change', (e) => {
  subirArchivos(e.target.files, docPendienteClave);
  docPendienteClave = null;
  e.target.value = ''; // permite volver a seleccionar el mismo archivo
});

function subirArchivos(fileList, claveDoc = null) {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c || !fileList.length) return;

  const formData = new FormData();
  formData.append('nombre', c.nombre);
  formData.append('cedula', c.cedula);
  if (claveDoc) formData.append('tipoDocumento', claveDoc); // el backend guarda el archivo asociado a este tipo
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
      // Si la subida fue de un documento específico, ese ítem queda Cargado
      if (claveDoc && !c.documentos.includes(claveDoc)) c.documentos.push(claveDoc);
      // Además, el backend responde con las claves que reconoció por nombre de archivo
      try {
        const respuesta = JSON.parse(xhr.responseText);
        (respuesta.clavesReconocidas || []).forEach(clave => {
          if (!c.documentos.includes(clave)) c.documentos.push(clave);
        });
      } catch (err) { /* respuesta no JSON, se ignora */ }
      renderListaDocumentos(c);
      actualizarAvanceExpediente(c);
      c.actualizadoEn = new Date().toISOString();
      renderTabla();
      notificar('Documentos subidos a Google Drive');
    } else {
      texto.textContent = 'Error al subir. Intente nuevamente.';
      notificar('Error al subir los documentos', 'error');
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
  acta_designacion: 'Acta de Designación',
  cdp_banco: 'CDP y Banco',
  estudios_previos: 'Estudios Previos',
  minuta: 'Minuta del Contrato',
  visto_bueno: 'Visto Bueno',
  expediente: 'Expediente Completo',
};

// Membrete oficial reutilizable para todos los documentos impresos
function membrete(titulo, c) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0a1f3d;padding-bottom:10px;margin-bottom:18px;">
      <div>
        <div style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;">Alcaldía de Bello</div>
        <h1 style="font-size:19px;margin:2px 0 0;color:#0a1f3d;">${titulo}</h1>
      </div>
      <div style="text-align:right;font-size:11px;color:#888;">
        ${c.numeroContrato ? `<div style="font-weight:600;color:#0a1f3d;">Contrato ${c.numeroContrato}</div>` : ''}
        <div>Generado el ${new Date().toLocaleDateString('es-CO')}</div>
      </div>
    </div>
  `;
}

// Formato especial: expediente completo con checklist documental, historial y bitácora
function plantillaExpediente(c) {
  const { totalDias, valorDiario } = calcularValores(c);

  const checklist = docsRequeridos(c).map(doc => {
    const cargado = c.documentos.includes(doc.clave);
    return `<tr>
      <td style="padding:5px 0;">${doc.nombre}</td>
      <td style="padding:5px 0;font-weight:600;color:${cargado ? '#2e7d4f' : '#c0392b'};">${cargado ? '✓ Cargado' : '✗ Faltante'}</td>
    </tr>`;
  }).join('');

  const historial = (c.historialEstados || []).map(h => {
    const fecha = new Date(h.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    const cambio = h.anterior ? `${etiquetaEstado(h.anterior)} → ${etiquetaEstado(h.nuevo)}` : `Registrado como ${etiquetaEstado(h.nuevo)}`;
    return `<tr><td style="padding:4px 0;width:200px;color:#555;">${fecha}</td><td style="padding:4px 0;">${cambio}</td></tr>`;
  }).join('') || '<tr><td style="padding:4px 0;color:#888;">Sin registros</td></tr>';

  const bitacora = (c.bitacora || []).map(a => {
    const fecha = new Date(a.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    return `<div style="margin-bottom:10px;padding-left:10px;border-left:2px solid #ccc;">
      <div style="font-size:11px;color:#777;">${fecha}</div>
      <div>${escaparHTML(a.texto)}</div>
    </div>`;
  }).join('') || '<p style="color:#888;">Sin anotaciones registradas.</p>';

  const finEstimado = fechaTerminacionEstimada(c.fechaInicio, c.plazoMeses, c.plazoDias);
  const terminacionTexto = finEstimado ? finEstimado.toLocaleDateString('es-CO', { dateStyle: 'medium' }) : 'Sin fecha de inicio registrada';

  return `
    ${membrete('Expediente de Contratación', c)}
    <p style="color:#555;margin-bottom:6px;">${c.nombre} — C.C. ${c.cedula}</p>
    <p style="color:#888;font-size:12px;margin-bottom:24px;">Estado: ${etiquetaEstado(c.estado)}</p>

    <h2 style="font-size:15px;margin:18px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">1. Información general</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:4px 0;width:200px;color:#555;">Correo</td><td>${c.correo || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Teléfono</td><td>${c.telefono || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Cargo / Perfil</td><td>${c.cargo || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Dependencia</td><td>${c.dependencia || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Tipo de contrato</td><td>${c.tipoContrato || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Modalidad de contratación</td><td>${c.modalidad || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Supervisor del contrato</td><td>${c.supervisor || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Fecha de firma</td><td>${c.fechaFirma || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Fecha de inicio</td><td>${c.fechaInicio || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Fecha de terminación estimada</td><td>${terminacionTexto}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Valor mensual</td><td>${formatoMoneda(c.valorMensual)}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Valor total</td><td>${formatoMoneda(c.valorTotal)}</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Plazo</td><td>${c.plazoMeses || 0} meses y ${c.plazoDias || 0} días (${totalDias} días)</td></tr>
      <tr><td style="padding:4px 0;color:#555;">Valor diario (sobre el mensual)</td><td>${formatoMoneda(valorDiario)}</td></tr>
    </table>

    <h2 style="font-size:15px;margin:18px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">2. Checklist documental (${c.documentos.length}/${docsRequeridos(c).length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${checklist}</table>

    <h2 style="font-size:15px;margin:18px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">3. Historial de estados</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${historial}</table>

    <h2 style="font-size:15px;margin:18px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">4. Bitácora del proceso</h2>
    <div style="font-size:13px;">${bitacora}</div>

    <p style="margin-top:40px;font-size:12px;color:#888;">Documento generado automáticamente por el Sistema de Gestión Contractual.</p>
  `;
}

function plantillaFormato(c, formato) {
  const titulo = NOMBRES_FORMATO[formato] || 'Documento';
  const { totalDias, valorDiario } = calcularValores(c);
  const plazoTexto = `${c.plazoMeses || 0} meses y ${c.plazoDias || 0} días (${totalDias} días)`;
  const finEstimado = fechaTerminacionEstimada(c.fechaInicio, c.plazoMeses, c.plazoDias);
  const terminacionTexto = finEstimado ? finEstimado.toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—';

  // Filas base presentes en todos los formatos
  const filasBase = `
    <tr><td style="padding:6px 0;width:200px;color:#555;">Nombre</td><td style="padding:6px 0;">${c.nombre}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">Cédula</td><td style="padding:6px 0;">${c.cedula}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">Cargo</td><td style="padding:6px 0;">${c.cargo || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">Dependencia</td><td style="padding:6px 0;">${c.dependencia || '—'}</td></tr>
  `;

  // Filas adicionales según el tipo de formato oficial
  const filasExtra = {
    acta_designacion: `
      <tr><td style="padding:6px 0;color:#555;">Tipo de contrato</td><td style="padding:6px 0;">${c.tipoContrato || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Modalidad de contratación</td><td style="padding:6px 0;">${c.modalidad || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Supervisor designado</td><td style="padding:6px 0;">${c.supervisor || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Fecha de designación</td><td style="padding:6px 0;">${c.fechaFirma || '—'}</td></tr>
    `,
    cdp_banco: `
      <tr><td style="padding:6px 0;color:#555;">Valor total del contrato</td><td style="padding:6px 0;">${formatoMoneda(c.valorTotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor mensual</td><td style="padding:6px 0;">${formatoMoneda(c.valorMensual)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Certificado de Disponibilidad Presupuestal (CDP) N°</td><td style="padding:6px 0;">______________</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Entidad bancaria</td><td style="padding:6px 0;">______________</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Número de cuenta</td><td style="padding:6px 0;">______________</td></tr>
    `,
    estudios_previos: `
      <tr><td style="padding:6px 0;color:#555;">Tipo de contrato</td><td style="padding:6px 0;">${c.tipoContrato || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Modalidad de contratación</td><td style="padding:6px 0;">${c.modalidad || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor total</td><td style="padding:6px 0;">${formatoMoneda(c.valorTotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Plazo estimado</td><td style="padding:6px 0;">${plazoTexto}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Justificación de la necesidad</td><td style="padding:6px 0;">______________</td></tr>
    `,
    minuta: `
      <tr><td style="padding:6px 0;color:#555;">Tipo de contrato</td><td style="padding:6px 0;">${c.tipoContrato || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor total</td><td style="padding:6px 0;">${formatoMoneda(c.valorTotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Plazo</td><td style="padding:6px 0;">${plazoTexto}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor mensual</td><td style="padding:6px 0;">${formatoMoneda(c.valorMensual)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Fecha de inicio</td><td style="padding:6px 0;">${c.fechaInicio || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Fecha de terminación estimada</td><td style="padding:6px 0;">${terminacionTexto}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Supervisor del contrato</td><td style="padding:6px 0;">${c.supervisor || '—'}</td></tr>
    `,
    visto_bueno: `
      <tr><td style="padding:6px 0;color:#555;">Estado del expediente</td><td style="padding:6px 0;">${etiquetaEstado(c.estado)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Documentos cargados</td><td style="padding:6px 0;">${c.documentos.length}/${docsRequeridos(c).length}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Supervisor del contrato</td><td style="padding:6px 0;">${c.supervisor || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Observación</td><td style="padding:6px 0;">______________</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Firma de aprobación</td><td style="padding:6px 0;">______________</td></tr>
    `,
  }[formato] || '';

  return `
    ${membrete(titulo, c)}
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${filasBase}
      ${filasExtra}
    </table>
    <p style="margin-top:40px;font-size:12px;color:#888;">Documento generado automáticamente por el Sistema de Gestión Contractual.</p>
  `;
}

function imprimirFormato(c, formato) {
  const area = document.getElementById('areaImprimible');
  area.innerHTML = formato === 'expediente' ? plantillaExpediente(c) : plantillaFormato(c, formato);
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
      ${plantillaFormato(c, 'acta_designacion')}
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
    const coincideTexto = !texto || c.nombre.toLowerCase().includes(texto) || c.cedula.includes(texto) || (c.numeroContrato && c.numeroContrato.toLowerCase().includes(texto));
    const coincideEstado = filtro === 'todos' || c.estado === filtro;
    return coincideTexto && coincideEstado;
  });

  const encabezados = [
    'Número de contrato', 'Nombre', 'Cédula', 'Correo', 'Teléfono', 'Cargo', 'Dependencia',
    'Tipo de contrato', 'Modalidad', 'Supervisor', 'Fecha de firma', 'Fecha de inicio', 'Estado',
    'Valor mensual', 'Valor total', 'Plazo (meses)', 'Plazo (días)', 'Valor diario',
    'Fecha de terminación estimada', 'Documentos cargados',
  ];

  const filas = filtrados.map(c => {
    const { valorDiario } = calcularValores(c);
    const fin = fechaTerminacionEstimada(c.fechaInicio, c.plazoMeses, c.plazoDias);
    return [
      c.numeroContrato || '', c.nombre, c.cedula, c.correo || '', c.telefono || '', c.cargo || '', c.dependencia || '',
      c.tipoContrato || '', c.modalidad || '', c.supervisor || '', c.fechaFirma || '', c.fechaInicio || '',
      etiquetaEstado(c.estado), c.valorMensual || 0, c.valorTotal || 0, c.plazoMeses || 0, c.plazoDias || 0,
      Math.round(valorDiario), fin ? fin.toLocaleDateString('es-CO') : '',
      `${c.documentos.length}/${docsRequeridos(c).length}`,
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
  notificar(`CSV exportado (${filtrados.length} contratistas)`);
});

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
renderTabla();
