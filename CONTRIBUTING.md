# Contribuir a Protocol Omega

1. Mantén los cambios de juego en `game.js`, la geometría en `level.js` y el arte de sprites en `sprites.js`.
2. Si agregas o cambias un nivel, define su ruta, encuentros, arena de jefe y prueba que el Clásico lo puede completar.
3. Si cambias combate, armas, personajes o IA, añade o ajusta una comprobación de regresión.
4. Ejecuta `npm run check` y `npm test` antes de abrir una entrega.
5. No añadas colisiones que no estén representadas visualmente en el mapa.
6. No añadas telemetría, descargas remotas, código ofuscado, minería, captura de credenciales ni conexiones de red sin una necesidad documentada y revisable.
7. Conserva los avisos de autoría y procedencia. Las contribuciones deben respetar la licencia no comercial del proyecto.
8. Actualiza el manifiesto con `npm run integrity:update` después de terminar y verifica con `npm run integrity:verify`.
