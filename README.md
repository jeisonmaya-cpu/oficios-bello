# 🏛️ Sistema de Gestión — Alcaldía de Bello
### Dirección Administrativa de Ejecuciones Fiscales · Antioquia

Sistema web integrado para la gestión documental, jurídica y de atención al ciudadano. Funciona completamente en el navegador — sin servidores, sin instalaciones.

🔗 **[Acceder al sistema](https://jeisonmaya-cpu.github.io/oficios-bello/home.html)**

---

## 🗂 Módulos del ecosistema

| Archivo | Módulo | Descripción |
|---|---|---|
| `home.html` | 🏛️ **Hub central** | Página de inicio con acceso a todos los módulos |
| `index.html` | 📄 **Generar Oficios** | Desembargos, tutelas y carga masiva de documentos |
| `buscador.html` | 🔍 **Buscador de Guías** | Consulta contribuyentes, radicados y expedientes |
| `seguimiento.html` | 📋 **Seguimiento de Procesos** | Expedientes, vencimientos y cobro coactivo |
| `acuerdos.html` | 🤝 **Acuerdos de Pago** | Proyección de cuotas y formulario F-GAF-68 |
| `tutelas_v2.html` | ⚖️ **Sistema de Tutelas** | Seguimiento de tutelas, fallos y términos procesales |
| `pqr.html` | 📬 **Gestión PQR** | Radicación de PQRs desde PDF con detección IA ✨ |

---

## 📬 Módulo PQR — Configuración

El módulo PQR requiere dos servicios externos: **Google Sheets** como base de datos y un **Apps Script** como backend.

### 1. Crear el Google Sheet

1. Ir a [sheets.new](https://sheets.new) → renombrar la hoja (pestaña) como `PQR`
2. Escribir estos encabezados en la fila 1, en este orden exacto:

```
A          B       C     D      E       F            G        H       I        J             K       L           M
RADICADO | NOMBRE | CC | TIPO | ASUNTO | DEPENDENCIA | CANAL | FECHA | LIMITE | RESPONSABLE | ESTADO | NRESPUESTA | OBSERVACIONES
```

3. Copiar el **ID del Sheet** desde la URL:
```
https://docs.google.com/spreadsheets/d/ → ESTE_ES_EL_ID ← /edit
```

### 2. Instalar el Apps Script

1. En el Sheet → **Extensiones → Apps Script**
2. Borrar el contenido por defecto
3. Pegar el contenido de `pqr_apps_script.gs`
4. Guardar con **Ctrl+S**
5. *(Opcional)* Ejecutar `inicializarHoja` para que el script cree los encabezados con formato automáticamente

### 3. Desplegar como Web App

- **Implementar → Nueva implementación → Aplicación web**
- Ejecutar como: `Yo`
- Acceso: `Cualquier usuario`
- Copiar la **URL generada**

### 4. Conectar con el sistema

1. Abrir `pqr.html`
2. Tab **📤 Subir PDF** → panel izquierdo → bloque **⚙️ Configuración**
3. Pegar el **Sheet ID** y la **URL del Apps Script**
4. Se guardan automáticamente en `localStorage` — no hay que repetirlo

---

## 👥 Editar responsables PQR

En `pqr.html`, busca y edita este bloque:

```javascript
const RESP = [
  { nom: "Maria Camila Uribe",  ini: "MC", cargo: "Gestora PQR" },
  { nom: "Jaime Cordoba",       ini: "JC", cargo: "Analista"    },
  { nom: "Yennifer Chavarria",  ini: "YC", cargo: "Gestora PQR" },
  { nom: "Dario Baldrich",      ini: "DB", cargo: "Analista"    },
  { nom: "Deisy Lopez",         ini: "DL", cargo: "Gestora PQR" },
];
```

---

## 🔄 Flujo PQR

```
PDF recibido
    ↓
Subir al sistema (drag & drop)
    ↓
Extracción de texto — PDF.js (local, sin servidor)
    ↓
Detección automática con IA — Claude API
    → Nombre · CC/NIT · Radicado · Tipo · Asunto
    ↓
Revisión manual + asignación de responsable
    ↓
Guardar en Google Sheets
    ↓
Seguimiento en Dashboard → hasta Cerrado/Respondido
```

---

## 📋 Estados PQR

| Estado | Color | Significado |
|---|---|---|
| **Nuevo** | 🟣 Violeta | Radicada, sin gestión iniciada |
| **En proceso** | 🟡 Amarillo | Siendo atendida |
| **Respondido** | 🟢 Verde | Respuesta formal emitida |
| **Vencido** | 🔴 Rojo | Superó fecha límite sin respuesta |
| **Cerrado** | ⚫ Gris | Finalizado y archivado |

---

## 🛠 Tecnologías

| Tecnología | Uso |
|---|---|
| HTML + CSS + JS | Todo el frontend (sin frameworks, sin build) |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Extracción de texto del PDF en el navegador |
| [Claude API](https://www.anthropic.com) | Detección inteligente de campos en el documento |
| Google Sheets | Base de datos de PQRs |
| Google Apps Script | API backend (lectura/escritura en Sheets) |
| GitHub Pages | Hosting gratuito del sistema completo |

---

## 🔒 Seguridad

- El **Sheet ID** y la **URL del script** viven solo en el `localStorage` del navegador — no están en el código fuente
- El Apps Script requiere autenticación Google — nadie externo puede escribir en tu hoja
- El texto del PDF se procesa localmente con PDF.js; solo el fragmento necesario se envía a Claude para detectar campos
- Recomendado: configurar el acceso del Apps Script como **"Solo tu organización"** para entornos internos

---

## 📁 Archivos del repositorio

```
oficios-bello/
├── home.html                 ← Hub central (actualizado con módulo PQR)
├── index.html                ← Generar oficios
├── buscador.html             ← Buscador de guías
├── seguimiento.html          ← Seguimiento de procesos
├── acuerdos.html             ← Acuerdos de pago
├── tutelas_v2.html           ← Sistema de tutelas
├── pqr.html                  ← Gestión PQR (nuevo)
├── pqr_apps_script.gs        ← Backend Google Apps Script (nuevo)
├── favicon.svg
├── manifest.json
├── plantilla_desembargo.b64
├── plantilla_tutela.b64
└── README.md
```

---

## 🚀 Cómo subir cambios al repo

```bash
# Clonar (primera vez)
git clone https://github.com/jeisonmaya-cpu/oficios-bello.git
cd oficios-bello

# Agregar los nuevos archivos
# → copiar pqr.html, pqr_apps_script.gs y home.html (actualizado)

git add pqr.html pqr_apps_script.gs home.html README.md
git commit -m "feat: módulo PQR gestión documental con detección IA"
git push origin main
```

GitHub Pages publica automáticamente en:
```
https://jeisonmaya-cpu.github.io/oficios-bello/
```

---

*Desarrollado con Claude (Anthropic) · Alcaldía de Bello 2025*
