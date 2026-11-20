import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PreguntasFrecuentesService } from '../../services/preguntasFrecuentes.service';
import { AdminService } from '../../services/admin.service';
import { PreguntasFrecuentes } from '../../models/preguntasFrecuentes';

@Component({
  selector: 'app-gestion-preguntas-frecuentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-preguntas-frecuentes.component.html',
  styleUrls: ['./gestion-preguntas-frecuentes.component.css']
})
export class GestionPreguntasFrecuentesComponent implements OnInit {
  private faqService = inject(PreguntasFrecuentesService);
  private adminService = inject(AdminService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  get esAdmin(): boolean {
    return this.adminService.isAdminLoggedIn();
  }

  volverAlPanel(): void {
    this.router.navigate(['/admin']);
  }

  preguntas: PreguntasFrecuentes[] = [];
  preguntasFiltradas: PreguntasFrecuentes[] = [];
  cargando: boolean = true;
  errorMsg: string = '';
  modalErrorMsg: string = '';
  successMsg: string = '';

  categoriaSeleccionada: string = 'TODAS';
  busquedaTexto: string = '';

  mostrarModalForm: boolean = false;
  esModoEdicion: boolean = false;
  guardando: boolean = false;

  preguntaForm: PreguntasFrecuentes = {
    pregunta: '',
    respuesta: '',
    categoria: 'CALIDAD_FORRAJE',
    orden: 1,
    activo: true
  };

  categoriasDisponibles: { id: string; nombre: string }[] = [
    { id: 'CALIDAD_FORRAJE', nombre: 'Calidad de Forraje' },
    { id: 'LOGISTICA', nombre: 'Logística y Envíos' },
    { id: 'FACTURACION', nombre: 'Facturación y Pagos' },
    { id: 'SOPORTE_WEB', nombre: 'Soporte de Plataforma' }
  ];

  ngOnInit(): void {
    this.cargarPreguntas();
  }

  cargarPreguntas(): void {
    this.cargando = true;
    this.errorMsg = '';
    this.faqService.listarTodas().subscribe({
      next: (data) => {
        this.preguntas = (data || []).sort((a, b) => (a.orden || 1) - (b.orden || 1));
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = 'Error al cargar las preguntas: ' + (err.error?.message || err.message);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  filtrarPorCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
    if (cat === 'TODAS') {
      this.cargarPreguntas();
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.faqService.buscarPorCategoria(cat).subscribe({
      next: (data) => {
        this.preguntas = (data || []).sort((a, b) => (a.orden || 1) - (b.orden || 1));
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = 'Error al filtrar: ' + (err.error?.message || err.message);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros(): void {
    const q = this.busquedaTexto.toLowerCase().trim();
    if (!q) {
      this.preguntasFiltradas = [...this.preguntas];
    } else {
      this.preguntasFiltradas = this.preguntas.filter(p =>
        p.pregunta?.toLowerCase().includes(q) ||
        p.respuesta?.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q)
      );
    }
  }

  abrirCrear(): void {
    this.esModoEdicion = false;
    this.preguntaForm = {
      pregunta: '',
      respuesta: '',
      categoria: this.categoriaSeleccionada !== 'TODAS' ? this.categoriaSeleccionada : 'CALIDAD_FORRAJE',
      orden: this.preguntas.length + 1,
      activo: true
    };
    this.mostrarModalForm = true;
    this.errorMsg = '';
    this.successMsg = '';
  }

  abrirEditar(id: number): void {
    this.cargando = true;
    this.faqService.buscarPorId(id).subscribe({
      next: (item) => {
        this.preguntaForm = { ...item };
        if (this.preguntaForm.categoria === 'GENERAL') {
          this.preguntaForm.categoria = 'SOPORTE_WEB';
        }
        this.esModoEdicion = true;
        this.mostrarModalForm = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = 'No se pudo obtener la pregunta: ' + (err.message || '');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarPregunta(): void {
    if (!this.preguntaForm.pregunta?.trim() || !this.preguntaForm.respuesta?.trim()) {
      this.modalErrorMsg = 'Por favor complete la pregunta y la respuesta.';
      this.cdr.detectChanges();
      return;
    }

    this.guardando = true;
    this.modalErrorMsg = '';
    this.errorMsg = '';
    this.successMsg = '';
    this.cdr.detectChanges();

    if (this.esModoEdicion && this.preguntaForm.idPregunta) {
      this.faqService.editar(this.preguntaForm.idPregunta, this.preguntaForm).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModalForm = false;
          this.mostrarNotificacionExito('Pregunta actualizada correctamente.');
          this.recargarListado();
        },
        error: (err) => {
          this.guardando = false;
          this.modalErrorMsg = 'Error al actualizar: ' + (err.error?.message || (err.status === 0 ? 'No se pudo conectar con el servidor backend (puerto 8080). Verifique que Spring Boot esté en ejecución.' : err.message));
          this.cdr.detectChanges();
        }
      });
    } else {
      this.faqService.crearPreguntasFrecuentes(this.preguntaForm).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarModalForm = false;
          this.mostrarNotificacionExito('Pregunta creada correctamente.');
          this.recargarListado();
        },
        error: (err) => {
          this.guardando = false;
          this.modalErrorMsg = 'Error al crear la pregunta: ' + (err.error?.message || (err.status === 0 ? 'No se pudo conectar con el servidor backend (puerto 8080). Verifique que Spring Boot esté en ejecución.' : err.message));
          this.cdr.detectChanges();
        }
      });
    }
  }

  desactivar(p: PreguntasFrecuentes): void {
    if (!p.idPregunta) return;
    const accion = p.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que deseas ${accion} esta pregunta?`)) return;

    if (p.activo) {
      this.faqService.desactivar(p.idPregunta).subscribe({
        next: (actualizada) => {
          p.activo = actualizada ? actualizada.activo : false;
          this.mostrarNotificacionExito('Pregunta desactivada.');
        },
        error: (err) => {
          this.errorMsg = 'Error al desactivar: ' + err.message;
        }
      });
    } else {
      const reactivada = { ...p, activo: true };
      this.faqService.editar(p.idPregunta, reactivada).subscribe({
        next: (res) => {
          p.activo = res.activo;
          this.mostrarNotificacionExito('Pregunta activada.');
        },
        error: (err) => {
          this.errorMsg = 'Error al activar: ' + err.message;
        }
      });
    }
  }

  private timeoutNotificacion: any = null;
  private mostrarNotificacionExito(mensaje: string, duracion: number = 900): void {
    if (this.timeoutNotificacion) {
      clearTimeout(this.timeoutNotificacion);
    }
    this.successMsg = mensaje;
    this.cdr.detectChanges();
    this.timeoutNotificacion = setTimeout(() => {
      this.successMsg = '';
      this.cdr.detectChanges();
    }, duracion);
  }

  cerrarModal(): void {
    this.mostrarModalForm = false;
  }

  recargarListado(): void {
    if (this.categoriaSeleccionada === 'TODAS') {
      this.cargarPreguntas();
    } else {
      this.filtrarPorCategoria(this.categoriaSeleccionada);
    }
  }

  getNombreCategoria(cat: string): string {
    if (cat === 'GENERAL' || cat === 'SOPORTE_WEB') {
      return 'Soporte de Plataforma';
    }
    const encontrada = this.categoriasDisponibles.find(c => c.id === cat);
    return encontrada ? encontrada.nombre : cat;
  }

  volver(): void {
    this.router.navigate(['/gestion-tickets']);
  }
}
