# Yael: Protocolo Belmont

Shooter de plataformas en navegador, con una campaña de 20 niveles, tres personajes y un jefe obligatorio al final de cada misión.

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

El Ágil tiene doble salto; el Pesado no salta, pero escala paredes sólidas.

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
```
