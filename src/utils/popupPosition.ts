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

/** Positions a popup just below (or, if there isn't enough room, above) a
 * given line's viewport bounds, so it never covers the verse it describes.
 * Falls back to whichever side has more room, then clamps to the viewport. */
export function positionPopupNearLine(
  lineLeft: number,
  lineTop: number,
  lineBottom: number,
  width: number,
  height: number,
  margin = 8,
  gap = 8,
): { x: number; y: number } {
  const spaceBelow = window.innerHeight - lineBottom
  const spaceAbove = lineTop
  const y =
    spaceBelow >= height + gap || spaceBelow >= spaceAbove ? lineBottom + gap : lineTop - height - gap

  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(margin, window.innerHeight - height - margin)
  return {
    x: Math.min(Math.max(lineLeft, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  }
}
