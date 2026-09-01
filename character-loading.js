(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.YAEL_CHARACTER_LOADING = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createGate(timeoutFrames) {
    return {
      frames: 0,
      timeoutFrames: Math.max(1, Math.round(timeoutFrames || 180)),
      opened: false,
      timedOut: false,
    };
  }

  function advanceGate(gate, ready) {
    if (!gate || gate.opened) return true;
    gate.frames++;
    if (ready || gate.frames >= gate.timeoutFrames) {
      gate.opened = true;
      gate.timedOut = !ready;
    }
    return gate.opened;
  }

  return { createGate, advanceGate };
});
