# Protocol Omega

Shooter de plataformas en navegador, con una campaña de 20 niveles, tres personajes y un jefe obligatorio al final de cada misión.

Repositorio oficial: [github.com/Human-Weapon/protocol-omega](https://github.com/Human-Weapon/protocol-omega)

## Jugar localmente

Desde esta carpeta, inicia un servidor estático y abre la dirección indicada:

```powershell
py -3 -m http.server 8765
```

Luego visita `http://127.0.0.1:8765`.

## Controles

| Acción | Control |
| --- | --- |
| Movimiento | A/D o flechas |
| Saltar | W, flecha arriba o Espacio |
| Disparar | Click izquierdo |
| Especial | Click derecho |
| Cambiar arma / especial | E / Q |
| Recargar | R |
| Pausa | P |
| Menú de campaña | A/D cambia de página · ←/→ cambia de nivel · clic o Enter elige |

El Ágil tiene doble salto; el Pesado no salta, pero escala paredes sólidas.

Cada personaje usa un ciclo de carrera propio para que el desplazamiento se perciba continuo incluso al cambiar de dirección.

## Campaña

- Cada nivel exige vencer a su jefe antes de abrir el portal.
- Se eligen hasta dos armas y dos especiales antes de cada misión.
- Las recompensas de jefe desbloquean equipo sin duplicarse al repetir niveles.
- Hay dos ascensos verticales: la Torre del Cataclismo y la Ciudad Flotante.
- El Arquitecto del Cataclismo es el final de cuatro fases; sus amenazas se anuncian antes de activarse.

## Verificación

Las pruebas son scripts de Node y no requieren dependencias:

```powershell
node test-physics.js
node test-level-variety.js
node test-ai-personality.js
node test-combat-regressions.js
node test-roster-and-hazards.js
node test-arsenal.js
node test-menu-ui.js
```

Para verificar que una copia coincide con el manifiesto oficial:

```powershell
npm run integrity:verify
```

El manifiesto SHA-256 detecta archivos modificados o ejecutables agregados, pero sólo demuestra procedencia cuando se compara con una copia obtenida del repositorio oficial.

## Licencia y colaboración

El código fuente está disponible para estudiar, modificar y compartir contenido con fines no comerciales. El uso comercial o la venta requieren autorización escrita. Consulta [LICENSE.md](LICENSE.md), [NOTICE.md](NOTICE.md), [SECURITY.md](SECURITY.md) y [CONTRIBUTING.md](CONTRIBUTING.md).
