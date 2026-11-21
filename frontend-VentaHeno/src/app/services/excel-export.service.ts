import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import {
  FacturaReporte,
  ReporteFacturasAnimal,
  ReporteFacturasHeno,
  ReporteVentaCliente,
  ReporteVentaMensual
} from '../models/reporte-venta.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  exportarReporteMes(reporte: ReporteVentaMensual): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const encabezado: any[][] = [
      ['AgroHeno - Reporte de Ventas por Mes'],
      ['Periodo', `${reporte.mes}/${reporte.anio}`],
      ['Total Facturas', reporte.totalFacturas],
      ['Ingresos Totales', reporte.montoTotal],
      []
    ];

    const wb = XLSX.utils.book_new();
    const wsResumen = this.construirHojaFacturas(encabezado, reporte.facturas, 3);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Facturas');

    const wsDetalles = this.construirHojaDetalles(reporte.facturas);
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalle por Producto');

    XLSX.writeFile(wb, `Reporte_Mes_${reporte.anio}_${reporte.mes}_${Date.now()}.xlsx`);
  }

  exportarReporteAnimal(reporte: ReporteFacturasAnimal): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const encabezado: any[][] = [
      ['AgroHeno - Reporte de Ventas por Tipo de Animal'],
      ['Tipo de Animal', reporte.nombreAnimal],
      ['Total Facturas', reporte.totalFacturas],
      ['Ingresos Totales', reporte.montoTotal],
      []
    ];

    const wb = XLSX.utils.book_new();
    const wsResumen = this.construirHojaFacturas(encabezado, reporte.facturas, 3);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Facturas');

    const wsDetalles = this.construirHojaDetalles(reporte.facturas);
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalle por Producto');

    const nombreArchivo = this.sanitizarNombre(reporte.nombreAnimal);
    XLSX.writeFile(wb, `Reporte_Animal_${nombreArchivo}_${Date.now()}.xlsx`);
  }

  exportarReportePaca(reporte: ReporteFacturasHeno, pacaBuscada?: string | null): void {
    if (!reporte || !reporte.facturas || reporte.facturas.length === 0) return;

    const filtro = (pacaBuscada || reporte.nombreHeno || '').toLowerCase();
    const nombreMostrar = (reporte.nombreHeno || '').replace(/_/g, ' ');

    const rows: any[][] = [
      ['AgroHeno - Reporte de Ventas por Tipo de Paca'],
      ['Tipo de Heno', nombreMostrar],
      ['Total Facturas', reporte.totalFacturas],
      ['Ingresos Totales', reporte.montoTotal],
      [],
      ['ID Factura', 'Fecha', 'Cliente', 'Cédula', 'Tipo de Heno', 'Precio Unitario', 'Cantidad', 'Total (Paca)']
    ];

    let totalCantidad = 0;
    let totalSubtotal = 0;

    for (const f of reporte.facturas) {
      const detalle = (f.detalles || []).find(d =>
        (d.tipoHeno || '').toLowerCase().includes(filtro)
      );
      const precio = detalle ? detalle.precioUnitario : 0;
      const cantidad = detalle ? detalle.cantidad : 0;
      const subtotal = detalle ? detalle.subtotal : 0;

      totalCantidad += cantidad;
      totalSubtotal += subtotal;

      rows.push([
        `#${f.idFactura}`,
        f.fechaFactura,
        f.nombreCliente,
        f.cedulaCliente,
        detalle ? detalle.tipoHeno : nombreMostrar,
        detalle ? precio : '-',
        detalle ? cantidad : '-',
        detalle ? subtotal : '-'
      ]);
    }

    const filaTotalesIdx = rows.length;
    rows.push(['', '', '', '', 'TOTALES', '', totalCantidad, totalSubtotal]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    this.aplicarFormatoMonedaCelda(ws, 3, 1); // Ingresos Totales en encabezado
    this.aplicarFormatoMonedaColumnas(ws, [5, 7], 6, filaTotalesIdx);
    this.autoAjustarColumnas(ws, rows);

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

    const encabezado: any[][] = [
      ['AgroHeno - Reporte de Ventas por Cliente'],
      ['Cliente', nombreCliente],
      ['Cédula', cedula]
    ];

    if (reporte.cliente?.telefono) {
      encabezado.push(['Teléfono', reporte.cliente.telefono]);
    }
    if (reporte.cliente?.correo) {
      encabezado.push(['Correo', reporte.cliente.correo]);
    }
    if (reporte.cliente?.direccion) {
      encabezado.push(['Dirección', reporte.cliente.direccion]);
    }

    encabezado.push(['Total Compras', reporte.totalFacturas]);
    encabezado.push(['Total Pacas Compradas', reporte.totalPacas]);
    const filaMontoIdx = encabezado.length;
    encabezado.push(['Total Invertido', reporte.montoTotal]);
    encabezado.push([]);

    const wb = XLSX.utils.book_new();
    const wsResumen = this.construirHojaFacturas(encabezado, reporte.facturas, filaMontoIdx);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Facturas');

    const wsDetalles = this.construirHojaDetalles(reporte.facturas);
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalle por Producto');

    const cedulaArchivo = this.sanitizarNombre(cedula || 'cliente');
    XLSX.writeFile(wb, `Reporte_Cliente_${cedulaArchivo}_${Date.now()}.xlsx`);
  }

  private construirHojaFacturas(
    encabezado: any[][],
    facturas: FacturaReporte[],
    filaIngresoEncabezadoIdx: number
  ): XLSX.WorkSheet {
    const startDataRow = encabezado.length + 1;
    const rows: any[][] = [
      ...encabezado,
      ['ID Factura', 'Fecha', 'Cliente', 'Cédula', 'Detalles de Compra', 'Envío', 'Total Venta']
    ];

    let sumaEnvio = 0;
    let sumaTotal = 0;

    for (const f of facturas) {
      const detallesTexto = (f.detalles || [])
        .map(d => `${d.tipoHeno}: ${d.cantidad} a $${d.precioUnitario.toLocaleString('es-CO')} = $${d.subtotal.toLocaleString('es-CO')}`)
        .join(' | ');

      const envio = Number(f.envio || 0);
      const totalVenta = Number(f.totalVenta || 0);
      sumaEnvio += envio;
      sumaTotal += totalVenta;

      rows.push([
        `#${f.idFactura}`,
        f.fechaFactura,
        f.nombreCliente,
        f.cedulaCliente,
        detallesTexto,
        envio,
        totalVenta
      ]);
    }

    const filaTotalesIdx = rows.length;
    rows.push(['', '', '', '', 'TOTALES', sumaEnvio, sumaTotal]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    this.aplicarFormatoMonedaCelda(ws, filaIngresoEncabezadoIdx, 1);
    this.aplicarFormatoMonedaColumnas(ws, [5, 6], startDataRow, filaTotalesIdx);
    this.autoAjustarColumnas(ws, rows);
    return ws;
  }

  private construirHojaDetalles(facturas: FacturaReporte[]): XLSX.WorkSheet {
    const rows: any[][] = [
      ['ID Factura', 'Fecha', 'Cliente', 'Cédula', 'Tipo de Heno', 'Precio Unitario', 'Cantidad', 'Subtotal']
    ];

    let totalCantidad = 0;
    let totalSubtotal = 0;

    for (const f of facturas) {
      for (const d of (f.detalles || [])) {
        const precio = Number(d.precioUnitario || 0);
        const cantidad = Number(d.cantidad || 0);
        const subtotal = Number(d.subtotal || 0);
        totalCantidad += cantidad;
        totalSubtotal += subtotal;

        rows.push([
          `#${f.idFactura}`,
          f.fechaFactura,
          f.nombreCliente,
          f.cedulaCliente,
          d.tipoHeno,
          precio,
          cantidad,
          subtotal
        ]);
      }
    }

    const filaTotalesIdx = rows.length;
    rows.push(['', '', '', '', 'TOTALES', '', totalCantidad, totalSubtotal]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    this.aplicarFormatoMonedaColumnas(ws, [5, 7], 1, filaTotalesIdx);
    this.autoAjustarColumnas(ws, rows);
    return ws;
  }

  private aplicarFormatoMonedaCelda(ws: XLSX.WorkSheet, row: number, col: number): void {
    const ref = XLSX.utils.encode_cell({ r: row, c: col });
    if (ws[ref] && typeof ws[ref].v === 'number') {
      ws[ref].z = '$#,##0';
    }
  }

  private aplicarFormatoMonedaColumnas(
    ws: XLSX.WorkSheet,
    cols: number[],
    startRow: number,
    endRow: number
  ): void {
    for (let r = startRow; r <= endRow; r++) {
      for (const c of cols) {
        this.aplicarFormatoMonedaCelda(ws, r, c);
      }
    }
  }

  private autoAjustarColumnas(ws: XLSX.WorkSheet, rows: any[][]): void {
    const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
    const colWidths: XLSX.ColInfo[] = [];

    for (let c = 0; c < maxCols; c++) {
      let maxLen = 12;
      for (let r = 0; r < rows.length; r++) {
        const val = rows[r]?.[c];
        if (val !== undefined && val !== null) {
          const str = String(val);
          // Evitar que el título en la fila 0 ensanche demasiado la columna A
          if (r === 0 && c === 0) continue;
          maxLen = Math.max(maxLen, Math.min(str.length + 3, 55));
        }
      }
      colWidths.push({ wch: maxLen });
    }
    ws['!cols'] = colWidths;
  }

  private sanitizarNombre(texto: string): string {
    return (texto || 'reporte')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
