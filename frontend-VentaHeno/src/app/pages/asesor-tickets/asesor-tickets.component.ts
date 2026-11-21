import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AdminService, Usuario } from '../../services/admin.service';
import { Ticket } from '../../models/ticket';

@Component({
  selector: 'app-asesor-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asesor-tickets.component.html',
  styleUrls: ['./asesor-tickets.component.css']
})
export class AsesorTicketsComponent implements OnInit {
  private ticketService = inject(TicketService);
  private adminService = inject(AdminService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  asesorActual: Usuario | null = null;
  cedulaAsesor: string = '';

  tickets: Ticket[] = [];
  ticketsFiltrados: Ticket[] = [];
  cargando: boolean = true;
  error: string | null = null;

  // Filtros
  filtroTexto: string = '';
  filtroFecha: string = '';
  filtroMes: string = '';
  private searchTimeout: any = null;

  // KPIs del Asesor
  totalAsignados: number = 0;
  totalEnAtencion: number = 0;
  totalResueltos: number = 0;
  totalCriticos: number = 0;

  // Modal de Detalle y Resolución
  ticketSeleccionado: Ticket | null = null;
  mostrarModalDetalle: boolean = false;
  respuestaResolucion: string = '';
  guardandoResolucion: boolean = false;
  mensajeExitoResolucion: string | null = null;
  errorResolucion: string | null = null;

  get esAdmin(): boolean {
    return this.adminService.isAdminLoggedIn();
  }

  volverAlPanel(): void {
    this.router.navigate(['/admin']);
  }

  ngOnInit(): void {
    this.asesorActual = this.adminService.getUsuario();
    if (this.asesorActual && this.asesorActual.cedulaU) {
      this.cedulaAsesor = String(this.asesorActual.cedulaU);
    }
    this.cargarKpisGenerales();
    this.cargarTicketsIniciales();
  }

  cargarKpisGenerales(): void {
    if (!this.cedulaAsesor) return;
    this.ticketService.buscarPorAsesor(this.cedulaAsesor).subscribe({
      next: (data) => {
        const todos = data || [];
        this.totalAsignados = todos.length;
        this.totalEnAtencion = todos.filter(t => (t.estadoTicket || '').toUpperCase() === 'EN_ANALISIS').length;
        this.totalResueltos = todos.filter(t => (t.estadoTicket || '').toUpperCase() === 'RESUELTO').length;
        this.totalCriticos = todos.filter(t => {
          const p = (t.prioridad || '').toUpperCase();
          const e = (t.estadoTicket || '').toUpperCase();
          return p === 'CRITICA' && e !== 'RESUELTO';
        }).length;
        this.cdr.detectChanges();
      },
      error: () => { }
    });
  }

  calcularKpis(): void {
    this.cargarKpisGenerales();
  }

  // 1. De inicio: Cargar tickets pendientes (no resueltos) con buscarPorCedulaAsesorYestado
  cargarTicketsIniciales(): void {
    if (!this.cedulaAsesor) {
      this.error = 'No se encontró la cédula del asesor autenticado en la sesión.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    this.cargando = true;
    this.error = null;

    this.ticketService.buscarPorAsesorYEstado(this.cedulaAsesor).subscribe({
      next: (data) => {
        this.tickets = data || [];
        this.ordenarTicketsPorFechaLimite(this.tickets);
        this.ticketsFiltrados = [...this.tickets];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar tickets pendientes del asesor:', err);
        this.error = 'No se pudieron consultar los tickets asignados.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarTicketsAsesor(): void {
    this.cargarTicketsIniciales();
  }

  // 2. Buscador en backend usando buscarPorAsesorYFiltro (Cédula, Radicado, Nombre)
  onBusquedaChange(texto: string): void {
    this.filtroTexto = texto;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.ejecutarBusqueda();
    }, 350);
  }

  ejecutarBusqueda(): void {
    if (!this.cedulaAsesor) return;

    const texto = (this.filtroTexto || '').trim();
    if (texto) {
      this.filtroFecha = '';
      this.filtroMes = '';
      this.cargando = true;
      this.error = null;

      this.ticketService.buscarPorAsesorYFiltro(this.cedulaAsesor, texto).subscribe({
        next: (data) => {
          this.tickets = data || [];
          this.ordenarTicketsPorFechaLimite(this.tickets);
          this.ticketsFiltrados = [...this.tickets];
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error en búsqueda de tickets:', err);
          this.error = 'No se pudo realizar la búsqueda.';
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      if (!this.filtroFecha && !this.filtroMes) {
        this.cargarTicketsIniciales();
      }
    }
  }

  // 3. Filtro de fecha para consultar tickets atendidos con buscarAtendidosPorAsesorYFecha
  onFechaChange(): void {
    if (!this.cedulaAsesor) return;
    this.filtroMes = '';
    this.filtroTexto = '';

    if (!this.filtroFecha) {
      this.cargarTicketsIniciales();
      return;
    }

    const partes = this.filtroFecha.split('-');
    if (partes.length === 3) {
      const anio = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      const dia = parseInt(partes[2], 10);
      this.cargarAtendidosPorFecha(anio, mes, dia);
    }
  }

  onMesChange(): void {
    if (!this.cedulaAsesor) return;
    this.filtroFecha = '';
    this.filtroTexto = '';

    if (!this.filtroMes) {
      this.cargarTicketsIniciales();
      return;
    }

    const mes = parseInt(this.filtroMes, 10);
    const anio = new Date().getFullYear();
    this.cargarAtendidosPorFecha(anio, mes, null);
  }

  cargarAtendidosPorFecha(anio: number | null, mes: number | null, dia: number | null): void {
    this.cargando = true;
    this.error = null;

    this.ticketService.buscarAtendidosPorAsesorYFecha(this.cedulaAsesor, anio, mes, dia).subscribe({
      next: (data) => {
        this.tickets = data || [];
        this.ordenarTicketsPorFechaLimite(this.tickets);
        this.ticketsFiltrados = [...this.tickets];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al consultar tickets atendidos por fecha:', err);
        this.error = 'No se pudieron consultar los tickets atendidos en esa fecha.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroFecha = '';
    this.filtroMes = '';
    this.cargarTicketsIniciales();
  }

  private ordenarTicketsPorFechaLimite(lista: Ticket[]): void {
    if (!lista || lista.length <= 1) return;

    lista.sort((a, b) => {
      const timeA = this.parseFecha(a.fechaLimite);
      const timeB = this.parseFecha(b.fechaLimite);

      if (timeA !== null && timeB !== null) {
        if (timeA !== timeB) return timeA - timeB;
        return (b.idTicket || 0) - (a.idTicket || 0);
      }
      if (timeA === null && timeB !== null) return 1;
      if (timeA !== null && timeB === null) return -1;
      return (b.idTicket || 0) - (a.idTicket || 0);
    });
  }

  private parseFecha(fecha: any): number | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha.getTime();
    if (typeof fecha === 'number') return fecha;
    if (Array.isArray(fecha)) {
      const d = new Date(fecha[0], (fecha[1] || 1) - 1, fecha[2] || 1, fecha[3] || 0, fecha[4] || 0, fecha[5] || 0);
      return d.getTime();
    }
    const parsed = new Date(fecha).getTime();
    return isNaN(parsed) ? null : parsed;
  }

  esSlaVencido(ticket: Ticket): boolean {
    if (!ticket.fechaLimite) return false;
    const est = (ticket.estadoTicket || '').toUpperCase();
    if (est === 'RESUELTO') return false;

    const limit = this.parseFecha(ticket.fechaLimite);
    if (!limit) return false;
    return limit < Date.now();
  }

  esSlaUrgente(ticket: Ticket): boolean {
    if (!ticket.fechaLimite) return false;
    const est = (ticket.estadoTicket || '').toUpperCase();
    if (est === 'RESUELTO') return false;

    const limit = this.parseFecha(ticket.fechaLimite);
    if (!limit) return false;
    const ahora = Date.now();
    return limit >= ahora && limit <= (ahora + 24 * 60 * 60 * 1000);
  }

  abrirDetalle(ticket: Ticket): void {
    this.ticketSeleccionado = ticket;
    this.respuestaResolucion = ticket.respuesta || '';
    this.mensajeExitoResolucion = null;
    this.errorResolucion = null;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.ticketSeleccionado = null;
    this.respuestaResolucion = '';
    this.mensajeExitoResolucion = null;
    this.errorResolucion = null;
    this.cdr.detectChanges();
  }

  resolverTicket(): void {
    if (!this.ticketSeleccionado || !this.ticketSeleccionado.idTicket) return;
    if (!this.respuestaResolucion.trim()) {
      this.errorResolucion = 'Por favor ingresa la respuesta o solución técnica brindada al cliente.';
      return;
    }

    this.guardandoResolucion = true;
    this.errorResolucion = null;
    this.mensajeExitoResolucion = null;

    const id = this.ticketSeleccionado.idTicket;
    const respuesta = this.respuestaResolucion.trim();

    this.ticketService.resolverTicket(id, respuesta).subscribe({
      next: (ticketActualizado) => {
        this.guardandoResolucion = false;
        this.mensajeExitoResolucion = '¡Ticket resuelto exitosamente!';

        // Actualizar datos en memoria
        const idxAll = this.tickets.findIndex(t => t.idTicket === id);
        if (idxAll !== -1) {
          this.tickets[idxAll] = { ...this.tickets[idxAll], ...ticketActualizado };
        }
        const idxFil = this.ticketsFiltrados.findIndex(t => t.idTicket === id);
        if (idxFil !== -1) {
          this.ticketsFiltrados[idxFil] = { ...this.ticketsFiltrados[idxFil], ...ticketActualizado };
        }
        this.ticketSeleccionado = { ...this.ticketSeleccionado, ...ticketActualizado };
        this.cargarKpisGenerales();

        setTimeout(() => {
          this.cerrarModalDetalle();
          this.cargarKpisGenerales();
          if (this.filtroFecha || this.filtroMes) {
            if (this.filtroFecha) this.onFechaChange();
            else this.onMesChange();
          } else if (this.filtroTexto) {
            this.ejecutarBusqueda();
          } else {
            this.cargarTicketsIniciales();
          }
        }, 1200);
      },
      error: (err) => {
        this.guardandoResolucion = false;
        console.error('Error al resolver ticket:', err);
        this.errorResolucion = typeof err?.error === 'string'
          ? err.error
          : 'Error al registrar la solución del ticket.';
        this.cdr.detectChanges();
      }
    });
  }

  cerrarSesion(): void {
    this.adminService.logoutAdmin();
    this.router.navigate(['/producto']);
  }

  // Helpers de visualización (3 estados oficiales)
  getEstadoClass(estado?: string): string {
    const e = (estado || '').toUpperCase();
    switch (e) {
      case 'RADICADO': return 'badge-radicado';
      case 'EN_ANALISIS': return 'badge-analisis';
      case 'RESUELTO': return 'badge-resuelto';
      default: return 'badge-default';
    }
  }

  getPrioridadClass(prioridad?: string): string {
    const p = (prioridad || '').toUpperCase();
    switch (p) {
      case 'CRITICA': return 'prio-critica';
      case 'ALTA': return 'prio-alta';
      case 'MEDIA': return 'prio-media';
      case 'BAJA': return 'prio-baja';
      default: return 'prio-default';
    }
  }

  getCategoriaLabel(categoria?: string): string {
    if (!categoria) return 'GENERAL';
    return categoria.replace('_', ' ');
  }

  getClienteNombre(ticket: Ticket): string {
    if (ticket.cliente && 'nombre' in ticket.cliente && ticket.cliente.nombre) {
      return ticket.cliente.nombre;
    }
    return 'Cliente General';
  }

  getClienteCedula(ticket: Ticket): string {
    if (ticket.cliente && 'cedula' in ticket.cliente && ticket.cliente.cedula) {
      return ticket.cliente.cedula;
    }
    return 'Sin C.C.';
  }

  getClienteCorreo(ticket: Ticket): string {
    if (ticket.cliente && 'correo' in ticket.cliente && ticket.cliente.correo) {
      return ticket.cliente.correo;
    }
    return '';
  }

  getClienteTelefono(ticket: Ticket): string {
    if (ticket.cliente && 'telefono' in ticket.cliente && ticket.cliente.telefono) {
      return ticket.cliente.telefono;
    }
    return '';
  }

  getFacturaId(ticket: Ticket): string {
    if (ticket.factura && 'idFactura' in ticket.factura && ticket.factura.idFactura) {
      return '#' + ticket.factura.idFactura;
    }
    return 'General';
  }
}
