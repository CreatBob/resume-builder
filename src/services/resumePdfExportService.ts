// author: Bob
export type ExportQualityMode = 'compressed' | 'hd'

const A4_WIDTH = 794
const A4_RATIO = 297 / 210

interface PdfLinkRect {
  href: string
  x: number
  y: number
  width: number
  height: number
}

function findEffectiveCanvasHeight(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return canvas.height

  const width = canvas.width
  const sampleStepX = Math.max(1, Math.floor(width / 120))

  const rowHasContent = (y: number): boolean => {
    const row = ctx.getImageData(0, y, width, 1).data
    for (let x = 0; x < width; x += sampleStepX) {
      const idx = x * 4
      const alpha = row[idx + 3] ?? 0
      if (alpha === 0) continue
      const r = row[idx] ?? 255
      const g = row[idx + 1] ?? 255
      const b = row[idx + 2] ?? 255
      if (r < 248 || g < 248 || b < 248) return true
    }
    return false
  }

  let roughY = -1
  for (let y = canvas.height - 1; y >= 0; y -= 4) {
    if (rowHasContent(y)) {
      roughY = y
      break
    }
  }

  if (roughY < 0) return 1

  const startY = Math.min(canvas.height - 1, roughY + 3)
  const endY = Math.max(0, roughY - 3)
  for (let y = startY; y >= endY; y -= 1) {
    if (rowHasContent(y)) return Math.min(canvas.height, y + 4)
  }

  return Math.min(canvas.height, roughY + 4)
}

function collectPdfLinkRects(exportNode: HTMLElement): PdfLinkRect[] {
  const rootRect = exportNode.getBoundingClientRect()
  return Array.from(exportNode.querySelectorAll<HTMLAnchorElement>('a[href]')).flatMap((anchor) => {
    const href = anchor.href || anchor.getAttribute('href')?.trim() || ''
    if (!href) return []

    return Array.from(anchor.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        href,
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
      }))
  })
}

function addPdfLinksForPage(
  pdf: InstanceType<typeof import('jspdf').jsPDF>,
  links: PdfLinkRect[],
  pageOffsetY: number,
  pageSliceHeight: number,
  exportScale: number
) {
  const pxToMm = 210 / A4_WIDTH
  const pageStartY = pageOffsetY / exportScale
  const pageEndY = (pageOffsetY + pageSliceHeight) / exportScale

  links.forEach((link) => {
    const linkStartY = link.y
    const linkEndY = link.y + link.height
    const overlapStartY = Math.max(linkStartY, pageStartY)
    const overlapEndY = Math.min(linkEndY, pageEndY)
    if (overlapEndY <= overlapStartY) return

    pdf.link(link.x * pxToMm, (overlapStartY - pageStartY) * pxToMm, link.width * pxToMm, (overlapEndY - overlapStartY) * pxToMm, {
      url: link.href,
    })
  })
}

export interface ExportResumePdfOptions {
  sourceNode: HTMLElement
  filename: string
  mode: ExportQualityMode
  onProgress?: (percent: number, text: string) => Promise<void> | void
}

async function notifyProgress(
  onProgress: ExportResumePdfOptions['onProgress'],
  percent: number,
  text: string
) {
  if (!onProgress) return
  await onProgress(percent, text)
}

export async function exportResumePdf(options: ExportResumePdfOptions) {
  const { sourceNode, filename, mode, onProgress } = options
  const isHdMode = mode === 'hd'
  const exportHost = document.createElement('div')
  exportHost.style.position = 'fixed'
  exportHost.style.left = '-10000px'
  exportHost.style.top = '0'
  exportHost.style.width = `${A4_WIDTH}px`
  exportHost.style.pointerEvents = 'none'
  exportHost.style.opacity = '0'
  exportHost.style.zIndex = '-1'

  const exportNode = sourceNode.cloneNode(true) as HTMLElement
  exportNode.classList.add('pdf-exporting')
  exportNode.style.width = `${A4_WIDTH}px`
  exportNode.style.minHeight = '0'
  exportNode.style.height = 'auto'
  exportNode.style.margin = '0'
  exportNode.style.overflow = 'hidden'

  exportHost.appendChild(exportNode)
  document.body.appendChild(exportHost)

  try {
    await notifyProgress(onProgress, 8, '准备导出资源...')
    await document.fonts?.ready
    const pdfLinks = collectPdfLinkRects(exportNode)
    await notifyProgress(onProgress, 18, '加载导出引擎...')
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    await notifyProgress(onProgress, 36, '正在渲染简历画布...')
    const exportScale = isHdMode ? Math.min(4, Math.max(3, window.devicePixelRatio || 1)) : 2
    const canvas = await html2canvas(exportNode, {
      scale: exportScale,
      useCORS: true,
      width: A4_WIDTH,
      windowWidth: A4_WIDTH,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    })
    await notifyProgress(onProgress, 68, '正在分页生成 PDF...')

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: !isHdMode,
    })

    const pagePixelHeight = Math.round(canvas.width * A4_RATIO)
    const effectiveHeight = findEffectiveCanvasHeight(canvas)
    const totalPages = Math.max(1, Math.ceil(effectiveHeight / pagePixelHeight))
    let offsetY = 0
    let pageIndex = 0

    while (offsetY < effectiveHeight - 1) {
      const remainingHeight = effectiveHeight - offsetY
      const sliceHeight = Math.min(pagePixelHeight, remainingHeight)
      if (sliceHeight <= 2) break

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight
      const ctx = pageCanvas.getContext('2d')
      if (!ctx) break
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

      const imgData = isHdMode ? pageCanvas.toDataURL('image/png') : pageCanvas.toDataURL('image/jpeg', 0.92)
      const imgWidthMm = 210
      const imgHeightMm = (sliceHeight / canvas.width) * imgWidthMm

      if (pageIndex > 0) pdf.addPage('a4', 'portrait')
      pdf.addImage(imgData, isHdMode ? 'PNG' : 'JPEG', 0, 0, imgWidthMm, imgHeightMm, undefined, isHdMode ? 'NONE' : 'FAST')
      addPdfLinksForPage(pdf, pdfLinks, offsetY, sliceHeight, exportScale)
      const pageProgress = 68 + Math.round((Math.min(pageIndex + 1, totalPages) / totalPages) * 28)
      await notifyProgress(onProgress, pageProgress, `正在写入第 ${Math.min(pageIndex + 1, totalPages)}/${totalPages} 页...`)

      offsetY += sliceHeight
      pageIndex += 1
    }

    await notifyProgress(onProgress, 98, '正在保存文件...')
    pdf.save(filename)
    await notifyProgress(onProgress, 100, '导出完成')
  } finally {
    exportHost.remove()
  }
}
