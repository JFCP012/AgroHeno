import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import {
  FacturaReporte,
  ReporteFacturasAnimal,
  ReporteFacturasHeno,
  ReporteVentaCliente,
  ReporteVentaMensual
} from '../models/reporte-venta.model';

interface ResumenItem {
  etiqueta: string;
  valor: string | number;
  esMoneda?: boolean;
  destacado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  // Paleta oficial AgroHeno (HEX sin # para xlsx-js-style)
  private readonly COLOR_MARRON_OSCURO = '351903';
  private readonly COLOR_VERDE_PRINCIPAL = '036C39';
  private readonly COLOR_VERDE_OSCURO = '024D28';
  private readonly COLOR_VERDE_SUAVE = 'E8F5EE';
  private readonly COLOR_VERDE_CEBRA = 'F4F9F6';
  private readonly COLOR_DORADO = 'CCA243';
  private readonly COLOR_DORADO_OSCURO = '8C5A15';
  private readonly COLOR_DORADO_SUAVE = 'FDF3D7';
  private readonly COLOR_CREMA = 'F7F5F0';
  private readonly COLOR_TEXTO = '1E293B';
  private readonly COLOR_TEXTO_SUAVE = '475569';
  private readonly COLOR_BORDE = 'CBD5E1';
  private readonly COLOR_BORDE_TABLA = 'D5E0D9';
  private readonly COLOR_BLANCO = 'FFFFFF';

  private readonly BORDE_FINO = {
    top: { style: 'thin', color: { rgb: this.COLOR_BORDE_TABLA } },
    bottom: { style: 'thin', color: { rgb: this.COLOR_BORDE_TABLA } },
    left: { style: 'thin', color: { rgb: this.COLOR_BORDE_TABLA } },
    right: { style: 'thin', color: { rgb: this.COLOR_BORDE_TABLA } }
  };

  private readonly BORDE_RESUMEN = {
    top: { style: 'thin', color: { rgb: this.COLOR_BORDE } },
    bottom: { style: 'thin', color: { rgb: this.COLOR_BORDE } },
    left: { style: 'thin', color: { rgb: this.COLOR_BORDE } },
    right: { style: 'thin', color: { rgb: this.COLOR_BORDE } }
  };

  exportarReporteMes(reporte: ReporteVentaMensual): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const mesFormateado = `${String(reporte.mes).padStart(2, '0')}/${reporte.anio}`;
    const resumen: ResumenItem[] = [
      { etiqueta: 'Periodo Consultado', valor: mesFormateado },
      { etiqueta: 'Total Facturas', valor: reporte.totalFacturas },
      { etiqueta: 'Ingresos Totales', valor: reporte.montoTotal, esMoneda: true, destacado: true }
    ];

    const wb = XLSX.utils.book_new();
    const wsResumen = this.construirHojaFacturas(
      `AGROHENO  |  REPORTE DE VENTAS MENSUAL (${mesFormateado})`,
      resumen,
      reporte.facturas
    );
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Facturas');

    const wsDetalles = this.construirHojaDetalles(
      `AGROHENO  |  DETALLE POR PRODUCTO (${mesFormateado})`,
      reporte.facturas
    );
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalle por Producto');

