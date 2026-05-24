// ═══════════════════════════════════════════════════════════════
//  PQR — Gestión Documental · Alcaldía de Bello
//  Apps Script Web App
//  Versión: 1.0
//
//  INSTRUCCIONES DE DESPLIEGUE:
//  1. En Google Sheets → Extensiones → Apps Script
//  2. Pega todo este código (reemplaza lo que haya)
//  3. Guardar (Ctrl+S)
//  4. Implementar → Nueva implementación
//     - Tipo: Aplicación web
//     - Ejecutar como: Yo (tu cuenta)
//     - Quién tiene acceso: Cualquier usuario (o tu organización)
//  5. Copiar la URL generada → pegarla en el sistema PQR (campo Apps Script URL)
// ═══════════════════════════════════════════════════════════════

// ── Nombre exacto de la hoja en tu Spreadsheet ──
const HOJA_PQR = "PQR";

// ── Columnas en orden (deben coincidir con la fila 1 del Sheet) ──
const COLS = [
  "RADICADO",
  "NOMBRE",
  "CC",
  "TIPO",
  "ASUNTO",
  "DEPENDENCIA",
  "CANAL",
  "FECHA",
  "LIMITE",
  "RESPONSABLE",
  "ESTADO",
  "NRESPUESTA",
  "OBSERVACIONES",
];

// ════════════════════════════════════════════════
//  ENTRY POINTS
// ════════════════════════════════════════════════

/**
 * GET — usado por el frontend para leer datos vía gviz (no pasa por aquí,
 * el frontend lee directo desde la URL pública del Sheet).
 * Este endpoint se deja por si se necesita en el futuro.
 */
function doGet(e) {
  return respOk({ mensaje: "PQR Apps Script activo", version: "1.0" });
}

/**
 * POST — todas las acciones del frontend llegan aquí.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const accion = body.accion;

    switch (accion) {
      case "crearPQR":      return crearPQR(body.datos);
      case "actualizarPQR": return actualizarPQR(body.radicado, body.campos);
      case "eliminarPQR":   return eliminarPQR(body.radicado);
      case "buscarPQR":     return buscarPQR(body.radicado);
      default:
        return respErr("Acción desconocida: " + accion);
    }
  } catch (err) {
    return respErr("Error interno: " + err.message);
  }
}

// ════════════════════════════════════════════════
//  ACCIONES
// ════════════════════════════════════════════════

/**
 * Crea una nueva fila de PQR.
 * Valida que el radicado no exista ya.
 */
function crearPQR(datos) {
  if (!datos || !datos.RADICADO) return respErr("Falta el campo RADICADO");

  const hoja = getHoja();
  const radicadosExistentes = getColumnValues(hoja, 1); // columna A = RADICADO

  if (radicadosExistentes.includes(String(datos.RADICADO).trim())) {
    return respErr("Ya existe una PQR con el radicado: " + datos.RADICADO);
  }

  // Construir fila en el orden de COLS
  const fila = COLS.map(col => {
    const val = datos[col] !== undefined ? datos[col] : "";
    return String(val).trim();
  });

  hoja.appendRow(fila);

  // Formatear la fila recién insertada
  const ultimaFila = hoja.getLastRow();
  formatearFila(hoja, ultimaFila);

  return respOk({ mensaje: "PQR creada", radicado: datos.RADICADO, fila: ultimaFila });
}

/**
 * Actualiza campos específicos de una PQR existente.
 * campos = objeto con las claves a actualizar (ESTADO, RESPONSABLE, etc.)
 */
