# PocketInventory - SPA

PocketInventory es una Aplicación de Página Única (SPA) contenida íntegramente en un solo archivo `index.html`. Está diseñada para ser una herramienta rápida, extremadamente portátil y que funciona sin necesidad de un servidor *backend*. Permite a auditores, técnicos de soporte y administradores de TI llevar un registro organizado, multi-oficina y offline de los activos informáticos.

## ✨ Características Principales

- **Diseño Todo-en-Uno (Zero-Install):** Todo el código (HTML, CSS, JS) vive en un solo archivo. Simplemente haz doble clic y comienza a trabajar en cualquier navegador.
- **Gestión Multi-Oficina / Multi-Cliente:** Crea espacios de trabajo aislados para cada cliente o departamento y maneja los inventarios por separado.
- **Estándares ITIL / ISO 20000:** Cumple con convenciones internacionales incorporando campos estandarizados (Número de Serie, Asset Tag, estado del equipo, fechas de compra/garantía).
- **Atributos Dinámicos por Categoría:** El formulario de creación se adapta en tiempo real mostrando campos técnicos específicos dependiendo de si cargas una Laptop, Desktop, Impresora, Router, etc.
- **Funcionamiento *Offline-First*:** Los datos se guardan automáticamente en tu computadora usando `localStorage`.
- **Exportación Versátil:** Descarga localmente:
  - Reporte consolidado en Excel (formato CSV nativo).
  - Reporte profesional en formato PDF.
  - Formato amigable para imprimir el listado o guardarlo como comprobante.
- **Detección Automática de Conexión:** Si te quedaste sin Internet evaluando equipos en un sótano, la app deshabilita dinámicamente la función PDF (que requiere descargar `jsPDF` externamente) e inteligentemente recomienda alternativas 100% offline.

---

## 🚀 Cómo usar

1. Descarga el archivo `PocketInventory.html`.
2. Ábrelo en cualquier navegador web moderno (Google Chrome, Firefox, Microsoft Edge, Safari).
3. Aparecerá el Gestor de Oficinas: registra una oficina nueva y luego pulsa el botón **"Seleccionar ➡️"**.
4. ¡Comienza a llenar el inventario! Toda la información introducida persistirá localmente, es decir, el navegador la recordará incluso si cierras la pestaña.

> **Importante:** Al vivir enteramente bajo la tecnología `localStorage`, la información se guarda únicamente en tu navegador. Si limpias rutinariamente la caché de tu navegador o utilizas el "Modo Incógnito", perderás los datos de las oficinas creadas. ¡Recuerda utilizar constantemente los botones de exportación!

---

## 🛠️ Tecnologías Utilizadas

- **Front-end:** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Estilos:** Flexbox y CSS Grid. UI reactiva y *Dark Mode* adaptativo embebido mediante CSS plano (*Glassmorphism*).
- **Librerías (*vía CDN*):**
  - [jsPDF](https://github.com/parallax/jsPDF) - Para la generación de archivos PDF del lado del cliente.
  - [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) - Módulo complementario para construir y renderizar el formato de la lista de auditoría interna de PDFs.

---

## 📜 Licencia y Derechos de Autor

PocketInventory está protegido bajo la **Licencia Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)**. 

Esto significa que eres totalmente libre de descargar, usar y modificar esta herramienta para tus auditorías o las de tu departamento de forma gratuita, siempre y cuando se cumplan dos reglas principales:

1. **Reconocimiento (Atribución):** Debes dar crédito explícito al autor original (Carlos Noguera) manteniendo el pie de página de la aplicación y la mención en el código.
2. **Uso No Comercial:** Queda estrictamente prohibido empaquetar, vender o usar este software con el propósito directo de comercializarlo como producto propio.

Para leer los detalles legales completos, consulta el archivo [LICENSE](LICENSE) incluido en este repositorio o visita [Creative Commons](https://creativecommons.org/licenses/by-nc/4.0/deed.es).

---

## 👨‍💻 Créditos

Desarrollado por **Carlos Noguera**  
✉️ Contacto: [cnoguera.dev@gmail.com](mailto:cnoguera.dev@gmail.com)
