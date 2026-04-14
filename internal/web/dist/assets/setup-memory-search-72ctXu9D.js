const e="Configurar búsqueda de memoria",a="Activar la búsqueda semántica de memoria para que la AI pueda buscar conversaciones históricas y conocimiento almacenado",r={body:`## ¿Qué es la búsqueda de memoria?

La búsqueda de memoria permite que la AI busque información relevante en archivos de memoria históricos. Al activarla, la AI buscará automáticamente en el almacén de memoria antes de responder preguntas.

## Configurar en HermesDeckX

Vaya a «Centro de configuración → Herramientas»:

### 1. Activar herramienta de memoria
- Confirme que la herramienta «Memoria» está activada
- La AI usará esta herramienta para leer/escribir archivos en el directorio \`memory/\`

### 2. Activar búsqueda de memoria
- Active el interruptor «Búsqueda de memoria»
- Seleccione proveedor de búsqueda

### 3. Configurar indexación
- **autoIndex** — Indexar automáticamente nuevos archivos de memoria
- **indexOnBoot** — Reindexar al iniciar
- **maxResults** — Máximo de resultados por búsqueda

## Campos de configuración

Rutas correspondientes: \`tools.memory\`, \`tools.memorySearch\``,steps:["Ir a «Centro de configuración → Herramientas»","Activar herramienta de memoria","Activar función de búsqueda de memoria","Configurar opciones de indexación automática","Guardar configuración"]},n={name:e,description:a,content:r};export{r as content,n as default,a as description,e as name};
