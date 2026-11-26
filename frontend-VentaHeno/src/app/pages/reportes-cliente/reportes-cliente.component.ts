import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../services/reportes.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { PdfUtilsService, LogoData } from '../../services/pdf-utils.service';
import { ReporteVentaCliente } from '../../models/reporte-venta.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reportes-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-cliente.component.html',
  styleUrls: ['./reportes-cliente.component.css']
})
export class ReportesClienteComponent implements OnInit {
  private router = inject(Router);
  private reportesService = inject(ReportesService);
  private excelExportService = inject(ExcelExportService);
  private pdfUtils = inject(PdfUtilsService);
  private cdr = inject(ChangeDetectorRef);

  cedulaInput: string = '';
  reporteCliente: ReporteVentaCliente | null = null;
  cargandoReporte: boolean = false;
  errorReporte: string | null = null;

  private logoData: LogoData = { base64: '', aspectRatio: 1.0 };

  ngOnInit() {
    this.pdfUtils.obtenerLogo().then(logo => { this.logoData = logo; });
  }

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 5;

  volverAdmin() {
    this.router.navigate(['/reportes']);
  }

  get facturasPaginadas() {
    if (!this.reporteCliente || !this.reporteCliente.facturas) return [];
    const indiceInicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const indiceFin = indiceInicio + this.itemsPorPagina;
    return this.reporteCliente.facturas.slice(indiceInicio, indiceFin);
  }

  get paginas() {
    if (!this.reporteCliente || !this.reporteCliente.facturas) return [];
    const totalPaginas = Math.ceil(this.reporteCliente.facturas.length / this.itemsPorPagina);
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  cambiarPagina(pagina: number) {
    this.paginaActual = pagina;
    this.cdr.detectChanges();
  }

  validarCedulaInput() {
    if (this.cedulaInput && !/^[0-9]*$/.test(this.cedulaInput)) {
      this.errorReporte = 'Solo se permiten números en la cédula.';
      this.cedulaInput = this.cedulaInput.replace(/[^0-9]/g, '');
    } else {
      this.errorReporte = null;
    }
  }

  generarReporteCliente() {
    const cedula = this.cedulaInput?.trim();
    if (!cedula) {
      this.errorReporte = 'Por favor, ingresa una cédula.';
      this.cdr.detectChanges();
      return;
    }

    if (!/^[0-9]+$/.test(cedula)) {
      this.errorReporte = 'La cédula solo debe contener números.';
      this.cdr.detectChanges();
      return;
    }

    this.cargandoReporte = true;
    this.errorReporte = null;
    this.reporteCliente = null;
    this.paginaActual = 1;
    this.cdr.detectChanges();

    this.reportesService.obtenerReportePorCliente(cedula).subscribe({
      next: (reporte) => {
        this.reporteCliente = reporte;
        this.cargandoReporte = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al generar el reporte:', err);
        if (err.status === 404) {
          this.errorReporte = 'No se encontró la cédula ingresada en la base de datos.';
        } else {
          this.errorReporte = 'No se encontró información o compras para la cédula ingresada. Verifica que esté bien escrita.';
        }
        this.cargandoReporte = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarPDF() {
    if (!this.reporteCliente || !this.reporteCliente.facturas || this.reporteCliente.facturas.length === 0) return;

    try {
      const doc = new jsPDF();
      this.pdfUtils.dibujarEncabezado(doc, this.logoData);

      // Título
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(`Reporte de Ventas por Cliente: ${this.reporteCliente.cliente ? this.reporteCliente.cliente.nombre : this.reporteCliente.facturas[0].nombreCliente}`, 14, 45);

      // Info general
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`Cédula: ${this.reporteCliente.cliente ? this.reporteCliente.cliente.cedula : this.reporteCliente.facturas[0].cedulaCliente}`, 14, 55);
      if (this.reporteCliente.cliente?.correo) {
        doc.text(`Correo: ${this.reporteCliente.cliente.correo}`, 110, 55);
      }
      doc.text(`Total Compras: ${this.reporteCliente.totalFacturas}`, 14, 62);
      doc.text(`Total Pacas: ${this.reporteCliente.totalPacas}`, 14, 69);
      doc.text(`Total Invertido: $${this.reporteCliente.montoTotal.toLocaleString('es-CO')}`, 14, 76);

      // Tabla
      const tableBody = this.reporteCliente.facturas.map(f => {
        const detalles = f.detalles.map(d => `${d.tipoHeno}: ${d.cantidad} a $${d.precioUnitario.toLocaleString('es-CO')} = $${d.subtotal.toLocaleString('es-CO')}`).join('\n');
        return [
          `#${f.idFactura}`,
          f.fechaFactura,
          detalles,
          `$${f.envio.toLocaleString('es-CO')}`,
          `$${f.totalVenta.toLocaleString('es-CO')}`
        ];
      });

      autoTable(doc, {
        startY: 85,
        head: [['ID', 'Fecha', 'Detalles', 'Envío', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [56, 161, 105] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 2: { cellWidth: 70 } } 
      });

      this.pdfUtils.dibujarPieDePagina(doc);

      doc.save(`Reporte_Cliente_${this.cedulaInput}_${Date.now()}.pdf`);
    } catch (e: any) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar el PDF: ' + e.message);
    }
  }

  descargarExcel() {
    if (!this.reporteCliente || !this.reporteCliente.facturas || this.reporteCliente.facturas.length === 0) return;
    try {
      this.excelExportService.exportarReporteCliente(this.reporteCliente, this.cedulaInput);
    } catch (e: any) {
      console.error('Error al generar Excel:', e);
      alert('Error al generar el archivo Excel: ' + e.message);
    }
  }
}
