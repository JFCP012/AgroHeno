import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AdminService, Usuario } from '../../services/admin.service';
import { Ticket } from '../../models/ticket';

@Component({
  selector: 'app-gestion-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-tickets.component.html',
  styleUrls: ['./gestion-tickets.component.css']
})
export class GestionTicketsComponent implements OnInit {
  private ticketService = inject(TicketService);
  private adminService = inject(AdminService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  tickets: Ticket[] = [];
  ticketsFiltrados: Ticket[] = [];
  cargando: boolean = true;
  error: string | null = null;

  // Filtros
  filtroTexto: string = '';
  filtroEstado: string = 'TODOS';
  filtroPrioridad: string = 'TODAS';
  filtroCategoria: string = 'TODAS';
  private debounceTimer: any = null;

  // KPIs
  totalTickets: number = 0;
  totalRadicados: number = 0;
  totalEnAtencion: number = 0;
  totalResueltos: number = 0;
  totalCriticos: number = 0;

  // Modal de Detalle
  ticketSeleccionado: Ticket | null = null;
  mostrarModalDetalle: boolean = false;

  // Modal de Asignación de Asesor
  mostrarModalAsignar: boolean = false;
  ticketParaAsignar: Ticket | null = null;
  asesores: Usuario[] = [];
  asesorSeleccionadoCedula: number | null = null;
  cargandoAsesores: boolean = false;
  guardandoAsignacion: boolean = false;
  mensajeExitoAsignacion: string | null = null;
  errorAsignacion: string | null = null;

  ngOnInit(): void {
    this.cargarTickets();
  }

  cargarTickets(): void {
    this.cargando = true;
    this.error = null;

    // Ejecución solicitada: listarTickets()
    this.ticketService.listarTickets().subscribe({
      next: (data) => {
        this.tickets = data || [];
        this.ordenarTicketsPorFechaLimite(this.tickets);
        this.calcularKpis();
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar tickets:', err);
        this.error = 'No se pudo conectar con el servidor para obtener los tickets.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  calcularKpis(): void {
    this.totalTickets = this.tickets.length;
    this.totalRadicados = this.tickets.filter(t => (t.estadoTicket || '').toUpperCase() === 'RADICADO').length;
    this.totalEnAtencion = this.tickets.filter(t => {
      const e = (t.estadoTicket || '').toUpperCase();
      return e === 'EN_ANALISIS' || e === 'EN_CAMPO';
    }).length;
    this.totalResueltos = this.tickets.filter(t => {
      const e = (t.estadoTicket || '').toUpperCase();
      return e === 'RESUELTO' || e === 'CERRADO';
    }).length;
    this.totalCriticos = this.tickets.filter(t => {
      const p = (t.prioridad || '').toUpperCase();
      const e = (t.estadoTicket || '').toUpperCase();
      return p === 'CRITICA' && e !== 'RESUELTO' && e !== 'CERRADO';
    }).length;
  }

  onBusquedaChange(texto: string): void {
    this.filtroTexto = texto;
    this.filtrarEnMemoria();
    this.cdr.detectChanges();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.aplicarFiltrosBackend();
    }, 300);
  }

  onEstadoSelect(event: any): void {
    const val = typeof event === 'string' ? event : (event?.target?.value || this.filtroEstado);
    this.filtroEstado = val;
    if (event?.target?.blur) {
      try { event.target.blur(); } catch (_) {}
    }
    this.aplicarFiltros();
  }

  onPrioridadSelect(event: any): void {
    const val = typeof event === 'string' ? event : (event?.target?.value || this.filtroPrioridad);
    this.filtroPrioridad = val;
    if (event?.target?.blur) {
      try { event.target.blur(); } catch (_) {}
    }
    this.aplicarFiltros();
  }

  onCategoriaSelect(event: any): void {
    const val = typeof event === 'string' ? event : (event?.target?.value || this.filtroCategoria);
    this.filtroCategoria = val;
    if (event?.target?.blur) {
      try { event.target.blur(); } catch (_) {}
    }
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    // 1. Filtrado instantáneo en memoria (cero milisegundos, sin esperar clic afuera)
    this.filtrarEnMemoria();
    this.cdr.detectChanges();

    // 2. Consulta al backend (PostgreSQL) para asegurar consistencia
    this.aplicarFiltrosBackend();
  }

  private filtrarEnMemoria(): void {
    const q = this.filtroTexto.trim().toLowerCase();

    this.ticketsFiltrados = this.tickets.filter(ticket => {
      if (q) {
        const radicado = (ticket.codigoRadicado || '').toLowerCase();
        const titulo = (ticket.tituloTicket || '').toLowerCase();
        const descripcion = (ticket.descripcionTicket || '').toLowerCase();
        const nombreCliente = (ticket.cliente && 'nombre' in ticket.cliente && ticket.cliente.nombre ? ticket.cliente.nombre : '').toLowerCase();
        const cedulaCliente = (ticket.cliente && 'cedula' in ticket.cliente && ticket.cliente.cedula ? ticket.cliente.cedula : '').toLowerCase();
        const facturaId = ticket.factura && 'idFactura' in ticket.factura && ticket.factura.idFactura ? String(ticket.factura.idFactura) : '';

        const coincide = radicado.includes(q) ||
          titulo.includes(q) ||
          descripcion.includes(q) ||
          nombreCliente.includes(q) ||
          cedulaCliente.includes(q) ||
          facturaId.includes(q);

        if (!coincide) return false;
      }

      if (this.filtroEstado !== 'TODOS') {
        const estado = (ticket.estadoTicket || '').toUpperCase();
        if (estado !== this.filtroEstado.toUpperCase()) return false;
      }

      if (this.filtroPrioridad !== 'TODAS') {
        const prioridad = (ticket.prioridad || '').toUpperCase();
        if (prioridad !== this.filtroPrioridad.toUpperCase()) return false;
      }

      if (this.filtroCategoria !== 'TODAS') {
        const categoria = (ticket.categoriaTicket || '').toUpperCase();
        if (categoria !== this.filtroCategoria.toUpperCase()) return false;
      }

      return true;
    });

    this.ordenarTicketsPorFechaLimite(this.ticketsFiltrados);
  }

  private aplicarFiltrosBackend(): void {
    this.ticketService.filtrarTickets(
      this.filtroEstado,
      this.filtroPrioridad,
      this.filtroCategoria,
      this.filtroTexto
    ).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          if (data) {
            this.ticketsFiltrados = [...data];
            this.ordenarTicketsPorFechaLimite(this.ticketsFiltrados);
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al filtrar tickets desde el backend:', err);
      }
    });
  }

