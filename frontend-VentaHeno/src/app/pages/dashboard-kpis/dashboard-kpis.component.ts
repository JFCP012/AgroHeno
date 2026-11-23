import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KpiService } from '../../services/kpi.service';
import { AdminService } from '../../services/admin.service';
import { PdfUtilsService } from '../../services/pdf-utils.service';
import { DashboardKpis, DistribucionItem, EvolucionMensual, PrioridadKpi } from '../../models/kpi-dashboard.model';
import jsPDF from 'jspdf';

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
    private pdfUtils = inject(PdfUtilsService);
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

    async exportarPdf(): Promise<void> {
        if (!this.kpis) return;
        const logo = await this.pdfUtils.obtenerLogo();
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 14;
        const contentW = pageW - margin * 2;

        // 1. Encabezado limpio con Logo de AgroHeno
        let textStartX = margin;
        if (logo.base64) {
            const logoH = 18;
            const logoW = logoH * logo.aspectRatio;
            doc.addImage(logo.base64, 'PNG', margin, 9, logoW, logoH);
            textStartX = margin + logoW + 5;
        }

        doc.setTextColor(3, 108, 57);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('AGROHENO', textStartX, 14);

        doc.setTextColor(26, 32, 44);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Reporte Ejecutivo de KPIs', textStartX, 20.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const periodoTxt = this.mesSeleccionado ? `Periodo: ${this.mesSeleccionado}` : 'Periodo: Histórico completo';
        const fechaGen = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
        doc.text(`${periodoTxt}   |   Perfil: ${this.esAdmin ? 'Administrador' : 'Gestor de Tickets'}   |   Generado: ${fechaGen}`, textStartX, 26);

        // Línea divisoria elegante dorada/verde
        doc.setDrawColor(204, 162, 67);
        doc.setLineWidth(0.8);
        doc.line(margin, 31, pageW - margin, 31);
        doc.setLineWidth(0.2);

        let y = 38;

        // 2. Tarjetas Resumen de Soporte & SLA (4 columnas)
        y = this.dibujarTituloSeccion(doc, margin, y, contentW, 'Indicadores Clave de Soporte y SLA');
        const cardGap = 4;
        const cardW = (contentW - cardGap * 3) / 4;
        const cardH = 22;

        this.dibujarTarjetaKpi(doc, margin, y, cardW, cardH, 'TOTAL TICKETS', String(this.kpis.totalTickets || 0), `${this.kpis.ticketsAbiertos || 0} activos`, [53, 25, 3]);
        const slaOk = (this.kpis.cumplimientoSlaPorcentaje || 0) >= 95;
        this.dibujarTarjetaKpi(doc, margin + (cardW + cardGap), y, cardW, cardH, 'CUMPLIMIENTO SLA', `${this.kpis.cumplimientoSlaPorcentaje || 0}%`, 'Meta >= 95%', slaOk ? [3, 108, 57] : [185, 28, 28]);
        this.dibujarTarjetaKpi(doc, margin + (cardW + cardGap) * 2, y, cardW, cardH, 'MTTR PROMEDIO', `${this.kpis.mttrHorasPromedio || 0} h`, 'Tiempo de resolución', [140, 90, 21]);
        this.dibujarTarjetaKpi(doc, margin + (cardW + cardGap) * 3, y, cardW, cardH, 'TASA RESOLUCIÓN', `${this.kpis.tasaResolucionPorcentaje || 0}%`, `${this.kpis.ticketsResueltos || 0} resueltos`, [3, 108, 57]);
        y += cardH + 6;

        // Tarjetas Ejecutivas si es Admin
        if (this.esAdmin) {
            y = this.dibujarTituloSeccion(doc, margin, y, contentW, 'Indicadores Financieros e Inventario');
            this.dibujarTarjetaKpi(doc, margin, y, cardW, cardH, 'INGRESOS TOTALES', `$${(this.kpis.ingresosTotales || 0).toLocaleString('es-CO')}`, `${this.kpis.totalFacturas || 0} facturas`, [3, 108, 57]);
            const reclamosOk = (this.kpis.tasaReclamosSobreVentasPorcentaje || 0) < 5;
            this.dibujarTarjetaKpi(doc, margin + (cardW + cardGap), y, cardW, cardH, 'RECLAMOS / VENTAS', `${this.kpis.tasaReclamosSobreVentasPorcentaje || 0}%`, 'Meta < 5%', reclamosOk ? [3, 108, 57] : [185, 28, 28]);
            this.dibujarTarjetaKpi(doc, margin + (cardW + cardGap) * 2, y, cardW, cardH, 'RECURRENCIA', `${this.kpis.tasaRecurrenciaClientesPorcentaje || 0}%`, 'Clientes frecuentes', [204, 162, 67]);
            this.dibujarTarjetaKpi(doc, margin + (cardW + cardGap) * 3, y, cardW, cardH, 'PRODUCTOS AGOTADOS', `${this.kpis.productosAgotados || 0} / ${this.kpis.totalProductosHeno || 0}`, 'Catálogo activo', [140, 90, 21]);
            y += cardH + 8;
        } else {
            y += 2;
        }

        // 3. Diagramas Lado a Lado: Donut de Categorías + Barras de Estado
        const halfW = (contentW - 6) / 2;
        const chartBoxH = 58;
        if (y + chartBoxH > 275) { doc.addPage(); y = 18; }

        const categorias = (this.kpis.ticketsPorCategoria || []).map((c, idx) => ({
            etiqueta: this.formatearEtiqueta(c.etiqueta),
            cantidad: c.cantidad,
            porcentaje: c.porcentaje,
            color: this.hexToRgb(this.paletaCategorias[idx % this.paletaCategorias.length])
        }));
        this.dibujarCajaGrafico(doc, margin, y, halfW, chartBoxH, 'Distribución por Categoría');
        this.dibujarGraficoDonut(doc, margin + 22, y + 33, 15, 8.5, categorias, this.kpis.totalTickets || 0, margin + 42, y + 18);

        const estados = (this.kpis.ticketsPorEstado || []).map(e => ({
            etiqueta: this.formatearEtiqueta(e.etiqueta),
            cantidad: e.cantidad,
            porcentaje: e.porcentaje,
            color: this.hexToRgb(this.getColorEstado(e.etiqueta))
        }));
        this.dibujarCajaGrafico(doc, margin + halfW + 6, y, halfW, chartBoxH, 'Tickets por Estado');
        this.dibujarBarrasHorizontales(doc, margin + halfW + 11, y + 16, halfW - 10, estados);

        y += chartBoxH + 8;

        // 4. Gráfico de Cumplimiento SLA por Prioridad
        const prioridades = this.kpis.kpisPorPrioridad || [];
        if (prioridades.length > 0) {
            const prioH = 18 + prioridades.length * 11;
            if (y + prioH > 275) { doc.addPage(); y = 18; }
            this.dibujarCajaGrafico(doc, margin, y, contentW, prioH, 'Cumplimiento SLA por Nivel de Prioridad');
            this.dibujarGraficoPrioridadSla(doc, margin + 6, y + 15, contentW - 12, prioridades);
            y += prioH + 8;
        }

        // 5. Evolución Mensual de Ingresos y Tickets (Solo Admin)
        const evolucion = this.kpis.evolucionMensual || [];
        if (this.esAdmin && evolucion.length > 0) {
            const evoH = 62;
            if (y + evoH > 275) { doc.addPage(); y = 18; }
            this.dibujarCajaGrafico(doc, margin, y, contentW, evoH, 'Evolución Mensual de Ingresos');
            this.dibujarGraficoBarrasVerticales(doc, margin + 10, y + 16, contentW - 20, evoH - 24, evolucion);
            y += evoH + 8;
        }

        // 6. Rendimiento por Asesor (Barras comparativas)
        const asesores = this.kpis.rendimientoAsesores || [];
        if (asesores.length > 0) {
            const asesorH = 18 + asesores.length * 11;
            if (y + asesorH > 275) { doc.addPage(); y = 18; }
            this.dibujarCajaGrafico(doc, margin, y, contentW, asesorH, 'Rendimiento del Equipo de Asesores');
            this.dibujarGraficoAsesores(doc, margin + 6, y + 15, contentW - 12, asesores);
            y += asesorH + 8;
        }

        // Pie de página en todas las páginas
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, 286, pageW - margin, 286);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(113, 128, 150);
            doc.text('AgroHeno · Sistema de Gestión Comercial y Soporte Postventa', margin, 291);
            doc.text(`Página ${i} de ${totalPages}`, pageW - margin, 291, { align: 'right' });
        }

        doc.save(`AgroHeno_KPIs_${this.mesSeleccionado || 'historico'}.pdf`);
    }

    private dibujarTituloSeccion(doc: jsPDF, x: number, y: number, w: number, titulo: string): number {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(53, 25, 3);
        doc.text(titulo, x, y);
        doc.setDrawColor(204, 162, 67);
        doc.setLineWidth(0.5);
        doc.line(x, y + 1.5, x + 36, y + 1.5);
        doc.setLineWidth(0.2);
        return y + 5;
    }

    private dibujarTarjetaKpi(
        doc: jsPDF, x: number, y: number, w: number, h: number,
        titulo: string, valor: string, subtitulo: string,
        color: [number, number, number]
    ): void {
        doc.setFillColor(250, 249, 246);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');

        // Acento superior de color
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y, w, 2, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(titulo, x + 3, y + 6.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(26, 32, 44);
        doc.text(valor, x + 3, y + 13.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(subtitulo, x + 3, y + 19);
    }

    private dibujarCajaGrafico(doc: jsPDF, x: number, y: number, w: number, h: number, titulo: string): void {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');

        doc.setFillColor(247, 245, 240);
        doc.roundedRect(x, y, w, 9, 3, 3, 'F');
        doc.rect(x, y + 5, w, 4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(53, 25, 3);
        doc.text(titulo, x + 4, y + 6.2);
    }

    private dibujarGraficoDonut(
        doc: jsPDF, cx: number, cy: number, rOuter: number, rInner: number,
        segmentos: { etiqueta: string; cantidad: number; porcentaje: number; color: [number, number, number] }[],
        total: number, legendX: number, legendY: number
    ): void {
        if (!segmentos.length || total <= 0) {
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(3);
            doc.circle(cx, cy, (rOuter + rInner) / 2, 'S');
            doc.setLineWidth(0.2);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Sin datos', cx, cy + 1, { align: 'center' });
            return;
        }

        let startAngle = -Math.PI / 2;
        for (const seg of segmentos) {
            if (seg.cantidad <= 0) continue;
            const sliceAngle = (seg.cantidad / total) * Math.PI * 2;
            const steps = Math.max(4, Math.ceil((sliceAngle * 180 / Math.PI) / 4));
            const stepAngle = sliceAngle / steps;
            doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);

            for (let i = 0; i < steps; i++) {
                const a1 = startAngle + i * stepAngle;
                const a2 = startAngle + (i + 1) * stepAngle;
                doc.triangle(
                    cx, cy,
                    cx + rOuter * Math.cos(a1), cy + rOuter * Math.sin(a1),
                    cx + rOuter * Math.cos(a2), cy + rOuter * Math.sin(a2),
                    'F'
                );
            }
            startAngle += sliceAngle;
        }

        // Centro blanco del donut
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, rInner, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 32, 44);
        doc.text(String(total), cx, cy + 0.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text('TOTAL', cx, cy + 4, { align: 'center' });

        // Leyenda a la derecha
        let ly = legendY;
        for (const seg of segmentos.slice(0, 5)) {
            doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
            doc.roundedRect(legendX, ly - 2.5, 3, 3, 0.6, 0.6, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(45, 55, 72);
            doc.text(`${seg.etiqueta}: ${seg.cantidad} (${seg.porcentaje}%)`, legendX + 4.5, ly);
            ly += 7.5;
        }
    }

    private dibujarBarrasHorizontales(
        doc: jsPDF, x: number, y: number, w: number,
        items: { etiqueta: string; cantidad: number; porcentaje: number; color: [number, number, number] }[]
    ): void {
        if (!items.length) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Sin datos disponibles', x, y + 10);
            return;
        }

        let cy = y;
        for (const item of items.slice(0, 4)) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(45, 55, 72);
            doc.text(item.etiqueta, x, cy);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`${item.cantidad} (${item.porcentaje}%)`, x + w, cy, { align: 'right' });

            // Fondo de barra
            doc.setFillColor(237, 242, 247);
            doc.roundedRect(x, cy + 1.8, w, 3.5, 1.5, 1.5, 'F');

            // Barra proporcional
            const fillW = Math.max(item.porcentaje > 0 ? 3 : 0, (w * Math.min(100, item.porcentaje)) / 100);
            if (fillW > 0) {
                doc.setFillColor(item.color[0], item.color[1], item.color[2]);
                doc.roundedRect(x, cy + 1.8, fillW, 3.5, 1.5, 1.5, 'F');
            }
            cy += 10.5;
        }
    }

    private dibujarGraficoPrioridadSla(doc: jsPDF, x: number, y: number, w: number, prioridades: PrioridadKpi[]): void {
        let cy = y;
        const labelW = 28;
        const barW = w - labelW - 42;

        for (const p of prioridades) {
            const color = this.hexToRgb(this.getColorPrioridad(p.prioridad));
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(p.prioridad, x, cy + 3);

            doc.setFillColor(237, 242, 247);
            doc.roundedRect(x + labelW, cy, barW, 4.2, 1.8, 1.8, 'F');

            const pct = Math.min(100, p.cumplimientoSlaPorcentaje || 0);
            const fillW = Math.max(pct > 0 ? 3 : 0, (barW * pct) / 100);
            if (fillW > 0) {
                doc.setFillColor(pct >= 95 ? 3 : color[0], pct >= 95 ? 108 : color[1], pct >= 95 ? 57 : color[2]);
                doc.roundedRect(x + labelW, cy, fillW, 4.2, 1.8, 1.8, 'F');
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(45, 55, 72);
            doc.text(`${pct}% SLA  |  ${p.total} tkts  |  ${p.mttrHoras}h`, x + labelW + barW + 3, cy + 3.2);
            cy += 10.5;
        }
    }

    private dibujarGraficoBarrasVerticales(doc: jsPDF, x: number, y: number, w: number, h: number, evolucion: EvolucionMensual[]): void {
        const items = evolucion.slice(-6);
        const maxVal = Math.max(...items.map(e => e.ingresos || 0), 1);
        const slotW = w / items.length;
        const barW = Math.min(18, slotW * 0.55);
        const baseLineY = y + h - 6;
        const maxBarH = h - 14;

        // Línea base del eje X
        doc.setDrawColor(203, 213, 225);
        doc.line(x, baseLineY, x + w, baseLineY);

        items.forEach((item, idx) => {
            const cx = x + slotW * idx + slotW / 2;
            const bx = cx - barW / 2;
            const val = item.ingresos || 0;
            const barH = Math.max(val > 0 ? 2 : 0, (val / maxVal) * maxBarH);

            if (barH > 0) {
                doc.setFillColor(3, 108, 57);
                doc.roundedRect(bx, baseLineY - barH, barW, barH, 1.2, 1.2, 'F');
            }

            // Valor arriba de la barra
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            doc.setTextColor(53, 25, 3);
            const labelVal = val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${Math.round(val / 1000)}k`;
            doc.text(val > 0 ? labelVal : '$0', cx, baseLineY - barH - 2, { align: 'center' });

            // Mes abajo
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(74, 85, 104);
            doc.text(item.etiquetaMes || item.periodo, cx, baseLineY + 4.5, { align: 'center' });
        });
    }

    private dibujarGraficoAsesores(doc: jsPDF, x: number, y: number, w: number, asesores: any[]): void {
        const maxTickets = Math.max(...asesores.map(a => (a.resueltos || 0) + (a.asignadosActivos || 0)), 1);
        let cy = y;
        const nameW = 46;
        const barW = w - nameW - 46;

        for (const a of asesores) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(26, 32, 44);
            const nombreCorto = (a.nombre || '').length > 22 ? a.nombre.slice(0, 21) + '…' : (a.nombre || '');
            doc.text(nombreCorto, x, cy + 3);

            doc.setFillColor(237, 242, 247);
            doc.roundedRect(x + nameW, cy, barW, 4.2, 1.5, 1.5, 'F');

            const resueltosW = (barW * (a.resueltos || 0)) / maxTickets;
            const activosW = (barW * (a.asignadosActivos || 0)) / maxTickets;

            if (resueltosW > 0) {
                doc.setFillColor(3, 108, 57);
                doc.roundedRect(x + nameW, cy, resueltosW, 4.2, 1.5, 1.5, 'F');
            }
            if (activosW > 0) {
                doc.setFillColor(204, 162, 67);
                doc.rect(x + nameW + resueltosW, cy, activosW, 4.2, 'F');
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.3);
            doc.setTextColor(74, 85, 104);
            doc.text(`${a.resueltos || 0} res / ${a.asignadosActivos || 0} act · ${a.cumplimientoSlaPorcentaje || 0}% SLA`, x + nameW + barW + 3, cy + 3.2);
            cy += 10.5;
        }
    }

    private hexToRgb(hex: string): [number, number, number] {
        const clean = (hex || '#036c39').replace('#', '');
        const num = parseInt(clean, 16);
        if (isNaN(num)) return [3, 108, 57];
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }

    volver(): void {
        this.router.navigate([this.esAdmin ? '/admin' : '/gestion-tickets']);
    }

    cerrarSesion(): void {
        this.adminService.logoutAdmin();
        this.router.navigate(['/producto']);
    }
}