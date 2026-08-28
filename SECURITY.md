# Seguridad y autenticidad

Protocol Omega es un juego web estático. Una versión oficial no necesita permisos de administrador, instaladores, extensiones del navegador ni ejecutables descargados por separado.

## Fuente oficial

La única fuente oficial es:

https://github.com/Human-Weapon/protocol-omega

Si recibes el juego desde otro sitio, trátalo como una modificación de terceros. Los autores no pueden impedir que alguien altere un fork, por lo que ninguna marca de agua sustituye la verificación de integridad.

## Verificar una copia

1. Obtén `integrity-manifest.json` desde el mismo commit o release oficial que quieras comprobar.
2. Ejecuta `npm run integrity:verify` desde la carpeta del proyecto.
3. Si aparece un hash distinto, un archivo faltante o un ejecutable no registrado, no abras esa copia como si fuera oficial.

El verificador detecta cambios frente al manifiesto recibido. Un tercero también puede falsificar ambos archivos; por eso deben compararse con el commit o release del repositorio oficial.

Los archivos de texto se normalizan a saltos de línea LF antes de calcular su hash, de modo que la comprobación produzca el mismo resultado en Windows, macOS y Linux.

## Reglas de seguridad para contribuciones

No se aceptan cambios que incorporen:

- robo de credenciales, datos personales o archivos;
- minería de criptomonedas o consumo encubierto de recursos;
- telemetría o conexiones remotas no documentadas;
- descargas o ejecución dinámica de código;
- código ofuscado para ocultar comportamiento;
- malware, persistencia, escalada de privilegios o evasión de controles.

La política CSP de `index.html` bloquea conexiones de red desde el juego oficial y limita scripts, estilos, imágenes y audio al propio origen.

## Reportar una vulnerabilidad

Usa de forma privada la sección **Security → Report a vulnerability** del repositorio oficial:

https://github.com/Human-Weapon/protocol-omega/security/advisories/new

No publiques detalles explotables antes de que los mantenedores tengan oportunidad de revisar el informe.