function actualizarPQR(radicado, campos) {
  if (!radicado) return respErr("Falta el radicado");
  if (!campos || Object.keys(campos).length === 0) return respErr("No hay campos para actualizar");

  const hoja  = getHoja();
  const datos = hoja.getDataRange().getValues();
  const header = datos[0].map(h => String(h).trim().toUpperCase());

  // Buscar fila por RADICADO (columna A)
  let filaIdx = -1;
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === String(radicado).trim()) {
      filaIdx = i + 1; // +1 porque las filas de Sheets empiezan en 1
      break;
    }
  }

  if (filaIdx === -1) return respErr("No se encontró el radicado: " + radicado);

  // Mapear nombre de campo (minúsculas → MAYÚSCULAS) para mayor flexibilidad
  const mapaFlexible = {
    estado:        "ESTADO",
    responsable:   "RESPONSABLE",
    nrespuesta:    "NRESPUESTA",
    observaciones: "OBSERVACIONES",
    asunto:        "ASUNTO",
    limite:        "LIMITE",
    tipo:          "TIPO",
    canal:         "CANAL",
    dependencia:   "DEPENDENCIA",
  };

  let actualizados = 0;

  Object.entries(campos).forEach(([clave, valor]) => {
    const colNombre = mapaFlexible[clave.toLowerCase()] || clave.toUpperCase();
    const colIdx    = header.indexOf(colNombre);
    if (colIdx === -1) return; // columna no encontrada, ignorar
    hoja.getRange(filaIdx, colIdx + 1).setValue(String(valor || "").trim());
    actualizados++;
  });

  return respOk({ mensaje: `${actualizados} campo(s) actualizado(s)`, radicado, fila: filaIdx });
}

/**
 * Busca una PQR por radicado y devuelve sus datos.
 */
function buscarPQR(radicado) {
  if (!radicado) return respErr("Falta el radicado");

  const hoja  = getHoja();
  const datos = hoja.getDataRange().getValues();
  const header = datos[0].map(h => String(h).trim());

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === String(radicado).trim()) {
      const obj = {};
      header.forEach((col, j) => { obj[col] = datos[i][j]; });
      return respOk({ encontrado: true, datos: obj });
    }
  }

  return respOk({ encontrado: false, radicado });
}

/**
 * Marca una PQR como eliminada cambiando su estado a "Eliminado".
 * No borra físicamente la fila para mantener trazabilidad.
 */
function eliminarPQR(radicado) {
  return actualizarPQR(radicado, { estado: "Eliminado" });
}

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════

function getHoja() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_PQR);
  if (!hoja) throw new Error(`No se encontró la hoja "${HOJA_PQR}". Verifica el nombre.`);
  return hoja;
}

function getColumnValues(hoja, colNum) {
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return [];
  return hoja
    .getRange(2, colNum, lastRow - 1, 1)
    .getValues()
    .flat()
    .map(v => String(v).trim());
}

/**
 * Aplica formato visual básico a una fila recién insertada:
 * - Fuente limpia
 * - Borde inferior suave
 * - Color de fondo alternado para legibilidad
 */
function formatearFila(hoja, numFila) {
  try {
    const totalCols = COLS.length;
    const rango     = hoja.getRange(numFila, 1, 1, totalCols);

    rango.setFontFamily("Arial");
    rango.setFontSize(10);
    rango.setBorder(false, false, true, false, false, false, "#e0e0e0", SpreadsheetApp.BorderStyle.SOLID);

    // Alternado suave
    if (numFila % 2 === 0) {
      rango.setBackground("#f8f9fa");
    } else {
      rango.setBackground("#ffffff");
    }

    // Columna ESTADO — centrada
    const colEstado = COLS.indexOf("ESTADO") + 1;
    if (colEstado > 0) hoja.getRange(numFila, colEstado).setHorizontalAlignment("center");

    // Columnas de fecha — formato dd/mm/yyyy
    ["FECHA", "LIMITE"].forEach(col => {
      const idx = COLS.indexOf(col) + 1;
      if (idx > 0) hoja.getRange(numFila, idx).setNumberFormat("dd/mm/yyyy");
    });
  } catch (e) {
    // El formateo es cosmético; si falla no interrumpe el flujo
    Logger.log("Advertencia formateo: " + e.message);
  }
}

/**
 * Inicializa la hoja con encabezados y formato si está vacía.
 * Llama esta función manualmente una sola vez desde el editor si quieres
 * que el script cree los encabezados automáticamente.
 */
function inicializarHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_PQR);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_PQR);
  }

  // Solo escribir encabezados si la hoja está vacía
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLS);

    // Formato encabezados
    const header = hoja.getRange(1, 1, 1, COLS.length);
    header.setFontWeight("bold");
    header.setFontFamily("Arial");
    header.setFontSize(10);
    header.setBackground("#1a1a2e");
    header.setFontColor("#ffffff");
    header.setHorizontalAlignment("center");
    hoja.setFrozenRows(1);

    // Ancho de columnas sugerido
    const anchos = [160, 200, 120, 100, 340, 180, 160, 100, 100, 180, 100, 140, 220];
    anchos.forEach((ancho, i) => hoja.setColumnWidth(i + 1, ancho));

    SpreadsheetApp.getUi().alert("✅ Hoja PQR inicializada correctamente con " + COLS.length + " columnas.");
  } else {
    SpreadsheetApp.getUi().alert("La hoja ya tiene datos. No se modificaron los encabezados.");
  }
}

// ════════════════════════════════════════════════
//  MENÚ PERSONALIZADO (opcional)
// ════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚙️ PQR Sistema")
    .addItem("Inicializar hoja (primera vez)", "inicializarHoja")
    .addItem("Ver registros totales", "contarRegistros")
    .addSeparator()
    .addItem("Exportar vencidas a nueva hoja", "exportarVencidas")
    .addToUi();
}

function contarRegistros() {
  const hoja    = getHoja();
  const total   = Math.max(hoja.getLastRow() - 1, 0);
  const datos   = hoja.getDataRange().getValues();
  const header  = datos[0].map(h => String(h).trim().toUpperCase());
  const colEst  = header.indexOf("ESTADO");

  let nuevas=0, enProceso=0, respondidas=0, vencidas=0, cerradas=0;

  for (let i = 1; i < datos.length; i++) {
    const est = String(datos[i][colEst] || "").trim();
    if (est === "Nuevo")        nuevas++;
    else if (est === "En proceso") enProceso++;
    else if (est === "Respondido") respondidas++;
    else if (est === "Vencido")    vencidas++;
    else if (est === "Cerrado")    cerradas++;
  }

  SpreadsheetApp.getUi().alert(
    `📊 Resumen PQR\n\n` +
    `Total registros:  ${total}\n` +
    `Nuevas:           ${nuevas}\n` +
    `En proceso:       ${enProceso}\n` +
    `Respondidas:      ${respondidas}\n` +
    `Vencidas:         ${vencidas}\n` +
    `Cerradas:         ${cerradas}`
  );
}

function exportarVencidas() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const hoja    = getHoja();
  const datos   = hoja.getDataRange().getValues();
  const header  = datos[0];
  const colEst  = header.map(h=>String(h).trim().toUpperCase()).indexOf("ESTADO");
  const colLim  = header.map(h=>String(h).trim().toUpperCase()).indexOf("LIMITE");

  const hoy     = new Date(); hoy.setHours(0,0,0,0);

  const vencidas = datos.slice(1).filter(fila => {
    const est = String(fila[colEst] || "").trim();
    if (["Cerrado", "Respondido", "Eliminado"].includes(est)) return false;
    const lim = new Date(fila[colLim]);
    return !isNaN(lim) && lim < hoy;
  });

  if (vencidas.length === 0) {
    SpreadsheetApp.getUi().alert("✅ No hay PQRs vencidas.");
    return;
  }

  const nombre  = "Vencidas_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmm");
  let hojaExp   = ss.getSheetByName(nombre);
  if (hojaExp)  ss.deleteSheet(hojaExp);
  hojaExp = ss.insertSheet(nombre);

  hojaExp.appendRow(header);
  vencidas.forEach(fila => hojaExp.appendRow(fila));

  const hRange = hojaExp.getRange(1, 1, 1, header.length);
  hRange.setFontWeight("bold").setBackground("#c0392b").setFontColor("#ffffff");

  SpreadsheetApp.getUi().alert(
    `✅ Se exportaron ${vencidas.length} PQR(s) vencida(s) a la hoja "${nombre}".`
  );
}

// ════════════════════════════════════════════════
//  RESPUESTAS JSON
// ════════════════════════════════════════════════

function respOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
