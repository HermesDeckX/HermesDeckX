const e="Problema de permisos del sandbox",n="Resolver problemas de permisos insuficientes del sandbox Docker, acceso denegado a archivos o fallo al iniciar contenedor",o={question:"¿Qué hacer si hay problemas de permisos en modo sandbox?",answer:`## Problemas comunes de permisos

### 1. Docker no instalado o no ejecutándose
- Confirme que Docker Desktop está instalado y ejecutándose
- **Windows**: Abra la aplicación Docker Desktop
- **macOS**: Abra Docker Desktop
- **Linux**: \`sudo systemctl start docker\`

### 2. Fallo al iniciar contenedor
Causas comunes:
- La imagen Docker no existe: ejecute \`docker pull\`
- Memoria insuficiente: aumente el límite de memoria de Docker
- Espacio en disco insuficiente: limpie imágenes y contenedores no utilizados

### 3. Acceso denegado a archivos
- Verifique el modo de acceso al workspace: \`none\` / \`ro\` / \`rw\`
- Si necesita escritura, cambie el modo a \`rw\`
- Confirme que la ruta de montaje es correcta

### 4. Problemas de acceso a red
- El sandbox puede restringir el acceso a red por defecto
- Si necesita red, confirme que la política de red lo permite

### 5. Permisos de ejecución
- Algunos scripts pueden requerir permisos de ejecución
- Confirme que el usuario dentro del contenedor tiene permisos suficientes

## Alternativas

Si el sandbox Docker tiene problemas, temporalmente:
- Desactive el modo sandbox (solo en entornos confiables)
- Use un modo de acceso más permisivo
- Use Podman como runtime de contenedor alternativo

## Campos de configuración

Ruta correspondiente: \`agents.defaults.sandbox\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
