package com.HenoTrade.ventaHeno.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.HenoTrade.ventaHeno.Entity.*;
import com.HenoTrade.ventaHeno.Repository.*;
import com.HenoTrade.ventaHeno.dto.DashboardKpisDTO;
import com.HenoTrade.ventaHeno.dto.DashboardKpisDTO.*;

@Service
public class KpiService {

    @Autowired
    private TicketRepositorio ticketRepositorio;
    @Autowired
    private FacturaRepositorio facturaRepositorio;
    @Autowired
    private HenoRepositorio henoRepositorio;
    @Autowired
    private DetalleVentaRepositorio detalleVentaRepositorio;
    @Autowired
    private TipoHenoRepositorio tipoHenoRepositorio;
    @Autowired
    private PreguntasFrecuentesRepositorio preguntasFrecuentesRepositorio;

    private static final double UMBRAL_MAYORISTA = 1_000_000.0;
    private static final String[] MESES_CORTOS = {
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    };

    @Transactional(readOnly = true)
    public DashboardKpisDTO obtenerDashboardKpis(Integer anio, Integer mes, boolean soloSoporte) {
        LocalDateTime ahora = LocalDateTime.now();

        List<Ticket> todosTickets = ticketRepositorio.findAll();
        List<Ticket> tickets = filtrarTicketsPorPeriodo(todosTickets, anio, mes);

        long totalTickets = tickets.size();
        List<Ticket> resueltos = tickets.stream().filter(this::estaFinalizado).toList();
        List<Ticket> abiertos = tickets.stream().filter(t -> !estaFinalizado(t)).toList();

        long ticketsSinAsignar = abiertos.stream()
                .filter(t -> t.getTecnicoAsignado() == null)
                .count();

        long ticketsVencidosActivos = abiertos.stream()
                .filter(t -> t.getFechaLimite() != null && ahora.isAfter(t.getFechaLimite()))
                .count();

        long ticketsEnRiesgoActivos = abiertos.stream()
                .filter(t -> t.getFechaLimite() != null
                        && !ahora.isAfter(t.getFechaLimite())
                        && Duration.between(ahora, t.getFechaLimite()).toMinutes() <= 240)
                .count();

        // Cumplimiento SLA real por fechas (no depende de slaVencido desactualizado)
        List<Ticket> resueltosConLimite = resueltos.stream()
                .filter(t -> t.getFechaFin() != null && t.getFechaLimite() != null)
                .toList();
        long resueltosATiempo = resueltosConLimite.stream()
                .filter(t -> !t.getFechaFin().isAfter(t.getFechaLimite()))
                .count();
        double cumplimientoSla = resueltosConLimite.isEmpty() ? 100.0
                : redondear((resueltosATiempo * 100.0) / resueltosConLimite.size());

        double tasaResolucion = totalTickets == 0 ? 0.0
                : redondear((resueltos.size() * 100.0) / totalTickets);

        double mttrPromedio = calcularMttrHoras(resueltos);

        double puntajePromedio = tickets.isEmpty() ? 0.0
                : redondear(tickets.stream()
                        .mapToInt(t -> t.getPuntajePrioridad() != null ? t.getPuntajePrioridad() : 0)
                        .average().orElse(0.0));

        long conFactura = tickets.stream().filter(t -> t.getFactura() != null).count();
        long conEvidencia = tickets.stream()
                .filter(t -> t.getEvidenciaImg() != null && !t.getEvidenciaImg().trim().isEmpty())
                .count();

        double tasaTrazabilidad = totalTickets == 0 ? 0.0 : redondear((conFactura * 100.0) / totalTickets);
        double tasaEvidencia = totalTickets == 0 ? 0.0 : redondear((conEvidencia * 100.0) / totalTickets);

        // Distribuciones
        List<DistribucionItemDTO> porCategoria = agruparDistribucion(
                tickets, t -> normalizar(t.getCategoriaTicket(), "OTRAS"));
        List<DistribucionItemDTO> porEstado = agruparPorEstadosOficiales(tickets);

        // KPIs por Prioridad
        List<PrioridadKpiDTO> kpisPrioridad = calcularKpisPorPrioridad(tickets);

        // Rendimiento por Asesor
        List<AsesorKpiDTO> rendimientoAsesores = calcularRendimientoAsesores(tickets);

        // Cobertura FAQ vs Tickets
        List<FaqCoberturaDTO> coberturaFaq = calcularCoberturaFaq(tickets);

        DashboardKpisDTO.DashboardKpisDTOBuilder builder = DashboardKpisDTO.builder()
                .totalTickets(totalTickets)
                .ticketsAbiertos(abiertos.size())
                .ticketsResueltos(resueltos.size())
                .ticketsSinAsignar(ticketsSinAsignar)
                .ticketsVencidosActivos(ticketsVencidosActivos)
                .ticketsEnRiesgoActivos(ticketsEnRiesgoActivos)
                .cumplimientoSlaPorcentaje(cumplimientoSla)
                .tasaResolucionPorcentaje(tasaResolucion)
                .mttrHorasPromedio(mttrPromedio)
                .puntajePrioridadPromedio(puntajePromedio)
                .tasaTrazabilidadFacturaPorcentaje(tasaTrazabilidad)
                .tasaEvidenciaGraficaPorcentaje(tasaEvidencia)
                .ticketsPorCategoria(porCategoria)
                .ticketsPorEstado(porEstado)
                .kpisPorPrioridad(kpisPrioridad)
                .rendimientoAsesores(rendimientoAsesores)
                .coberturaFaq(coberturaFaq);

        // ===== BLOQUE EXCLUSIVO DE ADMIN =====
        if (!soloSoporte) {
            cargarKpisEjecutivos(builder, todosTickets, tickets, anio, mes);
        }

        return builder.build();
    }

