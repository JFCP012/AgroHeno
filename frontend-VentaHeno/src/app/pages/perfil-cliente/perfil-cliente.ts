import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente } from '../../models/Cliente';
import { ClienteService } from '../../services/cliente.service';
import { ReportesService } from '../../services/reportes.service';
import { ReporteVentaCliente, FacturaReporte, DetalleFacturaReporte } from '../../models/reporte-venta.model';
import { TicketService } from '../../services/ticket.service';
import { PdfUtilsService, LogoData } from '../../services/pdf-utils.service';
import { Ticket } from '../../models/ticket';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-perfil-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-cliente.html',
  styleUrl: './perfil-cliente.css'
})
export class PerfilCliente implements OnInit, OnDestroy {
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private reportesService = inject(ReportesService);
  private ticketService = inject(TicketService);
  private pdfUtils = inject(PdfUtilsService);
  private cdr = inject(ChangeDetectorRef);

  cliente: Cliente | null = null;
  pestanaActiva: 'perfil' | 'facturas' | 'tickets' | 'editar' = 'perfil';

  // Mis Facturas
  reporteCliente: ReporteVentaCliente | null = null;
  cargandoFacturas: boolean = false;
  errorFacturas: string | null = null;

  // Tickets de Soporte
  ticketsCliente: Ticket[] = [];
  facturasConTicket = new Set<number>();
  ticketsPorFactura = new Map<number, Ticket>();
  cargandoTickets: boolean = false;
  errorTickets: string | null = null;

  // Editar Perfil
  clienteEdit = {
    nombre: '',
    telefono: '',
    direccion: '',
    correo: ''
  };
  archivoImagenSeleccionado: File | null = null;
  previewImagenUrl: string | null = null;
  guardandoPerfil: boolean = false;
  mensajeExitoPerfil: string | null = null;
  mensajeErrorPerfil: string | null = null;

  private logoData: LogoData = { base64: '', aspectRatio: 1.0 };

  ngOnInit() {
    const guardado = localStorage.getItem('clienteActivo');
    if (guardado) {
      try {
        this.cliente = JSON.parse(guardado);
      } catch {
        this.cliente = null;
      }
    }

    if (!this.cliente) {
      this.router.navigate(['/']);
      return;
    }

    this.pdfUtils.obtenerLogo().then(logo => { this.logoData = logo; });
    this.iniciarFormularioEdit();
    this.cargarFacturas();
    this.cargarTicketsCliente();
  }

