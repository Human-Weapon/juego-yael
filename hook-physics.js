(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.YAEL_HOOK_PHYSICS = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function center(actor) {
    return { x: actor.x + actor.w / 2, y: actor.y + actor.h / 2 };
  }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function classifyTarget(target, player) {
    const targetArea = Math.max(1, target.w * target.h);
    const playerArea = Math.max(1, player.w * player.h);
    const targetSpan = Math.max(target.w, target.h);
    const playerSpan = Math.max(player.w, player.h);
    // Compare the occupied silhouette, not only width: a broad, low creature
    // such as a piranha is still a small target, while a tall sniper is large.
    const larger = targetSpan > playerSpan || targetArea > playerArea * 1.25;
    return larger ? "player" : "target";
  }

  function addPull(actor, destination, strength, maxSpeed) {
    const origin = center(actor);
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return { x: 0, y: 0, distance: 0 };
    const nx = dx / length;
    const ny = dy / length;
    actor.vx = clamp((actor.vx || 0) + nx * strength, -maxSpeed, maxSpeed);
    actor.vy = clamp((actor.vy || 0) + ny * strength, -maxSpeed, maxSpeed);
    return { x: nx, y: ny, distance: length };
  }

  function stepEnemy(hook, player, target, options) {
    const opts = options || {};
    const playerCenter = center(player);
    const targetCenter = center(target);
    const mode = hook.targetMode || classifyTarget(target, player);
    hook.targetMode = mode;
    const currentDistance = distance(playerCenter, targetCenter);
    const desiredDistance = Math.max(46, (player.w + target.w) * 0.5 + (mode === "target" ? 14 : 22));
    const stretch = Math.max(0, currentDistance - desiredDistance);
    const strength = stretch > 0 ? clamp((opts.baseStrength || 0.72) + stretch * 0.012, 0.72, opts.maxStrength || 2.9) : 0;
    const maxSpeed = mode === "target" ? (opts.targetMaxSpeed || 13) : (opts.playerMaxSpeed || 19);
    const pulled = mode === "target"
      ? addPull(target, playerCenter, strength, maxSpeed)
      : addPull(player, targetCenter, strength, maxSpeed);

    // Damp only the component that would overshoot the meeting distance. The
    // tangential component remains, so a moving target can arc around the
    // player instead of snapping to a fixed point.
    if (currentDistance <= desiredDistance + 18) {
      const vx = mode === "target" ? target.vx : player.vx;
      const vy = mode === "target" ? target.vy : player.vy;
      const radial = vx * pulled.x + vy * pulled.y;
      if (radial > 0) {
        const actor = mode === "target" ? target : player;
        const damping = stretch > 0 ? 0.46 : 0.92;
        actor.vx -= pulled.x * radial * damping;
        actor.vy -= pulled.y * radial * damping;
      }
    }
    hook.ropeLength = Math.max(desiredDistance, Math.min(hook.ropeLength || currentDistance, currentDistance + 18));
    return { mode, distance: currentDistance, desiredDistance, playerCenter, targetCenter };
  }

  function stepSurface(hook, player, options) {
    const opts = options || {};
    const playerCenter = center(player);
    const anchor = { x: hook.anchorX, y: hook.anchorY };
    const dx = anchor.x - playerCenter.x;
    const dy = anchor.y - playerCenter.y;
    const currentDistance = Math.hypot(dx, dy);
    if (currentDistance < 0.001) return { distance: 0, ropeLength: hook.ropeLength || 0, taut: false, playerCenter, anchor };
    const nx = dx / currentDistance;
    const ny = dy / currentDistance;
    const minLength = opts.minLength || 58;
    const reelSpeed = opts.reelSpeed || 0.48;
    hook.ropeLength = Math.max(minLength, (hook.ropeLength || currentDistance) - reelSpeed);
    const stretch = currentDistance - hook.ropeLength;
    if (stretch > 0) {
      const strength = clamp(stretch * (opts.spring || 0.065), 0, opts.maxStrength || 2.8);
      player.vx = clamp((player.vx || 0) + nx * strength, -(opts.maxSpeed || 19), opts.maxSpeed || 19);
      player.vy = clamp((player.vy || 0) + ny * strength, -(opts.maxSpeed || 19), opts.maxSpeed || 19);
      const radial = player.vx * nx + player.vy * ny;
      if (radial < 0) {
        player.vx -= nx * radial * 0.92;
        player.vy -= ny * radial * 0.92;
      }
      // Correct only severe overshoot. Small corrections leave the player’s
      // tangential velocity intact, which produces a controllable swing.
      if (stretch > 84) {
        const correction = Math.min(stretch - 84, 18);
        player.x += nx * correction;
        player.y += ny * correction;
      }
    }
    return { distance: currentDistance, ropeLength: hook.ropeLength, taut: stretch > 0, playerCenter, anchor, nx, ny };
  }

  return { center, classifyTarget, stepEnemy, stepSurface };
});
