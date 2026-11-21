export interface DistribucionItem {
    etiqueta: string;
    cantidad: number;
    porcentaje: number;
}

export interface PrioridadKpi {
    prioridad: string;
    total: number;
    abiertos: number;
    resueltos: number;
    mttrHoras: number;
    metaSlaHoras: number;
    cumplimientoSlaPorcentaje: number;
}

export interface AsesorKpi {
    cedula: number;
    nombre: string;
    asignadosActivos: number;
    resueltos: number;
    mttrHoras: number;
    cumplimientoSlaPorcentaje: number;
}

export interface FaqCobertura {
    categoria: string;
    faqsActivas: number;
    ticketsEnCategoria: number;
}

export interface EvolucionMensual {
    periodo: string;
    etiquetaMes: string;
    totalFacturas: number;
    ingresos: number;
    totalTickets: number;
}

export interface DashboardKpis {
    totalTickets: number;
    ticketsAbiertos: number;
    ticketsResueltos: number;
    ticketsSinAsignar: number;
    ticketsVencidosActivos: number;
    ticketsEnRiesgoActivos: number;
    cumplimientoSlaPorcentaje: number;
    tasaResolucionPorcentaje: number;
    mttrHorasPromedio: number;
    puntajePrioridadPromedio: number;
    tasaTrazabilidadFacturaPorcentaje: number;
    tasaEvidenciaGraficaPorcentaje: number;

    ticketsPorCategoria: DistribucionItem[];
    ticketsPorEstado: DistribucionItem[];
    kpisPorPrioridad: PrioridadKpi[];
    rendimientoAsesores: AsesorKpi[];
    coberturaFaq: FaqCobertura[];

    // Solo Admin
    totalFacturas?: number;
    ingresosTotales?: number;
    ticketPromedioVenta?: number;
    tasaReclamosSobreVentasPorcentaje?: number;
    ingresosEnRiesgo?: number;
    facturasMayoristas?: number;
    facturasMinoristas?: number;
    ingresosMayoristas?: number;
    ingresosMinoristas?: number;
    tasaRecurrenciaClientesPorcentaje?: number;
    totalProductosHeno?: number;
    productosAgotados?: number;
    valorTotalInventario?: number;
    evolucionMensual?: EvolucionMensual[];
    fallasPorTipoHeno?: DistribucionItem[];
    fallasPorAnimal?: DistribucionItem[];
}