  ngOnDestroy() {
    if (this.previewImagenUrl && this.previewImagenUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewImagenUrl);
    }
  }

  iniciarFormularioEdit() {
    if (this.cliente) {
      this.clienteEdit = {
        nombre: this.cliente.nombre || '',
        telefono: this.cliente.telefono || '',
        direccion: this.cliente.direccion || '',
        correo: this.cliente.correo || ''
      };
      this.previewImagenUrl = this.cliente.imagen || null;
      this.archivoImagenSeleccionado = null;
    }
  }

  cambiarPestana(pestana: 'perfil' | 'facturas' | 'tickets' | 'editar') {
    this.pestanaActiva = pestana;
    this.mensajeExitoPerfil = null;
    this.mensajeErrorPerfil = null;

    if (pestana === 'facturas') {
      if (!this.reporteCliente) {
        this.cargarFacturas();
      }
      this.cargarTicketsCliente();
    } else if (pestana === 'tickets') {
      this.cargarTicketsCliente();
    } else if (pestana === 'editar') {
      this.iniciarFormularioEdit();
    }
  }

  cargarFacturas() {
    if (!this.cliente || !this.cliente.cedula) return;

    this.cargandoFacturas = true;
    this.errorFacturas = null;
    this.cdr.detectChanges();

    this.reportesService.obtenerReportePorCliente(this.cliente.cedula).subscribe({
      next: (data) => {
        this.reporteCliente = data;
        this.cargandoFacturas = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar facturas:', err);
        this.errorFacturas = 'No se pudieron cargar tus facturas o no posees compras registradas.';
        this.cargandoFacturas = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarTicketsCliente() {
    if (!this.cliente || !this.cliente.cedula) return;

    this.cargandoTickets = true;
    this.errorTickets = null;

    this.ticketService.obtenerTicketsPorCliente(this.cliente.cedula).subscribe({
      next: (tickets) => {
        this.ticketsCliente = tickets || [];
        this.facturasConTicket.clear();
        this.ticketsPorFactura.clear();

        this.ticketsCliente.forEach(t => {
          const idFac = (t.factura as any)?.idFactura || (typeof t.factura === 'number' ? t.factura : null);
          if (idFac) {
            const numId = Number(idFac);
            this.facturasConTicket.add(numId);
            if (!this.ticketsPorFactura.has(numId)) {
              this.ticketsPorFactura.set(numId, t);
            }
          }
        });

        this.cargandoTickets = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar tickets del cliente:', err);
        this.errorTickets = 'No se pudieron consultar los tickets.';
        this.cargandoTickets = false;
        this.cdr.detectChanges();
      }
    });
  }

  tieneTicketFactura(idFactura: number): boolean {
    return this.facturasConTicket.has(Number(idFactura));
  }

  obtenerTicketDeFactura(idFactura: number): Ticket | undefined {
    return this.ticketsPorFactura.get(idFactura);
  }

  irAVerTicket(ticket?: Ticket) {
    if (ticket) {
      this.pestanaActiva = 'tickets';
      this.cdr.detectChanges();
    }
  }

  descargarFacturaPDF(f: FacturaReporte) {
    if (!this.cliente) return;

    try {
      const doc = new jsPDF();
      this.pdfUtils.dibujarEncabezado(doc, this.logoData, 18, 34);

      // Título
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('FACTURA DE VENTA', 14, 44);

      // Info Factura
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`N° Factura: #${f.idFactura}`, 14, 52);
      doc.text(`Fecha: ${f.fechaFactura}`, 14, 59);

      // Datos Cliente
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Datos del Cliente:', 120, 44);

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Nombre: ${f.nombreCliente || this.cliente.nombre}`, 120, 52);
      doc.text(`Cédula/NIT: ${f.cedulaCliente || this.cliente.cedula}`, 120, 59);
      if (this.cliente.telefono) {
        doc.text(`Teléfono: ${this.cliente.telefono}`, 120, 66);
      }
      let currentClientY = 73;
      if (this.cliente.correo) {
        doc.text(`Correo: ${this.cliente.correo}`, 120, currentClientY);
        currentClientY += 7;
      }
      if (this.cliente.direccion) {
        const dir = `Dirección: ${this.cliente.direccion}`;
        const dirLines = doc.splitTextToSize(dir, 75);
        doc.text(dirLines, 120, currentClientY);
      }

      // Tabla de productos
      const tableBody = f.detalles.map((d: DetalleFacturaReporte) => [
        d.tipoHeno,
        `$${d.precioUnitario.toLocaleString('es-CO')}`,
        d.cantidad,
        `$${d.subtotal.toLocaleString('es-CO')}`
      ]);

      autoTable(doc, {
        startY: 85,
        head: [['Tipo de Heno', 'Precio Unitario', 'Cantidad', 'Subtotal']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [56, 161, 105] },
        alternateRowStyles: { fillColor: [240, 253, 244] }
      });

      // Totales
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const totalVenta = f.totalVenta || 0;
      const envio = f.envio || 0;
      const subtotal = totalVenta - envio;

      // Caja de totales
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(130, finalY - 5, 66, 30, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Subtotal:`, 135, finalY + 3);
      doc.text(`$${subtotal.toLocaleString('es-CO')}`, 192, finalY + 3, { align: 'right' });

      doc.text(`Envío:`, 135, finalY + 10);
      doc.text(`$${envio.toLocaleString('es-CO')}`, 192, finalY + 10, { align: 'right' });

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL:`, 135, finalY + 20);
      doc.text(`$${totalVenta.toLocaleString('es-CO')}`, 192, finalY + 20, { align: 'right' });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 275, 196, 275);
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Gracias por su compra en AgroHeno.', 105, 281, { align: 'center' });

      doc.save(`Factura_${f.idFactura}_${this.cliente.cedula}.pdf`);
    } catch (e: any) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar el archivo PDF: ' + e.message);
    }
  }

  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.mensajeErrorPerfil = 'Por favor selecciona un archivo de imagen válido (JPG, PNG).';
        return;
      }

      this.archivoImagenSeleccionado = file;
      this.mensajeErrorPerfil = null;

      if (this.previewImagenUrl && this.previewImagenUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.previewImagenUrl);
      }
      this.previewImagenUrl = URL.createObjectURL(file);
      this.cdr.detectChanges();
    }
  }

  guardarCambiosPerfil() {
    if (!this.cliente) return;

    if (!this.clienteEdit.nombre.trim()) {
      this.mensajeErrorPerfil = 'El nombre no puede estar vacío.';
      return;
    }

    this.guardandoPerfil = true;
    this.mensajeExitoPerfil = null;
    this.mensajeErrorPerfil = null;
    this.cdr.detectChanges();

    const clienteActualizado: Cliente = {
      cedula: this.cliente.cedula, // Mantiene la cédula intacta e inmutable
      nombre: this.clienteEdit.nombre.trim(),
      telefono: this.clienteEdit.telefono.trim(),
      direccion: this.clienteEdit.direccion.trim(),
      correo: this.clienteEdit.correo?.trim() || undefined,
      clave: this.cliente.clave,
      imagen: this.cliente.imagen
    };

    this.clienteService.actualizarCliente(clienteActualizado, this.archivoImagenSeleccionado).subscribe({
      next: (res) => {
        this.cliente = res;
        localStorage.setItem('clienteActivo', JSON.stringify(res));
        this.guardandoPerfil = false;
        this.mensajeExitoPerfil = '¡Tu perfil ha sido actualizado con éxito!';
        this.archivoImagenSeleccionado = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar perfil:', err);
        this.guardandoPerfil = false;
        this.mensajeErrorPerfil = err.error?.message || 'Error al guardar los cambios en el servidor.';
        this.cdr.detectChanges();
      }
    });
  }

  volver() {
    this.router.navigate(['/']);
  }

  irACrearTicket(idFactura?: number, tipoHeno?: string) {
    const queryParams: any = {};
    if (idFactura) queryParams.idFactura = idFactura;
    if (tipoHeno) {
      queryParams.heno = tipoHeno;
      queryParams.tipoHeno = tipoHeno;
    }
    if (this.cliente?.cedula) queryParams.cedula = this.cliente.cedula;

    // Redirige primero a la sección de preguntas frecuentes con los datos precargados
    this.router.navigate(['/preguntas-frecuentes'], { queryParams });
  }

  cerrarSesion() {
    localStorage.removeItem('clienteActivo');
    window.location.href = '/';
  }
}