    private void cargarKpisEjecutivos(
            DashboardKpisDTO.DashboardKpisDTOBuilder builder,
            List<Ticket> todosTickets,
            List<Ticket> ticketsFiltrados,
            Integer anio,
            Integer mes) {

        List<Factura> todasFacturas = facturaRepositorio.findAll();
        List<Factura> facturas = filtrarFacturasPorPeriodo(todasFacturas, anio, mes);

        long totalFacturas = facturas.size();
        double ingresosTotales = redondear(facturas.stream()
                .mapToDouble(f -> f.getTotalVenta() != null ? f.getTotalVenta() : 0.0)
                .sum());
        double ticketPromedio = totalFacturas == 0 ? 0.0 : redondear(ingresosTotales / totalFacturas);

        // Facturas distintas con al menos un ticket
        Set<Long> facturasConTicket = ticketsFiltrados.stream()
                .filter(t -> t.getFactura() != null && t.getFactura().getIdFactura() != null)
                .map(t -> t.getFactura().getIdFactura())
                .collect(Collectors.toSet());

        double tasaReclamosVentas = totalFacturas == 0 ? 0.0
                : redondear((facturasConTicket.size() * 100.0) / totalFacturas);

        // Ingresos en riesgo: suma de facturas con ticket abierto o de
        // calidad/facturación
        Set<Long> idsFacturasEnRiesgo = ticketsFiltrados.stream()
                .filter(t -> t.getFactura() != null && t.getFactura().getIdFactura() != null)
                .filter(t -> !estaFinalizado(t)
                        || "CALIDAD_FORRAJE".equalsIgnoreCase(t.getCategoriaTicket())
                        || "FACTURACION".equalsIgnoreCase(t.getCategoriaTicket()))
                .map(t -> t.getFactura().getIdFactura())
                .collect(Collectors.toSet());

        Map<Long, Factura> mapaFacturas = todasFacturas.stream()
                .collect(Collectors.toMap(Factura::getIdFactura, f -> f, (a, b) -> a));

        double ingresosEnRiesgo = redondear(idsFacturasEnRiesgo.stream()
                .map(mapaFacturas::get)
                .filter(Objects::nonNull)
                .mapToDouble(f -> f.getTotalVenta() != null ? f.getTotalVenta() : 0.0)
                .sum());

        // Mix Mayorista (B2B) vs Minorista (B2C)
        long factMay = 0, factMin = 0;
        double ingMay = 0.0, ingMin = 0.0;
        for (Factura f : facturas) {
            double v = f.getTotalVenta() != null ? f.getTotalVenta() : 0.0;
            if (v >= UMBRAL_MAYORISTA) {
                factMay++;
                ingMay += v;
            } else {
                factMin++;
                ingMin += v;
            }
        }

        // Recurrencia de clientes (clientes con >1 compra)
        Map<String, Long> comprasPorCliente = facturas.stream()
                .filter(f -> f.getCedulaC() != null && !f.getCedulaC().trim().isEmpty())
                .collect(Collectors.groupingBy(f -> f.getCedulaC().trim(), Collectors.counting()));
        long clientesRecurrentes = comprasPorCliente.values().stream().filter(c -> c > 1).count();
        double tasaRecurrencia = comprasPorCliente.isEmpty() ? 0.0
                : redondear((clientesRecurrentes * 100.0) / comprasPorCliente.size());

        // Salud de Inventario
        List<Heno> henos = henoRepositorio.findAll();
        long totalHenos = henos.size();
        long agotados = henos.stream()
                .filter(h -> Boolean.FALSE.equals(h.getActivo()) || (h.getStock() != null && h.getStock() <= 0))
                .count();
        double valorInventario = redondear(henos.stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()) && h.getStock() != null && h.getPrecioU() != null)
                .mapToDouble(h -> h.getStock() * h.getPrecioU())
                .sum());

        // Evolución últimos 6 meses (Ventas vs Tickets)
        List<EvolucionMensualDTO> evolucion = calcularEvolucion6Meses(todasFacturas, todosTickets);

        // Ranking de fallas por Tipo de Heno y por Especie Animal (solo detalles de facturas con ticket)
        Map<String, Long> fallasHenoMap = new HashMap<>();
        Map<String, Long> fallasAnimalMap = new HashMap<>();

        if (!facturasConTicket.isEmpty()) {
            List<DetalleVenta> detalles = detalleVentaRepositorio
                    .findByFacturaIdFacturaIn(new ArrayList<>(facturasConTicket));
            if (!detalles.isEmpty()) {
                Map<Long, List<String>> henoAAnimales = new HashMap<>();
                for (Tipo_Heno th : tipoHenoRepositorio.findAll()) {
                    if (th.getHeno() != null && th.getAnimales() != null) {
                        henoAAnimales.computeIfAbsent(th.getHeno().getIdHeno(), k -> new ArrayList<>())
                                .add(th.getAnimales().getNombre());
                    }
                }

                for (DetalleVenta dv : detalles) {
                    if (dv.getHeno() != null) {
                        String nomHeno = dv.getHeno().getNombre() != null ? dv.getHeno().getNombre() : "Sin nombre";
                        fallasHenoMap.merge(nomHeno, 1L, Long::sum);

                        List<String> animales = henoAAnimales.getOrDefault(dv.getHeno().getIdHeno(), List.of("General"));
                        for (String animal : animales) {
                            fallasAnimalMap.merge(animal, 1L, Long::sum);
                        }
                    }
                }
            }
        }

        builder.totalFacturas(totalFacturas)
                .ingresosTotales(ingresosTotales)
                .ticketPromedioVenta(ticketPromedio)
                .tasaReclamosSobreVentasPorcentaje(tasaReclamosVentas)
                .ingresosEnRiesgo(ingresosEnRiesgo)
                .facturasMayoristas(factMay)
                .facturasMinoristas(factMin)
                .ingresosMayoristas(redondear(ingMay))
                .ingresosMinoristas(redondear(ingMin))
                .tasaRecurrenciaClientesPorcentaje(tasaRecurrencia)
                .totalProductosHeno(totalHenos)
                .productosAgotados(agotados)
                .valorTotalInventario(valorInventario)
                .evolucionMensual(evolucion)
                .fallasPorTipoHeno(mapaADistribucion(fallasHenoMap))
                .fallasPorAnimal(mapaADistribucion(fallasAnimalMap));
    }

    private List<PrioridadKpiDTO> calcularKpisPorPrioridad(List<Ticket> tickets) {
        Map<String, Integer> metas = new LinkedHashMap<>();
        metas.put("CRITICA", 24);
        metas.put("ALTA", 48);
        metas.put("MEDIA", 96);
        metas.put("BAJA", 168);

        List<PrioridadKpiDTO> lista = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : metas.entrySet()) {
            String prio = entry.getKey();
            List<Ticket> grupo = tickets.stream()
                    .filter(t -> prio.equalsIgnoreCase(t.getPrioridad()))
                    .toList();
            List<Ticket> res = grupo.stream().filter(this::estaFinalizado).toList();
            List<Ticket> conLim = res.stream()
                    .filter(t -> t.getFechaFin() != null && t.getFechaLimite() != null).toList();
            long aTiempo = conLim.stream().filter(t -> !t.getFechaFin().isAfter(t.getFechaLimite())).count();

            lista.add(PrioridadKpiDTO.builder()
                    .prioridad(prio)
                    .total(grupo.size())
                    .abiertos(grupo.size() - res.size())
                    .resueltos(res.size())
                    .mttrHoras(calcularMttrHoras(res))
                    .metaSlaHoras(entry.getValue())
                    .cumplimientoSlaPorcentaje(conLim.isEmpty() ? 100.0 : redondear((aTiempo * 100.0) / conLim.size()))
                    .build());
        }
        return lista;
    }

    private List<AsesorKpiDTO> calcularRendimientoAsesores(List<Ticket> tickets) {
        Map<Long, List<Ticket>> porAsesor = tickets.stream()
                .filter(t -> t.getTecnicoAsignado() != null && t.getTecnicoAsignado().getCedulaU() != null)
                .collect(Collectors.groupingBy(t -> t.getTecnicoAsignado().getCedulaU()));

        return porAsesor.entrySet().stream().map(e -> {
            List<Ticket> lista = e.getValue();
            Usuario u = lista.get(0).getTecnicoAsignado();
            List<Ticket> res = lista.stream().filter(this::estaFinalizado).toList();
            List<Ticket> conLim = res.stream()
                    .filter(t -> t.getFechaFin() != null && t.getFechaLimite() != null).toList();
            long aTiempo = conLim.stream().filter(t -> !t.getFechaFin().isAfter(t.getFechaLimite())).count();

            return AsesorKpiDTO.builder()
                    .cedula(e.getKey())
                    .nombre(u.getNombre() != null ? u.getNombre() : "Asesor " + e.getKey())
                    .asignadosActivos(lista.size() - res.size())
                    .resueltos(res.size())
                    .mttrHoras(calcularMttrHoras(res))
                    .cumplimientoSlaPorcentaje(conLim.isEmpty() ? 100.0 : redondear((aTiempo * 100.0) / conLim.size()))
                    .build();
        }).sorted(Comparator.comparingLong(AsesorKpiDTO::getResueltos).reversed()).toList();
    }

    private List<FaqCoberturaDTO> calcularCoberturaFaq(List<Ticket> tickets) {
        Map<String, Long> ticketsPorCat = tickets.stream()
                .collect(Collectors.groupingBy(
                        t -> normalizar(t.getCategoriaTicket(), "SOPORTE_WEB"),
                        Collectors.counting()));

        Map<String, Long> faqsPorCat = preguntasFrecuentesRepositorio.findByActivoTrue().stream()
                .collect(Collectors.groupingBy(p -> {
                    String cat = normalizar(p.getCategoria(), "SOPORTE_WEB");
                    return "GENERAL".equals(cat) ? "SOPORTE_WEB" : cat;
                }, Collectors.counting()));

        Set<String> todasCats = new LinkedHashSet<>();
        todasCats.addAll(List.of("CALIDAD_FORRAJE", "LOGISTICA", "FACTURACION", "SOPORTE_WEB"));
        todasCats.addAll(ticketsPorCat.keySet());
        todasCats.addAll(faqsPorCat.keySet());

        return todasCats.stream().map(cat -> FaqCoberturaDTO.builder()
                .categoria(cat)
                .faqsActivas(faqsPorCat.getOrDefault(cat, 0L))
                .ticketsEnCategoria(ticketsPorCat.getOrDefault(cat, 0L))
                .build()).toList();
    }

    private List<EvolucionMensualDTO> calcularEvolucion6Meses(List<Factura> facturas, List<Ticket> tickets) {
        YearMonth actual = YearMonth.now();
        YearMonth inicio = actual.minusMonths(5);

        Map<YearMonth, Long> factPorMes = new HashMap<>();
        Map<YearMonth, Double> ingPorMes = new HashMap<>();
        for (Factura f : facturas) {
            if (f.getFechaFactura() != null) {
                YearMonth ym = YearMonth.from(f.getFechaFactura().toLocalDate());
                if (!ym.isBefore(inicio) && !ym.isAfter(actual)) {
                    factPorMes.merge(ym, 1L, Long::sum);
                    ingPorMes.merge(ym, f.getTotalVenta() != null ? f.getTotalVenta() : 0.0, Double::sum);
                }
            }
        }

        Map<YearMonth, Long> tktPorMes = new HashMap<>();
        for (Ticket t : tickets) {
            if (t.getFechaInicio() != null) {
                YearMonth ym = YearMonth.from(t.getFechaInicio());
                if (!ym.isBefore(inicio) && !ym.isAfter(actual)) {
                    tktPorMes.merge(ym, 1L, Long::sum);
                }
            }
        }

        List<EvolucionMensualDTO> resultado = new ArrayList<>(6);
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = actual.minusMonths(i);
            String etiqueta = MESES_CORTOS[ym.getMonthValue() - 1] + " " + String.valueOf(ym.getYear()).substring(2);
            resultado.add(EvolucionMensualDTO.builder()
                    .periodo(ym.toString())
                    .etiquetaMes(etiqueta)
                    .totalFacturas(factPorMes.getOrDefault(ym, 0L))
                    .ingresos(redondear(ingPorMes.getOrDefault(ym, 0.0)))
                    .totalTickets(tktPorMes.getOrDefault(ym, 0L))
                    .build());
        }
        return resultado;
    }

    // ===== UTILIDADES =====
    private String normalizarEstadoTicket(String estado) {
        String e = normalizar(estado, "RADICADO");
        if ("RESUELTO".equals(e) || "CERRADO".equals(e)) {
            return "RESUELTO";
        }
        if ("EN_ANALISIS".equals(e) || "EN_CAMPO".equals(e)) {
            return "EN_ANALISIS";
        }
        return "RADICADO";
    }

    private List<DistribucionItemDTO> agruparPorEstadosOficiales(List<Ticket> tickets) {
        Map<String, Long> conteo = new LinkedHashMap<>();
        conteo.put("RADICADO", 0L);
        conteo.put("EN_ANALISIS", 0L);
        conteo.put("RESUELTO", 0L);

        for (Ticket t : tickets) {
            String estado = normalizarEstadoTicket(t.getEstadoTicket());
            conteo.merge(estado, 1L, Long::sum);
        }

        long total = tickets.size();
        return conteo.entrySet().stream()
                .map(e -> DistribucionItemDTO.builder()
                        .etiqueta(e.getKey())
                        .cantidad(e.getValue())
                        .porcentaje(total == 0 ? 0.0 : redondear((e.getValue() * 100.0) / total))
                        .build())
                .toList();
    }

    private boolean estaFinalizado(Ticket t) {
        return "RESUELTO".equals(normalizarEstadoTicket(t.getEstadoTicket()));
    }

    private double calcularMttrHoras(List<Ticket> resueltos) {
        List<Double> horas = resueltos.stream()
                .filter(t -> t.getFechaInicio() != null && t.getFechaFin() != null)
                .map(t -> Math.max(0.0, Duration.between(t.getFechaInicio(), t.getFechaFin()).toMinutes() / 60.0))
                .toList();
        return horas.isEmpty() ? 0.0 : redondear(horas.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
    }

    private List<Ticket> filtrarTicketsPorPeriodo(List<Ticket> lista, Integer anio, Integer mes) {
        return lista.stream().filter(t -> {
            if (anio == null)
                return true;
            if (t.getFechaInicio() == null)
                return false;
            boolean okAnio = t.getFechaInicio().getYear() == anio;
            boolean okMes = (mes == null) || t.getFechaInicio().getMonthValue() == mes;
            return okAnio && okMes;
        }).toList();
    }

    private List<Factura> filtrarFacturasPorPeriodo(List<Factura> lista, Integer anio, Integer mes) {
        return lista.stream().filter(f -> {
            if (anio == null)
                return true;
            if (f.getFechaFactura() == null)
                return false;
            LocalDate ld = f.getFechaFactura().toLocalDate();
            boolean okAnio = ld.getYear() == anio;
            boolean okMes = (mes == null) || ld.getMonthValue() == mes;
            return okAnio && okMes;
        }).toList();
    }

    private List<DistribucionItemDTO> agruparDistribucion(
            List<Ticket> tickets, java.util.function.Function<Ticket, String> extractor) {
        Map<String, Long> mapa = tickets.stream()
                .collect(Collectors.groupingBy(extractor, Collectors.counting()));
        return mapaADistribucion(mapa);
    }

    private List<DistribucionItemDTO> mapaADistribucion(Map<String, Long> mapa) {
        long total = mapa.values().stream().mapToLong(Long::longValue).sum();
        return mapa.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> DistribucionItemDTO.builder()
                        .etiqueta(e.getKey())
                        .cantidad(e.getValue())
                        .porcentaje(total == 0 ? 0.0 : redondear((e.getValue() * 100.0) / total))
                        .build())
                .toList();
    }

    private String normalizar(String val, String defecto) {
        return (val == null || val.trim().isEmpty()) ? defecto : val.trim().toUpperCase();
    }

    private double redondear(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}