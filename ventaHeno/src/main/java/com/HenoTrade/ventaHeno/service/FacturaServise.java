package com.HenoTrade.ventaHeno.service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.HenoTrade.ventaHeno.Entity.Cliente;
import com.HenoTrade.ventaHeno.Entity.DetalleVenta;
import com.HenoTrade.ventaHeno.Entity.Factura;
import com.HenoTrade.ventaHeno.Entity.Heno;
import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.Repository.ClienteRepositorio;
import com.HenoTrade.ventaHeno.Repository.DetalleVentaRepositorio;
import com.HenoTrade.ventaHeno.Repository.FacturaRepositorio;
import com.HenoTrade.ventaHeno.Repository.HenoRepositorio;
import com.HenoTrade.ventaHeno.Repository.UsuarioRepositorio;
import com.HenoTrade.ventaHeno.dto.CompraDTO;
import com.HenoTrade.ventaHeno.dto.DetalleVentaDTO;
import com.HenoTrade.ventaHeno.dto.FacturaReporteDTO;
import com.HenoTrade.ventaHeno.dto.ReporteVentaMensualDTO;
import com.HenoTrade.ventaHeno.dto.ReporteFacturasHenoDTO;
import com.HenoTrade.ventaHeno.dto.ReporteFacturasAnimalDTO;
import com.HenoTrade.ventaHeno.dto.ReporteVentaClienteDTO;
import com.HenoTrade.ventaHeno.dto.DetalleFacturaReporteDTO;

@Service
public class FacturaServise {

    @Autowired
    private FacturaRepositorio facturaRepositorio;

    @Autowired
    private DetalleVentaRepositorio detalleVentaRepositorio;

    @Autowired
    private HenoRepositorio henoRepositorio;

    @Autowired
    private UsuarioRepositorio usuarioRepositorio;

    @Autowired
    private ClienteRepositorio clienteRepositorio;

    public Factura guardarFactura(Factura factura) {
        return this.facturaRepositorio.save(factura);
    }

