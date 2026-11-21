import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KpiService } from '../../services/kpi.service';
import { AdminService } from '../../services/admin.service';
import { DashboardKpis, DistribucionItem } from '../../models/kpi-dashboard.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SegmentoDonut {
    etiqueta: string;
    cantidad: number;
    porcentaje: number;
    color: string;
    dashArray: string;
    dashOffset: number;
}

@Component({
    selector: 'app-dashboard-kpis',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard-kpis.component.html',
    styleUrls: ['./dashboard-kpis.component.css']
})
export class DashboardKpisComponent implements OnInit {
    private kpiService = inject(KpiService);
    private adminService = inject(AdminService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    kpis: DashboardKpis | null = null;
    cargando = true;
    error: string | null = null;

    // Filtro de periodo (vacío = histórico completo)
    mesSeleccionado: string = ''; // formato YYYY-MM
    vistaActiva: 'SOPORTE' | 'EJECUTIVO' = 'SOPORTE';

    // Paleta oficial AgroHeno para gráficos (3 estados oficiales)
    readonly paletaCategorias = ['#036c39', '#cca243', '#8c5a15', '#351903', '#2f855a', '#b7791f'];
    readonly paletaEstados: Record<string, string> = {
        RADICADO: '#cca243',
        EN_ANALISIS: '#8c5a15',
        RESUELTO: '#036c39'
    };

    segmentosCategoria: SegmentoDonut[] = [];
    segmentosMixVentas: SegmentoDonut[] = [];

    get esAdmin(): boolean {
        return this.adminService.isAdminLoggedIn();
    }

    ngOnInit(): void {
        if (!this.adminService.isGestorTicketsLoggedIn()) {
            this.router.navigate(['/producto']);
            return;
        }
        this.cargarKpis();
    }

    cargarKpis(): void {
        this.cargando = true;
        this.error = null;

        let anio: number | null = null;
        let mes: number | null = null;
        if (this.mesSeleccionado && this.mesSeleccionado.includes('-')) {
            const [a, m] = this.mesSeleccionado.split('-').map(Number);
            anio = a;
            mes = m;
        }

        // Si no es admin, solo pide soporte por seguridad
        const soloSoporte = !this.esAdmin;

        this.kpiService.obtenerKpis(soloSoporte, anio, mes).subscribe({
            next: (data) => {
                this.kpis = data;
                this.construirGraficos();
                this.cargando = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error cargando KPIs:', err);
                this.error = 'No se pudieron consultar los indicadores KPI desde el servidor.';
                this.cargando = false;
                this.cdr.detectChanges();
            }
        });
    }

    limpiarPeriodo(): void {
        this.mesSeleccionado = '';
        this.cargarKpis();
    }

    cambiarVista(vista: 'SOPORTE' | 'EJECUTIVO'): void {
        if (vista === 'EJECUTIVO' && !this.esAdmin) return;
        this.vistaActiva = vista;
    }

    private construirGraficos(): void {
        if (!this.kpis) return;
        this.segmentosCategoria = this.crearSegmentosDonut(
            this.kpis.ticketsPorCategoria || [],
            this.paletaCategorias
        );

        if (this.esAdmin) {
            const ingMay = this.kpis.ingresosMayoristas || 0;
            const ingMin = this.kpis.ingresosMinoristas || 0;
            const total = ingMay + ingMin;
            const itemsMix: DistribucionItem[] = [
                {
                    etiqueta: 'Mayoristas (B2B ≥ $1M)',
                    cantidad: Math.round(ingMay),
                    porcentaje: total > 0 ? Math.round((ingMay * 1000) / total) / 10 : 0
                },
                {
                    etiqueta: 'Minoristas (B2C)',
                    cantidad: Math.round(ingMin),
                    porcentaje: total > 0 ? Math.round((ingMin * 1000) / total) / 10 : 0
                }
            ];
            this.segmentosMixVentas = this.crearSegmentosDonut(itemsMix, ['#036c39', '#cca243']);
        }
    }

    private crearSegmentosDonut(items: DistribucionItem[], colores: string[]): SegmentoDonut[] {
        const radio = 62;
        const circunferencia = 2 * Math.PI * radio;
        let acumulado = 0;

        return items.map((item, i) => {
            const fraccion = Math.max(0, Math.min(100, item.porcentaje)) / 100;
            const longitud = fraccion * circunferencia;
            const offset = -acumulado;
            acumulado += longitud;

            return {
                etiqueta: this.formatearEtiqueta(item.etiqueta),
                cantidad: item.cantidad,
                porcentaje: item.porcentaje,
                color: colores[i % colores.length],
                dashArray: `${longitud} ${circunferencia}`,
                dashOffset: offset
            };
        });
    }

    // Helpers visuales para barras SVG / CSS
    getGaugeOffset(porcentaje: number): number {
        const radio = 54;
        const semiCircunferencia = Math.PI * radio;
        const clamped = Math.max(0, Math.min(100, porcentaje || 0));
        return semiCircunferencia * (1 - clamped / 100);
    }

    getMaxIngresosMensual(): number {
        if (!this.kpis?.evolucionMensual?.length) return 1;
        return Math.max(...this.kpis.evolucionMensual.map(e => e.ingresos || 0), 1);
    }

    getMaxTicketsMensual(): number {
        if (!this.kpis?.evolucionMensual?.length) return 1;
        return Math.max(...this.kpis.evolucionMensual.map(e => e.totalTickets || 0), 1);
    }

    getMaxFaqOTickets(): number {
        if (!this.kpis?.coberturaFaq?.length) return 1;
        return Math.max(
            ...this.kpis.coberturaFaq.map(c => Math.max(c.faqsActivas, c.ticketsEnCategoria)),
            1
        );
    }

    getPorcentajeBarra(valor: number, maximo: number): number {
        if (!maximo || maximo <= 0) return 0;
        return Math.min(100, Math.round((valor / maximo) * 100));
    }

    formatearEtiqueta(texto: string): string {
        if (!texto) return 'General';
        const upper = texto.toUpperCase();
        if (upper === 'RADICADO') return 'Radicado';
        if (upper === 'EN_ANALISIS') return 'En Análisis';
        if (upper === 'RESUELTO') return 'Resuelto';
        if (upper === 'FACTURACION') return 'Facturación';
        if (upper === 'LOGISTICA') return 'Logística';
        if (upper === 'CALIDAD_FORRAJE') return 'Calidad Forraje';
        if (upper === 'SOPORTE_WEB') return 'Soporte Web';
        return texto
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    getColorPrioridad(prio: string): string {
        switch ((prio || '').toUpperCase()) {
            case 'CRITICA': return '#e53e3e';
            case 'ALTA': return '#d97706';
            case 'MEDIA': return '#cca243';
            default: return '#036c39';
        }
    }

    getColorEstado(estado: string): string {
        return this.paletaEstados[(estado || '').toUpperCase()] || '#8c5a15';
    }

    exportarPdf(): void {
        if (!this.kpis) return;
        const doc = new jsPDF();
        doc.setFillColor(53, 25, 3);
        doc.rect(0, 0, 210, 26, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('AgroHeno - Reporte de KPIs y Desempeño', 14, 13);
        doc.setFontSize(9);
        doc.setTextColor(204, 162, 67);
        const periodoTxt = this.mesSeleccionado ? `Periodo: ${this.mesSeleccionado}` : 'Periodo: Histórico completo';
        doc.text(`${periodoTxt}  |  Perfil: ${this.esAdmin ? 'Administrador' : 'Gestor de Tickets'}`, 14, 21);

        const filasSoporte = [
            ['Total Tickets', String(this.kpis.totalTickets)],
            ['Cumplimiento SLA (%)', `${this.kpis.cumplimientoSlaPorcentaje}% (Meta >= 95%)`],
            ['MTTR Promedio (Horas)', `${this.kpis.mttrHorasPromedio} h`],
            ['Tickets Vencidos Activos', String(this.kpis.ticketsVencidosActivos)],
            ['Backlog Sin Asignar', String(this.kpis.ticketsSinAsignar)],
            ['Tasa de Resolución', `${this.kpis.tasaResolucionPorcentaje}%`],
            ['Trazabilidad con Factura', `${this.kpis.tasaTrazabilidadFacturaPorcentaje}%`]
        ];

        if (this.esAdmin) {
            filasSoporte.push(
                ['Ingresos Totales', `$${(this.kpis.ingresosTotales || 0).toLocaleString('es-CO')}`],
                ['Tasa Reclamos sobre Ventas', `${this.kpis.tasaReclamosSobreVentasPorcentaje || 0}% (Meta < 5%)`],
                ['Ingresos en Riesgo', `$${(this.kpis.ingresosEnRiesgo || 0).toLocaleString('es-CO')}`],
                ['Recurrencia de Clientes', `${this.kpis.tasaRecurrenciaClientesPorcentaje || 0}%`],
                ['Productos Agotados', `${this.kpis.productosAgotados || 0} / ${this.kpis.totalProductosHeno || 0}`]
            );
        }

        autoTable(doc, {
            startY: 34,
            head: [['Indicador KPI', 'Resultado Actual']],
            body: filasSoporte,
            headStyles: { fillColor: [3, 108, 57] },
            alternateRowStyles: { fillColor: [247, 245, 240] }
        });

        doc.save(`AgroHeno_KPIs_${this.mesSeleccionado || 'historico'}.pdf`);
    }

    volver(): void {
        this.router.navigate([this.esAdmin ? '/admin' : '/gestion-tickets']);
    }

    cerrarSesion(): void {
        this.adminService.logoutAdmin();
        this.router.navigate(['/producto']);
    }
}