    XLSX.writeFile(wb, `Reporte_Mes_${reporte.anio}_${reporte.mes}_${Date.now()}.xlsx`);
  }

  exportarReporteAnimal(reporte: ReporteFacturasAnimal): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const resumen: ResumenItem[] = [
      { etiqueta: 'Tipo de Animal', valor: reporte.nombreAnimal },
      { etiqueta: 'Total Facturas', valor: reporte.totalFacturas },
      { etiqueta: 'Ingresos Totales', valor: reporte.montoTotal, esMoneda: true, destacado: true }
    ];

    const wb = XLSX.utils.book_new();
    const wsResumen = this.construirHojaFacturas(
      `AGROHENO  |  REPORTE DE VENTAS POR ANIMAL (${reporte.nombreAnimal.toUpperCase()})`,
      resumen,
      reporte.facturas
    );
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Facturas');

    const wsDetalles = this.construirHojaDetalles(
      `AGROHENO  |  DETALLE POR PRODUCTO - ${reporte.nombreAnimal.toUpperCase()}`,
      reporte.facturas
    );
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalle por Producto');

    const nombreArchivo = this.sanitizarNombre(reporte.nombreAnimal);
    XLSX.writeFile(wb, `Reporte_Animal_${nombreArchivo}_${Date.now()}.xlsx`);
  }

  exportarReportePaca(reporte: ReporteFacturasHeno, pacaBuscada?: string | null): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const filtro = (pacaBuscada || reporte.nombreHeno || '').toLowerCase();
    const nombreMostrar = (reporte.nombreHeno || '').replace(/_/g, ' ');
    const numCols = 8;

    const ws: XLSX.WorkSheet = {};
    const merges: XLSX.Range[] = [];
    const rowHeights: XLSX.RowInfo[] = [];

    let r = this.escribirEncabezadoCorporativo(
      ws,
      merges,
      rowHeights,
      `AGROHENO  |  REPORTE DE VENTAS POR PACA (${nombreMostrar.toUpperCase()})`,
      numCols
    );

    const resumen: ResumenItem[] = [
      { etiqueta: 'Tipo de Heno (Paca)', valor: nombreMostrar },
      { etiqueta: 'Total Facturas', valor: reporte.totalFacturas },
      { etiqueta: 'Ingresos Totales (Paca)', valor: reporte.montoTotal, esMoneda: true, destacado: true }
    ];
    r = this.escribirBloqueResumen(ws, merges, rowHeights, r, 'RESUMEN DEL REPORTE', resumen);

    const headerRow = r;
    const headers = [
      'ID Factura', 'Fecha', 'Cliente', 'Cédula',
      'Tipo de Heno', 'Precio Unitario', 'Cantidad', 'Total (Paca)'
    ];
    const headerAligns: Array<'center' | 'left' | 'right'> = [
      'center', 'center', 'left', 'center', 'left', 'right', 'center', 'right'
    ];
    this.escribirEncabezadoTabla(ws, rowHeights, headerRow, headers, headerAligns);
    r++;

    const firstDataRow = r;
    let totalCantidad = 0;
    let totalSubtotal = 0;

    reporte.facturas.forEach((f, idx) => {
      const detalle = (f.detalles || []).find(d =>
        (d.tipoHeno || '').toLowerCase().includes(filtro)
      );
      const precio = detalle ? Number(detalle.precioUnitario || 0) : 0;
      const cantidad = detalle ? Number(detalle.cantidad || 0) : 0;
      const subtotal = detalle ? Number(detalle.subtotal || 0) : 0;

      totalCantidad += cantidad;
      totalSubtotal += subtotal;

      const bg = idx % 2 === 0 ? this.COLOR_BLANCO : this.COLOR_VERDE_CEBRA;
      this.setCell(ws, r, 0, `#${f.idFactura}`, this.estiloCeldaDato(bg, 'center', true, this.COLOR_VERDE_PRINCIPAL));
      this.setCell(ws, r, 1, f.fechaFactura, this.estiloCeldaDato(bg, 'center', false, this.COLOR_TEXTO_SUAVE));
      this.setCell(ws, r, 2, f.nombreCliente, this.estiloCeldaDato(bg, 'left', true, this.COLOR_TEXTO));
      this.setCell(ws, r, 3, f.cedulaCliente, this.estiloCeldaDato(bg, 'center', false, this.COLOR_TEXTO_SUAVE));
      this.setCell(ws, r, 4, detalle ? detalle.tipoHeno : nombreMostrar, this.estiloCeldaDato(bg, 'left', false, this.COLOR_TEXTO));
      this.setCell(ws, r, 5, detalle ? precio : '-', this.estiloCeldaDato(bg, 'right', false, this.COLOR_TEXTO), detalle ? '$#,##0' : undefined);
      this.setCell(ws, r, 6, detalle ? cantidad : '-', this.estiloCeldaDato(bg, 'center', true, this.COLOR_TEXTO), detalle ? '#,##0' : undefined);
      this.setCell(ws, r, 7, detalle ? subtotal : '-', this.estiloCeldaDato(bg, 'right', true, this.COLOR_VERDE_PRINCIPAL), detalle ? '$#,##0' : undefined);

      rowHeights[r] = { hpt: 22 };
      r++;
    });

    const lastDataRow = r - 1;
    const totalsRow = r;
    this.escribirFilaTotales(ws, merges, rowHeights, totalsRow, numCols, 0, 5, 'TOTALES DEL REPORTE');
    this.setFormulaCell(ws, totalsRow, 6, totalCantidad, `SUM(G${firstDataRow + 1}:G${lastDataRow + 1})`, this.estiloTotal('center'), '#,##0');
    this.setFormulaCell(ws, totalsRow, 7, totalSubtotal, `SUM(H${firstDataRow + 1}:H${lastDataRow + 1})`, this.estiloTotal('right'), '$#,##0');
    r++;

    r = this.escribirPieDocumento(ws, merges, rowHeights, r + 1, numCols);

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: numCols - 1 } });
    ws['!merges'] = merges;
    ws['!rows'] = rowHeights;
    ws['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 16 },
      { wch: 28 }, { wch: 17 }, { wch: 13 }, { wch: 18 }
    ];
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: lastDataRow, c: numCols - 1 } })
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas por Paca');

    const nombreArchivo = this.sanitizarNombre(reporte.nombreHeno);
    XLSX.writeFile(wb, `Reporte_Paca_${nombreArchivo}_${Date.now()}.xlsx`);
  }

  exportarReporteCliente(reporte: ReporteVentaCliente, cedulaInput?: string): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const nombreCliente = reporte.cliente
      ? reporte.cliente.nombre
      : reporte.facturas[0].nombreCliente;
    const cedula = reporte.cliente
      ? reporte.cliente.cedula
      : (reporte.facturas[0].cedulaCliente || cedulaInput || '');

    const resumen: ResumenItem[] = [
      { etiqueta: 'Cliente', valor: nombreCliente },
      { etiqueta: 'Cédula / NIT', valor: cedula }
    ];
    if (reporte.cliente?.telefono) {
      resumen.push({ etiqueta: 'Teléfono', valor: reporte.cliente.telefono });
    }
    if (reporte.cliente?.correo) {
      resumen.push({ etiqueta: 'Correo Electrónico', valor: reporte.cliente.correo });
    }
    if (reporte.cliente?.direccion) {
      resumen.push({ etiqueta: 'Dirección', valor: reporte.cliente.direccion });
    }
    resumen.push(
      { etiqueta: 'Total Compras', valor: reporte.totalFacturas },
      { etiqueta: 'Total Pacas Compradas', valor: reporte.totalPacas },
      { etiqueta: 'Total Invertido', valor: reporte.montoTotal, esMoneda: true, destacado: true }
    );

    const wb = XLSX.utils.book_new();
    const wsResumen = this.construirHojaFacturas(
      `AGROHENO  |  REPORTE DE VENTAS POR CLIENTE (${nombreCliente.toUpperCase()})`,
      resumen,
      reporte.facturas
    );
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Facturas');

    const wsDetalles = this.construirHojaDetalles(
      `AGROHENO  |  DETALLE DE COMPRAS - ${nombreCliente.toUpperCase()}`,
      reporte.facturas
    );
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalle por Producto');

    const cedulaArchivo = this.sanitizarNombre(cedula || 'cliente');
    XLSX.writeFile(wb, `Reporte_Cliente_${cedulaArchivo}_${Date.now()}.xlsx`);
  }

  // ==================== CONSTRUCTORES DE HOJAS ESTILIZADAS ====================

  private construirHojaFacturas(
    titulo: string,
    resumen: ResumenItem[],
    facturas: FacturaReporte[]
  ): XLSX.WorkSheet {
    const numCols = 7;
    const ws: XLSX.WorkSheet = {};
    const merges: XLSX.Range[] = [];
    const rowHeights: XLSX.RowInfo[] = [];

    let r = this.escribirEncabezadoCorporativo(ws, merges, rowHeights, titulo, numCols);
    r = this.escribirBloqueResumen(ws, merges, rowHeights, r, 'RESUMEN DEL REPORTE', resumen);

    const headerRow = r;
    const headers = ['ID Factura', 'Fecha', 'Cliente', 'Cédula', 'Detalles de Compra', 'Envío', 'Total Venta'];
    const headerAligns: Array<'center' | 'left' | 'right'> = [
      'center', 'center', 'left', 'center', 'left', 'right', 'right'
    ];
    this.escribirEncabezadoTabla(ws, rowHeights, headerRow, headers, headerAligns);
    r++;

    const firstDataRow = r;
    let sumaEnvio = 0;
    let sumaTotal = 0;

    facturas.forEach((f, idx) => {
      const lineas = (f.detalles || []).map(
        d => `• ${d.tipoHeno}: ${d.cantidad} uds × $${d.precioUnitario.toLocaleString('es-CO')} = $${d.subtotal.toLocaleString('es-CO')}`
      );
      const detallesTexto = lineas.join('\n');
      const envio = Number(f.envio || 0);
      const totalVenta = Number(f.totalVenta || 0);

      sumaEnvio += envio;
      sumaTotal += totalVenta;

      const bg = idx % 2 === 0 ? this.COLOR_BLANCO : this.COLOR_VERDE_CEBRA;
      this.setCell(ws, r, 0, `#${f.idFactura}`, this.estiloCeldaDato(bg, 'center', true, this.COLOR_VERDE_PRINCIPAL));
      this.setCell(ws, r, 1, f.fechaFactura, this.estiloCeldaDato(bg, 'center', false, this.COLOR_TEXTO_SUAVE));
      this.setCell(ws, r, 2, f.nombreCliente, this.estiloCeldaDato(bg, 'left', true, this.COLOR_TEXTO));
      this.setCell(ws, r, 3, f.cedulaCliente, this.estiloCeldaDato(bg, 'center', false, this.COLOR_TEXTO_SUAVE));
      this.setCell(ws, r, 4, detallesTexto, this.estiloCeldaDato(bg, 'left', false, this.COLOR_TEXTO, true));
      this.setCell(ws, r, 5, envio, this.estiloCeldaDato(bg, 'right', false, this.COLOR_TEXTO), '$#,##0');
      this.setCell(ws, r, 6, totalVenta, this.estiloCeldaDato(bg, 'right', true, this.COLOR_VERDE_PRINCIPAL), '$#,##0');

      rowHeights[r] = { hpt: Math.max(22, lineas.length * 16 + 8) };
      r++;
    });

    const lastDataRow = r - 1;
    const totalsRow = r;
    this.escribirFilaTotales(ws, merges, rowHeights, totalsRow, numCols, 0, 4, 'TOTALES GENERALES');
    this.setFormulaCell(ws, totalsRow, 5, sumaEnvio, `SUM(F${firstDataRow + 1}:F${lastDataRow + 1})`, this.estiloTotal('right'), '$#,##0');
    this.setFormulaCell(ws, totalsRow, 6, sumaTotal, `SUM(G${firstDataRow + 1}:G${lastDataRow + 1})`, this.estiloTotal('right'), '$#,##0');
    r++;

    r = this.escribirPieDocumento(ws, merges, rowHeights, r + 1, numCols);

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: numCols - 1 } });
    ws['!merges'] = merges;
    ws['!rows'] = rowHeights;
    ws['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 16 },
      { wch: 52 }, { wch: 16 }, { wch: 18 }
    ];
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: lastDataRow, c: numCols - 1 } })
    };

    return ws;
  }

  private construirHojaDetalles(titulo: string, facturas: FacturaReporte[]): XLSX.WorkSheet {
    const numCols = 8;
    const ws: XLSX.WorkSheet = {};
    const merges: XLSX.Range[] = [];
    const rowHeights: XLSX.RowInfo[] = [];

    let r = this.escribirEncabezadoCorporativo(ws, merges, rowHeights, titulo, numCols);

    const headerRow = r;
    const headers = [
      'ID Factura', 'Fecha', 'Cliente', 'Cédula',
      'Tipo de Heno', 'Precio Unitario', 'Cantidad', 'Subtotal'
    ];
    const headerAligns: Array<'center' | 'left' | 'right'> = [
      'center', 'center', 'left', 'center', 'left', 'right', 'center', 'right'
    ];
    this.escribirEncabezadoTabla(ws, rowHeights, headerRow, headers, headerAligns);
    r++;

    const firstDataRow = r;
    let totalCantidad = 0;
    let totalSubtotal = 0;
    let rowIdx = 0;

    for (const f of facturas) {
      for (const d of (f.detalles || [])) {
        const precio = Number(d.precioUnitario || 0);
        const cantidad = Number(d.cantidad || 0);
        const subtotal = Number(d.subtotal || 0);
        totalCantidad += cantidad;
        totalSubtotal += subtotal;

        const bg = rowIdx % 2 === 0 ? this.COLOR_BLANCO : this.COLOR_VERDE_CEBRA;
        this.setCell(ws, r, 0, `#${f.idFactura}`, this.estiloCeldaDato(bg, 'center', true, this.COLOR_VERDE_PRINCIPAL));
        this.setCell(ws, r, 1, f.fechaFactura, this.estiloCeldaDato(bg, 'center', false, this.COLOR_TEXTO_SUAVE));
        this.setCell(ws, r, 2, f.nombreCliente, this.estiloCeldaDato(bg, 'left', true, this.COLOR_TEXTO));
        this.setCell(ws, r, 3, f.cedulaCliente, this.estiloCeldaDato(bg, 'center', false, this.COLOR_TEXTO_SUAVE));
        this.setCell(ws, r, 4, d.tipoHeno, this.estiloCeldaDato(bg, 'left', false, this.COLOR_TEXTO));
        this.setCell(ws, r, 5, precio, this.estiloCeldaDato(bg, 'right', false, this.COLOR_TEXTO), '$#,##0');
        this.setCell(ws, r, 6, cantidad, this.estiloCeldaDato(bg, 'center', true, this.COLOR_TEXTO), '#,##0');
        this.setCell(ws, r, 7, subtotal, this.estiloCeldaDato(bg, 'right', true, this.COLOR_VERDE_PRINCIPAL), '$#,##0');

        rowHeights[r] = { hpt: 22 };
        r++;
        rowIdx++;
      }
    }

    const lastDataRow = Math.max(firstDataRow, r - 1);
    const totalsRow = r;
    this.escribirFilaTotales(ws, merges, rowHeights, totalsRow, numCols, 0, 5, 'TOTALES POR PRODUCTO');
    if (rowIdx > 0) {
      this.setFormulaCell(ws, totalsRow, 6, totalCantidad, `SUM(G${firstDataRow + 1}:G${lastDataRow + 1})`, this.estiloTotal('center'), '#,##0');
      this.setFormulaCell(ws, totalsRow, 7, totalSubtotal, `SUM(H${firstDataRow + 1}:H${lastDataRow + 1})`, this.estiloTotal('right'), '$#,##0');
    } else {
      this.setCell(ws, totalsRow, 6, 0, this.estiloTotal('center'), '#,##0');
      this.setCell(ws, totalsRow, 7, 0, this.estiloTotal('right'), '$#,##0');
    }
    r++;

    r = this.escribirPieDocumento(ws, merges, rowHeights, r + 1, numCols);

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: numCols - 1 } });
    ws['!merges'] = merges;
    ws['!rows'] = rowHeights;
    ws['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 16 },
      { wch: 28 }, { wch: 17 }, { wch: 13 }, { wch: 18 }
    ];
    if (rowIdx > 0) {
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: lastDataRow, c: numCols - 1 } })
      };
    }

    return ws;
  }

  // ==================== BLOQUES VISUALES REUTILIZABLES ====================

  private escribirEncabezadoCorporativo(
    ws: XLSX.WorkSheet,
    merges: XLSX.Range[],
    rowHeights: XLSX.RowInfo[],
    titulo: string,
    numCols: number
  ): number {
    const fechaGen = new Date().toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Fila 0: Banner principal marrón corporativo con borde inferior dorado grueso
    const estiloBanner = {
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: this.COLOR_BLANCO } },
      fill: { patternType: 'solid', fgColor: { rgb: this.COLOR_MARRON_OSCURO } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: {
        bottom: { style: 'thick', color: { rgb: this.COLOR_DORADO } }
      }
    };
    this.setCell(ws, 0, 0, titulo, estiloBanner);
    this.estilizarRangoCombinado(ws, 0, 0, 0, numCols - 1, estiloBanner);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });
    rowHeights[0] = { hpt: 34 };

    // Fila 1: Franja de metadatos crema
    const estiloSub = {
      font: { name: 'Calibri', sz: 9.5, italic: true, color: { rgb: this.COLOR_DORADO_OSCURO } },
      fill: { patternType: 'solid', fgColor: { rgb: this.COLOR_CREMA } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: this.COLOR_BORDE } }
      }
    };
    this.setCell(
      ws, 1, 0,
      `Sistema de Gestión y Facturación AgroHeno  •  Generado el ${fechaGen}`,
      estiloSub
    );
    this.estilizarRangoCombinado(ws, 1, 0, 1, numCols - 1, estiloSub);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } });
    rowHeights[1] = { hpt: 20 };

    // Fila 2: Separador limpio
    rowHeights[2] = { hpt: 10 };
    return 3;
  }

  private escribirBloqueResumen(
    ws: XLSX.WorkSheet,
    merges: XLSX.Range[],
    rowHeights: XLSX.RowInfo[],
    startRow: number,
    tituloSeccion: string,
    items: ResumenItem[]
  ): number {
    let r = startRow;

    // Encabezado del recuadro de resumen (Columnas A-D)
    const estiloTituloResumen = {
      font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: this.COLOR_VERDE_PRINCIPAL } },
      fill: { patternType: 'solid', fgColor: { rgb: this.COLOR_VERDE_SUAVE } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: {
        top: { style: 'medium', color: { rgb: this.COLOR_VERDE_PRINCIPAL } },
        bottom: { style: 'thin', color: { rgb: this.COLOR_VERDE_PRINCIPAL } },
        left: { style: 'thin', color: { rgb: this.COLOR_BORDE } },
        right: { style: 'thin', color: { rgb: this.COLOR_BORDE } }
      }
    };
    this.setCell(ws, r, 0, tituloSeccion, estiloTituloResumen);
    this.estilizarRangoCombinado(ws, r, 0, r, 3, estiloTituloResumen);
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    rowHeights[r] = { hpt: 23 };
    r++;

    for (const item of items) {
      const estiloLabel = {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: this.COLOR_MARRON_OSCURO } },
        fill: { patternType: 'solid', fgColor: { rgb: this.COLOR_CREMA } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        border: this.BORDE_RESUMEN
      };
      const esNumero = typeof item.valor === 'number';
      const estiloValor = {
        font: {
          name: 'Calibri',
          sz: item.destacado ? 11.5 : 10.5,
          bold: Boolean(item.destacado || esNumero),
          color: { rgb: item.destacado ? this.COLOR_VERDE_PRINCIPAL : this.COLOR_TEXTO }
        },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: item.destacado ? this.COLOR_VERDE_SUAVE : this.COLOR_BLANCO }
        },
        alignment: { horizontal: esNumero ? 'right' : 'left', vertical: 'center', indent: esNumero ? 0 : 1 },
        border: this.BORDE_RESUMEN
      };

      // Etiqueta en A:B combinadas, Valor en C:D combinadas
      this.setCell(ws, r, 0, item.etiqueta, estiloLabel);
      this.estilizarRangoCombinado(ws, r, 0, r, 1, estiloLabel);
      merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });

      const numFmt = item.esMoneda ? '$#,##0' : (esNumero ? '#,##0' : undefined);
      this.setCell(ws, r, 2, item.valor, estiloValor, numFmt);
      this.estilizarRangoCombinado(ws, r, 2, r, 3, estiloValor);
      merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });

      rowHeights[r] = { hpt: 21 };
      r++;
    }

    // Fila separadora antes de la tabla principal
    rowHeights[r] = { hpt: 12 };
    return r + 1;
  }

  private escribirEncabezadoTabla(
    ws: XLSX.WorkSheet,
    rowHeights: XLSX.RowInfo[],
    row: number,
    headers: string[],
    aligns: Array<'center' | 'left' | 'right'>
  ): void {
    headers.forEach((h, c) => {
      const style = {
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: this.COLOR_BLANCO } },
        fill: { patternType: 'solid', fgColor: { rgb: this.COLOR_VERDE_PRINCIPAL } },
        alignment: { horizontal: aligns[c] || 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: this.COLOR_VERDE_OSCURO } },
          bottom: { style: 'medium', color: { rgb: this.COLOR_DORADO } },
          left: { style: 'thin', color: { rgb: this.COLOR_VERDE_OSCURO } },
          right: { style: 'thin', color: { rgb: this.COLOR_VERDE_OSCURO } }
        }
      };
      this.setCell(ws, row, c, h, style);
    });
    rowHeights[row] = { hpt: 26 };
  }

  private escribirFilaTotales(
    ws: XLSX.WorkSheet,
    merges: XLSX.Range[],
    rowHeights: XLSX.RowInfo[],
    row: number,
    numCols: number,
    labelStartCol: number,
    labelEndCol: number,
    texto: string
  ): void {
    const estiloLabel = this.estiloTotal('right');
    this.setCell(ws, row, labelStartCol, texto, estiloLabel);
    this.estilizarRangoCombinado(ws, row, labelStartCol, row, labelEndCol, estiloLabel);
    if (labelEndCol > labelStartCol) {
      merges.push({ s: { r: row, c: labelStartCol }, e: { r: row, c: labelEndCol } });
    }
    for (let c = labelEndCol + 1; c < numCols; c++) {
      this.setCell(ws, row, c, '', this.estiloTotal('right'));
    }
    rowHeights[row] = { hpt: 26 };
  }

  private escribirPieDocumento(
    ws: XLSX.WorkSheet,
    merges: XLSX.Range[],
    rowHeights: XLSX.RowInfo[],
    row: number,
    numCols: number
  ): number {
    const estiloPie = {
      font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: this.COLOR_TEXTO_SUAVE } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    this.setCell(
      ws, row, 0,
      'AgroHeno - Fabricantes de Heno  •  Documento generado automáticamente desde el Panel Administrativo',
      estiloPie
    );
    this.estilizarRangoCombinado(ws, row, 0, row, numCols - 1, estiloPie);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: numCols - 1 } });
    rowHeights[row] = { hpt: 18 };
    return row + 1;
  }

  // ==================== HELPERS DE CELDAS Y ESTILOS ====================

  private estiloCeldaDato(
    bgHex: string,
    horizontal: 'left' | 'center' | 'right',
    bold: boolean,
    colorHex: string,
    wrapText = false
  ): any {
    return {
      font: { name: 'Calibri', sz: 10, bold, color: { rgb: colorHex } },
      fill: { patternType: 'solid', fgColor: { rgb: bgHex } },
      alignment: { horizontal, vertical: 'center', wrapText },
      border: this.BORDE_FINO
    };
  }

  private estiloTotal(horizontal: 'left' | 'center' | 'right'): any {
    return {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: this.COLOR_MARRON_OSCURO } },
      fill: { patternType: 'solid', fgColor: { rgb: this.COLOR_DORADO_SUAVE } },
      alignment: { horizontal, vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: this.COLOR_DORADO } },
        bottom: { style: 'double', color: { rgb: this.COLOR_VERDE_PRINCIPAL } },
        left: { style: 'thin', color: { rgb: this.COLOR_DORADO } },
        right: { style: 'thin', color: { rgb: this.COLOR_DORADO } }
      }
    };
  }

  private setCell(
    ws: XLSX.WorkSheet,
    r: number,
    c: number,
    value: string | number,
    style: any,
    numFmt?: string
  ): void {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell: any = {
      v: value,
      t: typeof value === 'number' ? 'n' : 's',
      s: numFmt ? { ...style, numFmt } : style
    };
    if (numFmt) {
      cell.z = numFmt;
    }
    ws[ref] = cell;
  }

  private setFormulaCell(
    ws: XLSX.WorkSheet,
    r: number,
    c: number,
    cachedValue: number,
    formula: string,
    style: any,
    numFmt: string
  ): void {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = {
      v: cachedValue,
      f: formula,
      t: 'n',
      z: numFmt,
      s: { ...style, numFmt }
    };
  }

  private estilizarRangoCombinado(
    ws: XLSX.WorkSheet,
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    style: any
  ): void {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) {
          ws[ref] = { v: '', t: 's', s: style };
        } else {
          ws[ref].s = ws[ref].z ? { ...style, numFmt: ws[ref].z } : style;
        }
      }
    }
  }

  private sanitizarNombre(texto: string): string {
    return (texto || 'reporte')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
