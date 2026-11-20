import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Ticket, CategoriaTicket } from '../../models/ticket';
import { Cliente } from '../../models/Cliente';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-crear-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crearTicket.html',
  styleUrls: ['./crearTicket.css']
})
export class CrearTicketComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ticketService = inject(TicketService);
  private cdr = inject(ChangeDetectorRef);

  cliente: Cliente | null = null;

  // Formulario
  ticket: Ticket = {
    tituloTicket: '',
    descripcionTicket: '',
    categoriaTicket: 'CALIDAD_FORRAJE'
  };

  cedulaClienteInput: string = '';
  idFacturaInput: number | null = null;

  // Archivo de Evidencia
  archivoImagen: File | null = null;
  previewImagenUrl: string | null = null;

  // Estados de interfaz
  enviando: boolean = false;
  errorMensaje: string | null = null;
  ticketExitoso: Ticket | null = null;
  copiado: boolean = false;

  categorias: { id: CategoriaTicket; nombre: string; desc: string; icon: string }[] = [
    {
      id: 'CALIDAD_FORRAJE',
      nombre: 'Calidad del Forraje',
      desc: 'Hongo, moho, pasto húmedo, olor fuerte o forraje dañado',
      icon: '🌿'
    },
    {
      id: 'LOGISTICA',
      nombre: 'Logística y Entrega',
      desc: 'Retraso de despacho, camión no llegó o pedido incompleto',
      icon: '🚚'
    },
    {
      id: 'FACTURACION',
      nombre: 'Facturación y Cobro',
      desc: 'Discrepancia en valor facturado, recibo o comprobante',
      icon: '📄'
    },
    {
      id: 'SOPORTE_WEB',
      nombre: 'Soporte de Plataforma',
      desc: 'Problemas con tu cuenta, login o acceso a la tienda web',
      icon: '💻'
    }
  ];

  ngOnInit(): void {
    // 1. Cargar cliente logueado si existe
    const guardado = localStorage.getItem('clienteActivo');
    if (guardado) {
      try {
        this.cliente = JSON.parse(guardado);
        if (this.cliente?.cedula) {
          this.cedulaClienteInput = this.cliente.cedula;
        }
      } catch {
        this.cliente = null;
      }
    }

    // 2. Pre-llenar factura o cédula si vienen por parámetros de URL (ej: /crearTicket?idFactura=6)
    const paramFactura = this.route.snapshot.queryParamMap.get('idFactura');
    if (paramFactura && !isNaN(Number(paramFactura))) {
      this.idFacturaInput = Number(paramFactura);
    }

    const paramHeno = this.route.snapshot.queryParamMap.get('heno') || this.route.snapshot.queryParamMap.get('tipoHeno');
    if (paramHeno && paramFactura) {
      this.ticket.tituloTicket = `Inconveniente con ${paramHeno} (Factura #${paramFactura})`;
      this.ticket.descripcionTicket = `Reporto un inconveniente con el producto ${paramHeno} adquirido en la Factura #${paramFactura}: `;
      this.ticket.categoriaTicket = 'CALIDAD_FORRAJE';
    } else if (paramFactura) {
      this.ticket.tituloTicket = `Inconveniente con Factura #${paramFactura}`;
      this.ticket.descripcionTicket = `Reporto un inconveniente con el pedido de la Factura #${paramFactura}: `;
    }

    const paramCedula = this.route.snapshot.queryParamMap.get('cedula') || this.route.snapshot.queryParamMap.get('cedulaU');
    if (paramCedula && !this.cedulaClienteInput) {
      this.cedulaClienteInput = paramCedula;
    }
  }

  onArchivoSeleccionado(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMensaje = 'Por favor selecciona únicamente archivos de imagen (JPG, PNG, WebP).';
        return;
      }
      this.errorMensaje = null;
      this.archivoImagen = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImagenUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  quitarImagen(): void {
    this.archivoImagen = null;
    this.previewImagenUrl = null;
  }

  seleccionarCategoria(catId: CategoriaTicket): void {
    this.ticket.categoriaTicket = catId;
  }

  enviarTicket(): void {
    this.errorMensaje = null;

    if (!this.cedulaClienteInput?.trim()) {
      this.errorMensaje = 'Por favor ingresa la cédula o NIT del cliente.';
      return;
    }

    if (!this.ticket.tituloTicket?.trim()) {
      this.errorMensaje = 'Por favor ingresa un título breve del problema.';
      return;
    }

    if (!this.ticket.descripcionTicket?.trim()) {
      this.errorMensaje = 'Por favor ingresa una descripción detallada de lo sucedido.';
      return;
    }

    this.enviando = true;

    const payload: Ticket = {
      tituloTicket: this.ticket.tituloTicket.trim(),
      descripcionTicket: this.ticket.descripcionTicket.trim(),
      categoriaTicket: this.ticket.categoriaTicket,
      cliente: { cedula: this.cedulaClienteInput.trim() },
      factura: this.idFacturaInput ? { idFactura: Number(this.idFacturaInput) } : null
    };

    this.ticketService.crearTicket(payload, this.archivoImagen).subscribe({
      next: (ticketCreado) => {
        this.enviando = false;
        this.ticketExitoso = ticketCreado;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.enviando = false;
        console.error('Error al radicar ticket:', err);
        this.errorMensaje = err.error?.error || err.error?.message || err.message || 'Error al conectar con el servidor de tickets.';
        this.cdr.detectChanges();
      }
    });
  }

  radicarOtro(): void {
    this.ticketExitoso = null;
    this.ticket = {
      tituloTicket: '',
      descripcionTicket: '',
      categoriaTicket: 'CALIDAD_FORRAJE'
    };
    this.quitarImagen();
    this.errorMensaje = null;
  }

  copiarRadicado(codigo: string): void {
    navigator.clipboard.writeText(codigo);
    this.copiado = true;
    setTimeout(() => {
      this.copiado = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  volver(): void {
    if (this.cliente) {
      this.router.navigate(['/perfil-cliente']);
    } else {
      this.router.navigate(['/']);
    }
  }

  cerrarSesion(): void {
    localStorage.removeItem('clienteActivo');
    this.router.navigate(['/']);
  }
}
