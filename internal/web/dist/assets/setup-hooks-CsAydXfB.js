const e="Configurar Webhooks",n="Usar Webhooks para enviar eventos externos (GitHub, alertas de monitoreo, etc.) a la AI para procesamiento",o={body:`## ¿Qué son los Hooks?

Hooks permiten que sistemas externos envíen eventos a HermesAgent. La AI puede procesar automáticamente los eventos y reportar resultados.

## Escenarios comunes

| Escenario | Fuente | Procesamiento AI |
|-----------|--------|------------------|
| Revisión de código | GitHub Webhook | AI revisa PR y comenta |
| Alertas de servidor | Sistema de monitoreo | AI analiza alertas y notifica |
| Envío de formularios | Formulario web | AI procesa y responde |

## Configurar en HermesDeckX

Vaya a «Centro de configuración → Hooks»:

1. Haga clic en «Agregar hook»
2. Configure nombre y descripción
3. El sistema generará una URL Webhook única
4. Configure la asignación de eventos
5. Ingrese la URL en el sistema externo

## Campos de configuración

Ruta correspondiente: \`hooks\``,steps:["Ir a «Centro de configuración → Hooks»","Crear nuevo hook y configurar nombre","Definir plantilla de asignación de eventos","Copiar la URL Webhook generada","Configurar Webhook en el sistema externo"]},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
