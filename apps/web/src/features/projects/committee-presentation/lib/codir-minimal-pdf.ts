const PDF_SLIDE_W = 297;
const PDF_SLIDE_H = 210;
const MM_TO_PT = 2.834645669;

export type CodirPdfTextOptions = {
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
};

export type PdfRgb = [number, number, number];

export interface CodirPdfDocument {
  setFillColor(r: number, g: number, b: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setLineWidth(width: number): void;
  setFont(family: 'helvetica', style: 'normal' | 'bold'): void;
  setFontSize(size: number): void;
  text(value: string | string[], x: number, y: number, options?: CodirPdfTextOptions): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  rect(x: number, y: number, w: number, h: number, mode?: 'S' | 'F' | 'FD'): void;
  roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    _rx: number,
    _ry: number,
    mode?: 'S' | 'F' | 'FD',
  ): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  circle(x: number, y: number, r: number, mode?: 'S' | 'F' | 'FD'): void;
  addPage(): void;
  save(filename: string): void;
}

type PageState = {
  fill: PdfRgb;
  text: PdfRgb;
  draw: PdfRgb;
  fontSize: number;
  fontBold: boolean;
};

type DrawCommand =
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      fill: boolean;
      stroke: boolean;
      fillColor: PdfRgb;
      strokeColor: PdfRgb;
    }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: PdfRgb; width: number }
  | { kind: 'circle'; x: number; y: number; r: number; fillColor: PdfRgb }
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      bold: boolean;
      color: PdfRgb;
      align: 'left' | 'center' | 'right';
    };

function rgb01(color: PdfRgb): string {
  return `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)}`;
}

function pdfEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\u0020-\u00FF]/g, '?');
}

function estimateTextWidthMm(text: string, fontSize: number, bold: boolean): number {
  const factor = bold ? 0.55 : 0.5;
  return Math.max(1, text.length * fontSize * factor * 0.352778);
}

