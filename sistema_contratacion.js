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
    telefono: '3001234567', cargo: 'Abogado', dependencia: 'Jurídica', valor: '$ 4.500.000',
    estado: 'completo', observaciones: '',
    documentos: ['cedula', 'rut', 'hoja_vida', 'antecedentes', 'poliza', 'certificado_bancario'],
  },
  {
    id: 2, nombre: 'Ana Gómez', cedula: '43125467', correo: 'ana.gomez@example.com',
    telefono: '3009876543', cargo: 'Ingeniera', dependencia: 'Planeación', valor: '$ 5.200.000',
    estado: 'pendiente', observaciones: '',
    documentos: ['cedula', 'rut', 'hoja_vida', 'antecedentes'],
  },
  {
    id: 3, nombre: 'Carlos López', cedula: '80987654', correo: 'carlos.lopez@example.com',
    telefono: '3011122233', cargo: 'Contador', dependencia: 'Hacienda', valor: '$ 3.800.000',
    estado: 'revision', observaciones: '',
    documentos: ['cedula', 'rut'],
  },
];

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

    tr.innerHTML = `
      <td><input type="checkbox" class="chk-fila" data-id="${c.id}" ${seleccionados.has(c.id) ? 'checked' : ''}></td>
      <td>${c.nombre}</td>
      <td>${c.cedula}</td>
      <td>${c.cargo}</td>
      <td>${c.dependencia}</td>
      <td><span class="estado ${c.estado}">${etiquetaEstado(c.estado)}</span></td>
      <td>${c.documentos.length}/${DOCUMENTOS_REQUERIDOS.length}</td>
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
  document.getElementById('campoValor').value = c.valor || '';
  document.getElementById('campoEstado').value = c.estado;
  document.getElementById('campoObservaciones').value = c.observaciones || '';

  renderListaDocumentos(c);
  cambiarPanel('datos');
  modal.classList.add('abierto');
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

// Guardar datos generales
document.getElementById('btnGuardarDatos').addEventListener('click', () => {
  const c = contratistas.find(x => x.id === contratistaActivoId);
  if (!c) return;
  c.nombre = document.getElementById('campoNombre').value.trim();
  c.cedula = document.getElementById('campoCedula').value.trim();
  c.correo = document.getElementById('campoCorreo').value.trim();
  c.telefono = document.getElementById('campoTelefono').value.trim();
  c.cargo = document.getElementById('campoCargo').value.trim();
  c.dependencia = document.getElementById('campoDependencia').value.trim();
  c.valor = document.getElementById('campoValor').value.trim();
  c.estado = document.getElementById('campoEstado').value;

  renderTabla();
  abrirModal(c.id); // refresca cabecera (nombre, sello)
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
    cargo: '', dependencia: '', valor: '', estado: 'pendiente', observaciones: '', documentos: [],
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
  return `
    <h1 style="font-size:20px;margin-bottom:4px;">${titulo}</h1>
    <p style="color:#555;margin-bottom:24px;">Generado el ${new Date().toLocaleDateString('es-CO')}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;width:180px;color:#555;">Nombre</td><td style="padding:6px 0;">${c.nombre}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Cédula</td><td style="padding:6px 0;">${c.cedula}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Cargo</td><td style="padding:6px 0;">${c.cargo}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Dependencia</td><td style="padding:6px 0;">${c.dependencia}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Valor del contrato</td><td style="padding:6px 0;">${c.valor || '—'}</td></tr>
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
// INIT
// -----------------------------------------------------
renderTabla();
