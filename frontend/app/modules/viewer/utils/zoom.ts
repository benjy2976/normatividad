export const MIN_PDF_ZOOM = 0.25
export const MAX_PDF_ZOOM = 5

export function clampPdfZoom(scale: number) {
  return Math.min(MAX_PDF_ZOOM, Math.max(MIN_PDF_ZOOM, Number.isFinite(scale) ? scale : 1))
}

export function wheelPdfZoom(current: number, delta: number, mode: number, viewportHeight: number) {
  if (!Number.isFinite(delta) || delta === 0) return current
  // Ajustar al ancho puede producir escalas fuera de los límites manuales.
  if ((delta < 0 && current >= MAX_PDF_ZOOM) || (delta > 0 && current <= MIN_PDF_ZOOM)) return current
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1)
  const next = current * Math.exp(-Math.max(-120, Math.min(120, pixels)) * 0.0015)
  return Math.round(clampPdfZoom(next) * 10_000) / 10_000
}
