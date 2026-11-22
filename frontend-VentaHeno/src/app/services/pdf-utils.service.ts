import { Injectable } from '@angular/core';
import type jsPDF from 'jspdf';

export interface LogoData {
  base64: string;
  aspectRatio: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfUtilsService {
  private logoCache: LogoData | null = null;
  private logoPromise: Promise<LogoData> | null = null;

  obtenerLogo(): Promise<LogoData> {
    if (this.logoCache) {
      return Promise.resolve(this.logoCache);
    }
    if (this.logoPromise) {
      return this.logoPromise;
    }

    this.logoPromise = new Promise<LogoData>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          this.logoCache = {
            base64: canvas.toDataURL('image/png'),
            aspectRatio: img.height > 0 ? img.width / img.height : 1.0
          };
          resolve(this.logoCache);
        } else {
          resolve({ base64: '', aspectRatio: 1.0 });
        }
      };
      img.onerror = () => resolve({ base64: '', aspectRatio: 1.0 });
      img.src = '/assets/Imagenes/Logo2.png';
    });

    return this.logoPromise;
  }

  dibujarEncabezado(doc: jsPDF, logo: LogoData, height = 20, lineY = 35): void {
    doc.setFont('helvetica');
    if (logo.base64) {
      const width = height * logo.aspectRatio;
      doc.addImage(logo.base64, 'PNG', 14, 10, width, height);
      doc.setFontSize(22);
      doc.setTextColor(56, 161, 105);
      doc.text('AgroHeno', 14 + width + 5, 24);
    } else {
      doc.setFontSize(22);
      doc.setTextColor(56, 161, 105);
      doc.text('AgroHeno', 14, 24);
    }

    doc.setDrawColor(56, 161, 105);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, 196, lineY);
  }

  dibujarPieDePagina(doc: jsPDF, texto = 'Fabricantes de heno'): void {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      const textWidth = (doc.getStringUnitWidth(texto) * doc.getFontSize()) / doc.internal.scaleFactor;
      const x = (pageWidth - textWidth) / 2;
      doc.text(texto, x, pageHeight - 10);
    }
  }
}
