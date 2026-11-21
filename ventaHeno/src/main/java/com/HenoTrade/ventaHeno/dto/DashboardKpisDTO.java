package com.HenoTrade.ventaHeno.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardKpisDTO {

    // ===== 1. KPIs DE SOPORTE Y SLA (Admin + Gestor Tickets) =====
    private long totalTickets;
    private long ticketsAbiertos;
    private long ticketsResueltos;
    private long ticketsSinAsignar;
    private long ticketsVencidosActivos;
    private long ticketsEnRiesgoActivos; // Faltan <= 4 horas para vencer
    private double cumplimientoSlaPorcentaje;
    private double tasaResolucionPorcentaje;
    private double mttrHorasPromedio;
    private double puntajePrioridadPromedio;
    private double tasaTrazabilidadFacturaPorcentaje;
    private double tasaEvidenciaGraficaPorcentaje;

    private List<DistribucionItemDTO> ticketsPorCategoria;
    private List<DistribucionItemDTO> ticketsPorEstado;
    private List<PrioridadKpiDTO> kpisPorPrioridad;
    private List<AsesorKpiDTO> rendimientoAsesores;
    private List<FaqCoberturaDTO> coberturaFaq;

    // ===== 2. KPIs EJECUTIVOS: VENTAS, RIESGO E INVENTARIO (Solo Admin) =====
    private Long totalFacturas;
    private Double ingresosTotales;
    private Double ticketPromedioVenta;
    private Double tasaReclamosSobreVentasPorcentaje;
    private Double ingresosEnRiesgo;
    private Long facturasMayoristas; // >= $1.000.000
    private Long facturasMinoristas;
    private Double ingresosMayoristas;
    private Double ingresosMinoristas;
    private Double tasaRecurrenciaClientesPorcentaje;
    private Long totalProductosHeno;
    private Long productosAgotados;
    private Double valorTotalInventario;

    private List<EvolucionMensualDTO> evolucionMensual;
    private List<DistribucionItemDTO> fallasPorTipoHeno;
    private List<DistribucionItemDTO> fallasPorAnimal;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DistribucionItemDTO {
        private String etiqueta;
        private long cantidad;
        private double porcentaje;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrioridadKpiDTO {
        private String prioridad; // CRITICA, ALTA, MEDIA, BAJA
        private long total;
        private long abiertos;
        private long resueltos;
        private double mttrHoras;
        private int metaSlaHoras;
        private double cumplimientoSlaPorcentaje;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AsesorKpiDTO {
        private Long cedula;
        private String nombre;
        private long asignadosActivos;
        private long resueltos;
        private double mttrHoras;
        private double cumplimientoSlaPorcentaje;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FaqCoberturaDTO {
        private String categoria;
        private long faqsActivas;
        private long ticketsEnCategoria;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EvolucionMensualDTO {
        private String periodo; // Ej: "2026-11"
        private String etiquetaMes; // Ej: "Nov 26"
        private long totalFacturas;
        private double ingresos;
        private long totalTickets;
    }
}