    @Transactional
    public Factura procesarCompra(CompraDTO compra) {
        // 1. Validaciones estructurales de la compra
        if (compra == null || compra.getFactura() == null) {
            throw new IllegalArgumentException("Los datos de la factura son obligatorios.");
        }
        if (compra.getDetalles() == null || compra.getDetalles().isEmpty()) {
            throw new IllegalArgumentException("El carrito no contiene productos. Agrega al menos un producto.");
        }

        Factura factura = compra.getFactura();

        // 2. Validaciones de datos obligatorios del cliente y montos (no dependientes de la cédula del usuario)
        if (factura.getNombreC() == null || factura.getNombreC().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del cliente es obligatorio.");
        }
        if (factura.getCedulaC() == null || factura.getCedulaC().trim().isEmpty()) {
            throw new IllegalArgumentException("La cédula del cliente es obligatoria.");
        }
        if (factura.getTelefonoC() == null || factura.getTelefonoC().trim().isEmpty()) {
            throw new IllegalArgumentException("El teléfono de contacto es obligatorio.");
        }
        if (factura.getDireccionC() == null || factura.getDireccionC().trim().isEmpty()) {
            throw new IllegalArgumentException("La dirección de entrega o recogida es obligatoria.");
        }
        if (factura.getTotalVenta() == null || factura.getTotalVenta() <= 0) {
            throw new IllegalArgumentException("El total de la venta debe ser mayor a 0.");
        }
        if (factura.getEnvio() < 0) {
            throw new IllegalArgumentException("El costo de envío no puede ser negativo.");
        }

        // 3. Asignación del Usuario únicamente mediante cedulaU (opcional, no bloquea la compra si no existe)
        if (factura.getUsuario() != null && factura.getUsuario().getCedulaU() != null) {
            Usuario usuario = usuarioRepositorio.findById(factura.getUsuario().getCedulaU()).orElse(null);
            factura.setUsuario(usuario);
        } else {
            factura.setUsuario(null);
        }

        // 4. Asignar Cliente si ya está registrado en el sistema
        if (factura.getCliente() != null && factura.getCliente().getCedula() != null) {
            Cliente cliente = clienteRepositorio.findById(factura.getCliente().getCedula()).orElse(null);
            factura.setCliente(cliente);
        }

        // 5. Validaciones previas de todos los productos en una sola consulta batch (sin N+1)
        List<Long> idsHeno = new ArrayList<>();
        for (DetalleVentaDTO detalleDTO : compra.getDetalles()) {
            if (detalleDTO.getIdHeno() == null) {
                throw new IllegalArgumentException("El ID del heno es obligatorio en los detalles del pedido.");
            }
            if (detalleDTO.getCantidad() == null || detalleDTO.getCantidad() <= 0) {
                throw new IllegalArgumentException("La cantidad solicitada debe ser mayor a cero.");
            }
            idsHeno.add(detalleDTO.getIdHeno());
        }

        Map<Long, Heno> henosPorId = henoRepositorio.findAllById(idsHeno).stream()
                .collect(Collectors.toMap(Heno::getIdHeno, h -> h));

        Map<Long, Heno> henosValidados = new HashMap<>();
        for (DetalleVentaDTO detalleDTO : compra.getDetalles()) {
            Heno henoValidado = henosPorId.get(detalleDTO.getIdHeno());
            if (henoValidado == null) {
                throw new IllegalArgumentException("No se encontró el heno con ID: " + detalleDTO.getIdHeno());
            }

            if (Boolean.FALSE.equals(henoValidado.getActivo()) || "Inactivo".equalsIgnoreCase(henoValidado.getEstado())) {
                throw new IllegalStateException("El producto '" + henoValidado.getNombre() + "' no se encuentra disponible para la venta.");
            }

            if (henoValidado.getStock() == null || henoValidado.getStock() <= 0) {
                throw new IllegalStateException("El producto '" + henoValidado.getNombre() + "' se encuentra agotado.");
            }

            if (henoValidado.getStock() < detalleDTO.getCantidad()) {
                throw new IllegalStateException("Stock insuficiente para '" + henoValidado.getNombre() + "'. Disponibles: "
                        + henoValidado.getStock() + " pacas, solicitaste: " + detalleDTO.getCantidad() + " pacas.");
            }

            henosValidados.put(detalleDTO.getIdHeno(), henoValidado);
        }

        // 6. Asignar fecha actual y guardar la factura
        factura.setFechaFactura(java.sql.Date.valueOf(java.time.LocalDate.now()));
        Factura facturaGuardada = facturaRepositorio.save(factura);

        // 7. Descontar stock y registrar los detalles de la venta en lote
        List<Heno> henosModificados = new ArrayList<>();
        List<DetalleVenta> detallesAGuardar = new ArrayList<>();
        for (DetalleVentaDTO detalleDTO : compra.getDetalles()) {
            Heno henoAComprar = henosValidados.get(detalleDTO.getIdHeno());

            int nuevoStock = henoAComprar.getStock() - detalleDTO.getCantidad();
            henoAComprar.setStock(nuevoStock);

            // Si el stock llega a 0, inactivar lógicamente
            if (nuevoStock == 0) {
                henoAComprar.setEstado("Inactivo");
                henoAComprar.setActivo(false);
            }
            henosModificados.add(henoAComprar);

            DetalleVenta detalle = new DetalleVenta();
            detalle.setFactura(facturaGuardada);
            detalle.setHeno(henoAComprar);
            detalle.setCantidad(detalleDTO.getCantidad());
            detallesAGuardar.add(detalle);
        }
        henoRepositorio.saveAll(henosModificados);
        detalleVentaRepositorio.saveAll(detallesAGuardar);

        return facturaGuardada;
    }

    private Map<Long, List<DetalleVenta>> obtenerDetallesPorFacturas(List<Factura> facturas) {
        if (facturas == null || facturas.isEmpty()) {
            return new HashMap<>();
        }
        List<Long> ids = facturas.stream().map(Factura::getIdFactura).collect(Collectors.toList());
        List<DetalleVenta> todosDetalles = detalleVentaRepositorio.findByFacturaIdFacturaIn(ids);
        return todosDetalles.stream().collect(Collectors.groupingBy(dv -> dv.getFactura().getIdFactura()));
    }

    private List<DetalleFacturaReporteDTO> mapearDetallesDTO(List<DetalleVenta> detalles) {
        if (detalles == null)
            return new ArrayList<>();
        return detalles.stream()
                .map(dv -> DetalleFacturaReporteDTO.builder()
                        .tipoHeno(dv.getHeno().getNombre())
                        .precioUnitario(dv.getHeno().getPrecioU())
                        .cantidad(dv.getCantidad())
                        .subtotal(dv.getHeno().getPrecioU() * dv.getCantidad())
                        .build())
                .collect(Collectors.toList());
    }

