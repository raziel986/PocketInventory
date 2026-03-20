# Proyecto: [Nombre de la Aplicación] - Especificaciones Técnicas (Base Blueprint)

Este documento detalla la arquitectura técnica y el modelo de datos de la base utilizada en **PocketITCheck**, diseñada para ser una Aplicación Web Progresiva (PWA) de alto rendimiento, *offline-first* y sin dependencias de servidor (*Zero-Backend*).

---

## 🏗️ Arquitectura General

La aplicación sigue un enfoque de **Single Page Application (SPA)** enriquecida con capacidades de **PWA**.

### Stack Tecnológico (Core)
- **Lenguaje**: JavaScript Vanilla (ES6+).
- **Interfaz**: HTML5 y CSS3 con diseño *Glassmorphism*.
- **Módulos**: Utiliza Módulos de JavaScript (ESM) para separar la lógica de persistencia, UI y generación de documentos.
- **Portabilidad**: Diseño "Todo-en-Uno". Puede ejecutarse abriendo el `index.html` localmente o servirse vía HTTPS para activar funciones PWA.

### Componentes de Aplicación Web Progresiva (PWA)
- **Manifest**: `manifest.json` define el nombre, iconos y colores para la instalación en dispositivos móviles.
- **Service Worker**: `sw.js` gestiona el almacenamiento en caché de activos críticos (JS, CSS, Imágenes) para permitir el funcionamiento sin conexión a internet.

---

## 💾 Persistencia de Datos y Modelo

La aplicación utiliza un sistema de almacenamiento híbrido priorizando la seguridad y privacidad local.

### Capa de Datos (IndexedDB)
- **Motor**: API de `IndexedDB` nativa del navegador.
- **Estructura**:
    - **Entidad Principal (Parent)**: Representa el contenedor de alto nivel (en PocketITCheck es la "Oficina/Cliente").
    - **Entidad Secundaria (Child)**: Representa los elementos individuales (en PocketITCheck son los "Equipos/Activos").
- **Flujo**: Las operaciones son asíncronas para evitar bloqueos en la interfaz de usuario.
- **Backup**: Se mantiene una lógica de migración para datos antiguos almacenados en `localStorage`.

### Esquema de Datos sugerido (JSON)
```json
{
  "id": "timestamp_unique_id",
  "metadata_parent": {
    "nombre": "String",
    "ubicacion": "String",
    "fecha": "Date (YYYY-MM-DD)",
    "responsable": "String"
  },
  "items": [
    {
      "id_item": "String",
      "categoria": "Enum (Tipo A, B, C)",
      "estado": "String",
      "atributos_dinamicos": {
        "campo_variable_1": "Value",
        "campo_variable_2": "Value"
      },
      "diagnostico": {
        "seccion_1": { "item_a": true, "item_b": false },
        "notas": "String"
      },
      "historial_acciones": []
    }
  ]
}
```

---

## 🎨 Sistema de Interfaz (UI/UX)

Diseñado para ser intuitivo, rápido y estéticamente premium.

- **Diseño Glassmorphism**: Uso extendido de fondos traslúcidos, bordes suaves y sombras para profundidad visual.
- **Responsive "Mobile-First"**:
    - Objetivos táctiles mínimos de 48px.
    - Tablas con modo "Card" automático en pantallas pequeñas.
    - Menús laterales (Sidebars) para formularios que se ocultan/muestran dinámicamente.
- **Feedback Visual**: Integración de `SweetAlert2` para confirmaciones de borrado, éxito de guardado y alertas de sistema.

---

## 📊 Motor de Reportes (PDF Engine)

Lógica desacoplada para generar documentos profesionales listos para imprimir.

- **Librería**: `jsPDF` y `jsPDF-AutoTable`.
- **Características**:
    - Encabezados dinámicos con logotipos.
    - Tablas con auto-paginación y totales.
    - Secciones de firmas y sellos preconfiguradas.
    - Soporte para orientación Horizontal (Landscape) en planes maestros.

---

## 🌐 Internacionalización (i18n)

Sistema de traducción ligero basado en diccionarios JSON.

- **Lógica**: Un archivo `translations.js` actúa como fuente de verdad para todos los literales de la app.
- **Persistencia**: El idioma seleccionado por el usuario se guarda en `localStorage` para sesiones futuras.
- **Implementación**: Las etiquetas en el HTML utilizan atributos `data-i18n` que son inyectados dinámicamente al cargar la app.

---

## 🚀 Guía para Adaptar a otras Áreas

Para reutilizar esta base en otras industrias (ej: Gestión Médica, Inventario de Almacén, Control de Vehículos):

1. **Definir Entidades**: Cambiar "Oficina" por "Paciente" o "Bodega".
2. **Atributos Dinámicos**: Modificar el objeto `categoryFields` en `js/ui.js` para los nuevos campos requeridos.
3. **Checklist de Diagnóstico**: Actualizar la constante `DIAG_STRUCTURE` en `app.js` con las nuevas categorías de revisión técnica.
4. **Diseño Visual**: Ajustar las variables de color en `index.css` para alinearse a la nueva identidad de marca.