  /**
   * Ordena los tickets de forma ascendente según su fecha límite (SLA)
   * para dar visibilidad y prioridad inmediata a los tickets más próximos a vencerse.
   */
  private ordenarTicketsPorFechaLimite(lista: Ticket[]): void {
    if (!lista || lista.length <= 1) return;

    lista.sort((a, b) => {
      const timeA = this.parseFecha(a.fechaLimite);
      const timeB = this.parseFecha(b.fechaLimite);

      // Si ambos tienen fecha límite definida, el más próximo a vencer (menor timestamp) va primero (ASC)
      if (timeA !== null && timeB !== null) {
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return (b.idTicket || 0) - (a.idTicket || 0);
      }

      // Los tickets sin fecha límite van al final
      if (timeA === null && timeB !== null) return 1;
      if (timeA !== null && timeB === null) return -1;

      // Desempate secundario por ID descendente
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
    if (est === 'RESUELTO' || est === 'CERRADO') return false;

    const limit = this.parseFecha(ticket.fechaLimite);
    if (!limit) return false;
    return limit < Date.now();
  }

  esSlaUrgente(ticket: Ticket): boolean {
    if (!ticket.fechaLimite) return false;
    const est = (ticket.estadoTicket || '').toUpperCase();
    if (est === 'RESUELTO' || est === 'CERRADO') return false;

    const limit = this.parseFecha(ticket.fechaLimite);
    if (!limit) return false;
    const ahora = Date.now();
    return limit >= ahora && limit <= (ahora + 24 * 60 * 60 * 1000);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroEstado = 'TODOS';
    this.filtroPrioridad = 'TODAS';
    this.filtroCategoria = 'TODAS';
    this.aplicarFiltros();
  }

  abrirDetalle(ticket: Ticket): void {
    this.ticketSeleccionado = ticket;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.ticketSeleccionado = null;
    this.cdr.detectChanges();
  }

  // --- MÉTODOS DE ASIGNACIÓN DE ASESOR ---
  tieneAsesorAsignado(ticket?: Ticket | null): boolean {
    if (!ticket) return false;
    if (ticket.tecnicoAsignado) {
      if (typeof ticket.tecnicoAsignado === 'object') {
        return !!('cedulaU' in ticket.tecnicoAsignado || 'nombre' in ticket.tecnicoAsignado);
      }
      return true;
    }
    const estado = (ticket.estadoTicket || '').toUpperCase();
    return estado === 'EN_ANALISIS' || estado === 'EN_CAMPO' || estado === 'RESUELTO' || estado === 'CERRADO';
  }

  abrirModalAsignar(ticket: Ticket, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.tieneAsesorAsignado(ticket)) {
      return;
    }
    this.ticketParaAsignar = ticket;
    this.asesorSeleccionadoCedula = (ticket.tecnicoAsignado && 'cedulaU' in ticket.tecnicoAsignado)
      ? ticket.tecnicoAsignado.cedulaU
      : null;
    this.mensajeExitoAsignacion = null;
    this.errorAsignacion = null;
    this.mostrarModalAsignar = true;
    this.cargarAsesores();
    this.cdr.detectChanges();
  }

  cerrarModalAsignar(): void {
    this.mostrarModalAsignar = false;
    this.ticketParaAsignar = null;
    this.asesorSeleccionadoCedula = null;
    this.mensajeExitoAsignacion = null;
    this.errorAsignacion = null;
    this.cdr.detectChanges();
  }

  cargarAsesores(): void {
    this.cargandoAsesores = true;
    this.errorAsignacion = null;
    this.ticketService.listarAsesores().subscribe({
      next: (data) => {
        this.asesores = data || [];
        this.cargandoAsesores = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar asesores:', err);
        this.errorAsignacion = 'No se pudo consultar la lista de asesores.';
        this.cargandoAsesores = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarAsesor(cedula: number): void {
    this.asesorSeleccionadoCedula = cedula;
    this.cdr.detectChanges();
  }

  confirmarAsignacion(): void {
    if (!this.ticketParaAsignar || !this.ticketParaAsignar.idTicket || !this.asesorSeleccionadoCedula) {
      return;
    }

    this.guardandoAsignacion = true;
    this.errorAsignacion = null;
    const idTicket = this.ticketParaAsignar.idTicket;
    const cedulaTecnico = this.asesorSeleccionadoCedula;

    this.ticketService.asignarTecnico(idTicket, cedulaTecnico).subscribe({
      next: (ticketActualizado) => {
        this.guardandoAsignacion = false;
        const asesor = this.asesores.find(a => a.cedulaU === cedulaTecnico);
        const nombreAsesor = asesor ? asesor.nombre : 'el asesor seleccionado';
        this.mensajeExitoAsignacion = `¡Asesor asignado con éxito a ${nombreAsesor}! Notificación enviada.`;

        // Actualizar en memoria el ticket asignado
        this.actualizarTicketEnListas(ticketActualizado);
        this.calcularKpis();

        setTimeout(() => {
          this.cerrarModalAsignar();
        }, 1300);
      },
      error: (err) => {
        this.guardandoAsignacion = false;
        console.error('Error al asignar técnico:', err);
        this.errorAsignacion = typeof err?.error === 'string'
          ? err.error
          : 'Error al asignar el asesor al ticket.';
        this.cdr.detectChanges();
      }
    });
  }

  private actualizarTicketEnListas(ticketActualizado: Ticket): void {
    const idxAll = this.tickets.findIndex(t => t.idTicket === ticketActualizado.idTicket);
    if (idxAll !== -1) {
      this.tickets[idxAll] = { ...this.tickets[idxAll], ...ticketActualizado };
    }
    const idxFiltrados = this.ticketsFiltrados.findIndex(t => t.idTicket === ticketActualizado.idTicket);
    if (idxFiltrados !== -1) {
      this.ticketsFiltrados[idxFiltrados] = { ...this.ticketsFiltrados[idxFiltrados], ...ticketActualizado };
    }
    this.ordenarTicketsPorFechaLimite(this.ticketsFiltrados);
    this.cdr.detectChanges();
  }

  getTecnicoNombre(ticket?: Ticket | null): string {
    if (!ticket || !ticket.tecnicoAsignado) return 'Sin asignar';
    if (typeof ticket.tecnicoAsignado === 'object') {
      if ('nombre' in ticket.tecnicoAsignado && ticket.tecnicoAsignado.nombre) {
        return ticket.tecnicoAsignado.nombre;
      }
      if ('cedulaU' in ticket.tecnicoAsignado && ticket.tecnicoAsignado.cedulaU) {
        return `Asesor (C.C. ${ticket.tecnicoAsignado.cedulaU})`;
      }
    }
    return 'Asignado';
  }

  cerrarSesion(): void {
    this.adminService.logoutAdmin();
    this.router.navigate(['/producto']);
  }

  // Clases CSS dinámicas para badges
  getEstadoClass(estado?: string): string {
    const e = (estado || '').toUpperCase();
    switch (e) {
      case 'RADICADO': return 'badge-radicado';
      case 'EN_ANALISIS': return 'badge-analisis';
      case 'EN_CAMPO': return 'badge-campo';
      case 'RESUELTO': return 'badge-resuelto';
      case 'CERRADO': return 'badge-cerrado';
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