function wrapText(text: string, maxWidth: number, fontSize: number, bold: boolean): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = words[0] ?? '';

  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]!;
    const candidate = `${current} ${word}`;
    if (estimateTextWidthMm(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildPdfBytes(pages: DrawCommand[][]): Uint8Array {
  const pageWidthPt = PDF_SLIDE_W * MM_TO_PT;
  const pageHeightPt = PDF_SLIDE_H * MM_TO_PT;
  const pageCount = pages.length;
  const fontRegularId = 3 + pageCount * 2;
  const fontBoldId = fontRegularId + 1;
  const objectParts: string[] = [];
  const pageObjectIds: number[] = [];

  pages.forEach((commands, pageIndex) => {
    const pageId = 3 + pageIndex * 2;
    const contentId = pageId + 1;
    pageObjectIds.push(pageId);

    const streamParts: string[] = [];
    for (const cmd of commands) {
      if (cmd.kind === 'rect') {
        const x = cmd.x * MM_TO_PT;
        const y = (PDF_SLIDE_H - cmd.y - cmd.h) * MM_TO_PT;
        const w = cmd.w * MM_TO_PT;
        const h = cmd.h * MM_TO_PT;
        if (cmd.fill) {
          streamParts.push(`${rgb01(cmd.fillColor)} rg`);
          streamParts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
        }
        if (cmd.stroke) {
          streamParts.push(`${rgb01(cmd.strokeColor)} RG`);
          streamParts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
        }
      } else if (cmd.kind === 'line') {
        const x1 = cmd.x1 * MM_TO_PT;
        const y1 = (PDF_SLIDE_H - cmd.y1) * MM_TO_PT;
        const x2 = cmd.x2 * MM_TO_PT;
        const y2 = (PDF_SLIDE_H - cmd.y2) * MM_TO_PT;
        streamParts.push(`${cmd.width.toFixed(2)} w`);
        streamParts.push(`${rgb01(cmd.color)} RG`);
        streamParts.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
      } else if (cmd.kind === 'circle') {
        const cx = cmd.x * MM_TO_PT;
        const cy = (PDF_SLIDE_H - cmd.y) * MM_TO_PT;
        const r = cmd.r * MM_TO_PT;
        streamParts.push(`${rgb01(cmd.fillColor)} rg`);
        streamParts.push(`${(cx - r).toFixed(2)} ${(cy - r).toFixed(2)} ${(r * 2).toFixed(2)} ${(r * 2).toFixed(2)} re f`);
      } else if (cmd.kind === 'text') {
        const fontRef = cmd.bold ? `F${fontBoldId}` : `F${fontRegularId}`;
        const xPt = cmd.x * MM_TO_PT;
        const yPt = (PDF_SLIDE_H - cmd.y) * MM_TO_PT;
        let drawX = xPt;
        const width = estimateTextWidthMm(cmd.text, cmd.size, cmd.bold) * MM_TO_PT;
        if (cmd.align === 'right') drawX = xPt - width;
        if (cmd.align === 'center') drawX = xPt - width / 2;
        streamParts.push(`${rgb01(cmd.color)} rg`);
        streamParts.push('BT');
        streamParts.push(`/${fontRef} ${cmd.size.toFixed(2)} Tf`);
        streamParts.push(`${drawX.toFixed(2)} ${yPt.toFixed(2)} Td`);
        streamParts.push(`(${pdfEscape(cmd.text)}) Tj`);
        streamParts.push('ET');
      }
    }

    const stream = streamParts.join('\n');
    objectParts.push(
      `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`,
    );
    objectParts.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Resources << /Font << /F${fontRegularId} ${fontRegularId} 0 R /F${fontBoldId} ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`,
    );
  });

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  let body =
    `%PDF-1.4\n` +
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n` +
    objectParts.join('\n') +
    `\n${fontRegularId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n` +
    `${fontBoldId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  const xrefStart = body.length;
  const objectCount = fontBoldId + 1;
  const offsets: number[] = [0];
  for (let id = 1; id < objectCount; id += 1) {
    offsets.push(body.indexOf(`${id} 0 obj`));
  }

  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let id = 1; id < objectCount; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(body + xref);
}

export class CodirMinimalPdf implements CodirPdfDocument {
  private pages: DrawCommand[][] = [[]];
  private state: PageState = {
    fill: [0, 0, 0],
    text: [0, 0, 0],
    draw: [0, 0, 0],
    fontSize: 10,
    fontBold: false,
  };

  private lineWidth = 0.2;

  setFillColor(r: number, g: number, b: number) {
    this.state.fill = [r, g, b];
  }

  setTextColor(r: number, g: number, b: number) {
    this.state.text = [r, g, b];
  }

  setDrawColor(r: number, g: number, b: number) {
    this.state.draw = [r, g, b];
  }

  setLineWidth(width: number) {
    this.lineWidth = width;
  }

  setFont(_family: 'helvetica', style: 'normal' | 'bold') {
    this.state.fontBold = style === 'bold';
  }

  setFontSize(size: number) {
    this.state.fontSize = size;
  }

  splitTextToSize(text: string, maxWidth: number): string[] {
    return wrapText(text, maxWidth, this.state.fontSize, this.state.fontBold);
  }

  text(value: string | string[], x: number, y: number, options?: CodirPdfTextOptions) {
    const align = options?.align ?? 'left';
    const maxWidth = options?.maxWidth;
    const lines = Array.isArray(value) ? value : [value];

    lines.forEach((line, lineIndex) => {
      const chunks =
        maxWidth != null
          ? wrapText(line, maxWidth, this.state.fontSize, this.state.fontBold)
          : [line];
      chunks.forEach((chunk, chunkIndex) => {
        this.currentPage().push({
          kind: 'text',
          x,
          y: y + (lineIndex + chunkIndex) * (this.state.fontSize * 0.45),
          text: chunk,
          size: this.state.fontSize,
          bold: this.state.fontBold,
          color: [...this.state.text],
          align,
        });
      });
    });
  }

  rect(x: number, y: number, w: number, h: number, mode: 'S' | 'F' | 'FD' = 'S') {
    this.currentPage().push({
      kind: 'rect',
      x,
      y,
      w,
      h,
      fill: mode === 'F' || mode === 'FD',
      stroke: mode === 'S' || mode === 'FD',
      fillColor: [...this.state.fill],
      strokeColor: [...this.state.draw],
    });
  }

  roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    _rx: number,
    _ry: number,
    mode: 'S' | 'F' | 'FD' = 'S',
  ) {
    this.rect(x, y, w, h, mode);
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.currentPage().push({
      kind: 'line',
      x1,
      y1,
      x2,
      y2,
      color: [...this.state.draw],
      width: this.lineWidth,
    });
  }

  circle(x: number, y: number, r: number, mode: 'S' | 'F' | 'FD' = 'S') {
    if (mode === 'S') return;
    this.currentPage().push({
      kind: 'circle',
      x,
      y,
      r,
      fillColor: [...this.state.fill],
    });
  }

  addPage() {
    this.pages.push([]);
  }

  save(filename: string) {
    const bytes = buildPdfBytes(this.pages);
    downloadBlob(new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }), filename);
  }

  private currentPage() {
    return this.pages[this.pages.length - 1]!;
  }
}

export function createCodirPdfDocument(): CodirPdfDocument {
  return new CodirMinimalPdf();
}