    private List<FacturaReporteDTO> mapearFacturasDTO(List<Factura> facturas, Map<Long, List<DetalleVenta>> detallesMap) {
        return facturas.stream()
                .map(f -> FacturaReporteDTO.builder()
                        .idFactura(f.getIdFactura())
                        .fechaFactura(f.getFechaFactura().toString())
                        .nombreCliente(f.getNombreC())
                        .cedulaCliente(f.getCedulaC())
                        .totalVenta(f.getTotalVenta())
                        .envio(f.getEnvio())
                        .detalles(mapearDetallesDTO(detallesMap.get(f.getIdFactura())))
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Genera un reporte de ventas filtrado por mes y año.
     * Consulta todas las facturas del período y calcula los totales.
     */
    @Transactional(readOnly = true)
    public ReporteVentaMensualDTO generarReportePorMes(int anio, int mes) {
        List<Factura> facturas = facturaRepositorio.findByAnioAndMes(anio, mes);
        Map<Long, List<DetalleVenta>> detallesMap = obtenerDetallesPorFacturas(facturas);
        List<FacturaReporteDTO> facturasDTO = mapearFacturasDTO(facturas, detallesMap);

        Double montoTotal = facturasDTO.stream()
                .mapToDouble(FacturaReporteDTO::getTotalVenta)
                .sum();

        return ReporteVentaMensualDTO.builder()
                .anio(anio)
                .mes(mes)
                .totalFacturas(facturasDTO.size())
                .montoTotal(montoTotal)
                .facturas(facturasDTO)
                .build();
    }

    /**
     * Genera un reporte de ventas detallado filtrado por el tipo de animal destino.
     */
    @Transactional(readOnly = true)
    public ReporteFacturasAnimalDTO generarReportePorAnimal(Long idAnimal, String nombreAnimal) {
        List<Factura> facturas = facturaRepositorio.findFacturasPorAnimalId(idAnimal);
        Map<Long, List<DetalleVenta>> detallesMap = obtenerDetallesPorFacturas(facturas);
        List<FacturaReporteDTO> facturasDTO = mapearFacturasDTO(facturas, detallesMap);

        Double montoTotal = facturasDTO.stream()
                .mapToDouble(FacturaReporteDTO::getTotalVenta)
                .sum();

        return ReporteFacturasAnimalDTO.builder()
                .idAnimal(idAnimal)
                .nombreAnimal(nombreAnimal)
                .totalFacturas(facturasDTO.size())
                .montoTotal(montoTotal)
                .facturas(facturasDTO)
                .build();
    }

    /**
     * Genera un reporte de ventas detallado filtrado por el nombre del heno.
     */
    @Transactional(readOnly = true)
    public ReporteFacturasHenoDTO generarReportePorHeno(String nombreHeno) {
        List<Factura> facturas = facturaRepositorio.findFacturasPorNombreHeno(nombreHeno);
        Map<Long, List<DetalleVenta>> detallesMap = obtenerDetallesPorFacturas(facturas);
        List<FacturaReporteDTO> facturasDTO = mapearFacturasDTO(facturas, detallesMap);

        String filtroLower = nombreHeno != null ? nombreHeno.toLowerCase() : "";
        Double montoTotal = facturasDTO.stream()
                .flatMap(f -> f.getDetalles().stream())
                .filter(d -> d.getTipoHeno().toLowerCase().contains(filtroLower))
                .mapToDouble(DetalleFacturaReporteDTO::getSubtotal)
                .sum();

        return ReporteFacturasHenoDTO.builder()
                .nombreHeno(nombreHeno)
                .totalFacturas(facturasDTO.size())
                .montoTotal(montoTotal)
                .facturas(facturasDTO)
                .build();
    }

    /**
     * Genera un reporte de ventas detallado filtrado por la cédula del cliente.
     */
    @Transactional(readOnly = true)
    public ReporteVentaClienteDTO generarReportePorCliente(String cedula) {
        Cliente cliente = clienteRepositorio.findByCedula(cedula).orElse(null);
        List<Factura> facturas = facturaRepositorio.findByCedulaC(cedula);
        Map<Long, List<DetalleVenta>> detallesMap = obtenerDetallesPorFacturas(facturas);
        List<FacturaReporteDTO> facturasDTO = mapearFacturasDTO(facturas, detallesMap);

        Double montoTotal = facturasDTO.stream()
                .mapToDouble(FacturaReporteDTO::getTotalVenta)
                .sum();

        int totalPacas = detallesMap.values().stream()
                .flatMap(List::stream)
                .mapToInt(DetalleVenta::getCantidad)
                .sum();

        return ReporteVentaClienteDTO.builder()
                .cliente(cliente)
                .totalFacturas(facturasDTO.size())
                .montoTotal(montoTotal)
                .totalPacas(totalPacas)
                .facturas(facturasDTO)
                .build();
    }
}
