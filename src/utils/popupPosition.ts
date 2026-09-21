/** Clamps a popup's intended top-left position so it stays fully within the
 * viewport, given its (fixed, known) width/height. Used for popups anchored
 * to a click point (which can be near a screen edge, especially on small
 * mobile viewports where there's little room to spare). */
export function clampPopupPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 8,
): { x: number; y: number } {
  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(margin, window.innerHeight - height - margin)
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  }
}
