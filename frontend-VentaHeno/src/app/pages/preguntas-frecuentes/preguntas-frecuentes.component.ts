import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PreguntasFrecuentes } from '../../models/preguntasFrecuentes';
import { PreguntasFrecuentesService } from '../../services/preguntasFrecuentes.service';

interface CategoriaFaq {
  id: string;
  nombre: string;
  icon: string;
}

@Component({
  selector: 'app-preguntas-frecuentes-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preguntas-frecuentes.component.html',
  styleUrls: ['./preguntas-frecuentes.component.css']
})
export class PreguntasFrecuentesComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private faqService = inject(PreguntasFrecuentesService);
  private cdr = inject(ChangeDetectorRef);

  // Datos de preguntas
  preguntas: PreguntasFrecuentes[] = [];
  preguntasFiltradas: PreguntasFrecuentes[] = [];
  cargando: boolean = true;
  errorMsg: string = '';

  // Filtros
  categoriaSeleccionada: string = 'TODAS';
  busquedaTexto: string = '';
  preguntaExpandidaId: number | null = null;

  // Contexto de origen (si viene desde una factura o producto)
  idFactura: number | null = null;
  tipoHeno: string = '';
  cedula: string = '';

  categoriasDisponibles: CategoriaFaq[] = [
    { id: 'TODAS', nombre: 'Todas las Preguntas', icon: '📋' },
    { id: 'CALIDAD_FORRAJE', nombre: 'Calidad del Forraje', icon: '🌿' },
    { id: 'LOGISTICA', nombre: 'Logística y Entrega', icon: '🚚' },
    { id: 'FACTURACION', nombre: 'Facturación y Cobro', icon: '📄' },
    { id: 'SOPORTE_WEB', nombre: 'Soporte de Plataforma', icon: '💻' }
  ];

  ngOnInit(): void {
    // 1. Capturar parámetros de URL (si el cliente viene desde una factura en perfil-cliente)
    this.route.queryParams.subscribe(params => {
      const paramFactura = params['idFactura'];
      if (paramFactura && !isNaN(Number(paramFactura))) {
        this.idFactura = Number(paramFactura);
      }
      this.tipoHeno = params['heno'] || params['tipoHeno'] || '';
      this.cedula = params['cedula'] || '';

      // Si viene por un producto de forraje, preseleccionar calidad
      if (this.tipoHeno && this.categoriaSeleccionada === 'TODAS') {
        this.categoriaSeleccionada = 'CALIDAD_FORRAJE';
      }

      this.cargarPreguntasActivas();
    });
  }

  cargarPreguntasActivas(): void {
    this.cargando = true;
    this.errorMsg = '';

    // Consultamos únicamente preguntas ACTIVAS (activo = true)
    this.faqService.buscarPorFiltros(undefined, true).subscribe({
      next: (data) => {
        // Ordenamos por el campo orden ascendente
        this.preguntas = (data || []).sort((a, b) => (a.orden || 1) - (b.orden || 1));
        this.aplicarFiltros();
        // Si hay preguntas y vino con factura de producto, expandir la primera relevante
        if (this.preguntasFiltradas.length > 0) {
          this.preguntaExpandidaId = this.preguntasFiltradas[0].idPregunta || null;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = 'No pudimos cargar las preguntas frecuentes en este momento.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarCategoria(catId: string): void {
    this.categoriaSeleccionada = catId;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let resultado = [...this.preguntas];

    // Filtro por categoría
    if (this.categoriaSeleccionada !== 'TODAS') {
      resultado = resultado.filter(p => p.categoria === this.categoriaSeleccionada);
    }

    // Filtro por texto de búsqueda
    const q = this.busquedaTexto.toLowerCase().trim();
    if (q) {
      resultado = resultado.filter(p =>
        (p.pregunta && p.pregunta.toLowerCase().includes(q)) ||
        (p.respuesta && p.respuesta.toLowerCase().includes(q))
      );
    }

    this.preguntasFiltradas = resultado;
  }

  togglePregunta(id?: number): void {
    if (!id) return;
    this.preguntaExpandidaId = this.preguntaExpandidaId === id ? null : id;
  }

  isExpandida(id?: number): boolean {
    return !!id && this.preguntaExpandidaId === id;
  }

  getNombreCategoria(cat?: string): string {
    const encontrada = this.categoriasDisponibles.find(c => c.id === cat);
    return encontrada ? encontrada.nombre : (cat || 'General');
  }

  // Si las respuestas no le sirven, continúa al formulario de radicación
  continuarACrearTicket(): void {
    const queryParams: any = {};
    if (this.idFactura) {
      queryParams.idFactura = this.idFactura;
    }
    if (this.tipoHeno) {
      queryParams.heno = this.tipoHeno;
      queryParams.tipoHeno = this.tipoHeno;
    }
    if (this.cedula) {
      queryParams.cedula = this.cedula;
    }

    this.router.navigate(['/crearTicket'], { queryParams });
  }

  volver(): void {
    if (this.idFactura) {
      this.router.navigate(['/perfil-cliente']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
