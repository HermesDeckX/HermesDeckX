const e="Modelo no responde",o="Solucionar problemas cuando el modelo AI no responde o agota el tiempo — verificar clave API, cuota y red",n={question:"¿Qué hacer si el modelo AI no responde o agota el tiempo?",answer:`## Pasos de solución

### 1. Verificar clave API
Vaya a «Centro de configuración → Proveedores de modelos»:
- Confirme que la clave API está ingresada y es correcta
- Confirme que la clave no ha expirado ni sido revocada
- Intente regenerar la clave en la consola del proveedor

### 2. Verificar cuota y saldo
- **OpenAI** — Verifique la página de uso en platform.openai.com
- **Anthropic** — Verifique el uso en console.anthropic.com
- **Google** — Verifique la cuota API en Cloud Console

### 3. Verificar disponibilidad del modelo
- Confirme que el nombre del modelo seleccionado es correcto
- Algunos modelos pueden requerir permisos especiales de acceso
- Intente cambiar a otro modelo para probar

### 4. Verificar conexión de red
- Confirme que puede acceder al endpoint API del proveedor
- Si usa proxy, confirme que la configuración es correcta

### 5. Usar modelo de fallback
- Configure una cadena de modelos de fallback para alta disponibilidad
- El modelo principal falla y cambia automáticamente al modelo de fallback

## Solución rápida

Ejecute diagnóstico en el «Centro de salud» → Verifique el elemento model.reachable.`},a={name:e,description:o,content:n};export{n as content,a as default,o as description,e as name};
