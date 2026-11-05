const MAX_CANVAS_DIMENSION = 32767

export function pdfPixelRatio(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1
}

// Match CSS edges to whole device pixels. The PDF viewport retains its exact scale.
export function alignPdfDimension(value: number, pixelRatio: number) {
  const ratio = pdfPixelRatio(pixelRatio)
  return Math.max(1, Math.floor(value * ratio + 1e-7)) / ratio
}

export function pdfRaster(width: number, height: number, pixelRatio: number, visible: boolean, pixelBudget: number) {
  const ratio = pdfPixelRatio(pixelRatio)
  const cssWidth = alignPdfDimension(width, ratio)
  const cssHeight = alignPdfDimension(height, ratio)
  // Visible sheets get at least 2 samples per CSS pixel when the budget permits.
  // Neighbours remain inexpensive until they actually enter the viewport.
  const preferred = visible ? Math.max(2, ratio) : 1
  const budget = Math.max(1, Math.floor(pixelBudget))
  const scale = Math.min(preferred, Math.sqrt(budget / (cssWidth * cssHeight)), MAX_CANVAS_DIMENSION / cssWidth, MAX_CANVAS_DIMENSION / cssHeight)
  let canvasWidth = Math.max(1, Math.floor(cssWidth * scale + 1e-7))
  let canvasHeight = Math.max(1, Math.floor(cssHeight * scale + 1e-7))
  if (canvasWidth * canvasHeight > budget) {
    if (canvasWidth >= canvasHeight) canvasWidth = Math.max(1, Math.floor(budget / canvasHeight))
    else canvasHeight = Math.max(1, Math.floor(budget / canvasWidth))
  }
  return { cssWidth, cssHeight, canvasWidth, canvasHeight, scaleX: canvasWidth / cssWidth, scaleY: canvasHeight / cssHeight }
}
