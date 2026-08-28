# Yael contributor notes

- This is a static browser game; do not add a build system or runtime dependency without a concrete gameplay need.
- Keep the portal closed until the active boss is defeated.
- Every collision must correspond to a drawn tile. Bridges and lava are never lateral invisible walls.
- Run `npm run check` and `npm test` after gameplay, physics, map, weapon, character, or AI changes.
- A campaign map needs a distinct route, encounter plan, boss arena, and a playable route for the Clásico.
