package com.HenoTrade.ventaHeno.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.HenoTrade.ventaHeno.Entity.Cliente;
import com.HenoTrade.ventaHeno.Entity.Factura;
import com.HenoTrade.ventaHeno.Entity.Ticket;
import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.Repository.ClienteRepositorio;
import com.HenoTrade.ventaHeno.Repository.FacturaRepositorio;
import com.HenoTrade.ventaHeno.Repository.TicketRepositorio;
import com.HenoTrade.ventaHeno.Repository.UsuarioRepositorio;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.transaction.Transactional;

@Service
public class TicketServise {

    @Autowired
    private TicketRepositorio ticketRepositorio;

    @Autowired
    private ClienteRepositorio clienteRepositorio;

    @Autowired
    private FacturaRepositorio facturaRepositorio;

    @Autowired
    private UsuarioRepositorio usuarioRepositorio;

    @Autowired
    private Cloudinary cloudinary;

    @Autowired
    private EmailService emailService;

    @Transactional
    public Ticket CrearTicket(String ticketJson, MultipartFile archivoImagen) throws IOException {
        LocalDateTime ahora = LocalDateTime.now();
        // 1. Convertir JSON a objeto Java
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        Ticket ticket = objectMapper.readValue(ticketJson, Ticket.class);

        // 1. Fecha de inicio
        ticket.setFechaInicio(ahora);

        // 2. Estado inicial por defecto
        if (ticket.getEstadoTicket() == null || ticket.getEstadoTicket().trim().isEmpty()) {
            ticket.setEstadoTicket("RADICADO");
        }

        // 3. Generar Código de Radicado Único (Ej: TKT-2026-X8F21A)
        if (ticket.getCodigoRadicado() == null || ticket.getCodigoRadicado().trim().isEmpty()) {
            String codigo = "TKT-" + ahora.getYear() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            ticket.setCodigoRadicado(codigo);
        }

        // 4. Asociar Cliente y Factura primero (para que sus datos influyan en el
        // cálculo)
        if (ticket.getCliente() != null && ticket.getCliente().getCedula() != null) {
            String ced = ticket.getCliente().getCedula().trim();
            Cliente clienteDb = this.clienteRepositorio.findById(ced).orElse(null);
            ticket.setCliente(clienteDb);
        }

        if (ticket.getFactura() != null && ticket.getFactura().getIdFactura() != null) {
            Factura facturaDb = this.facturaRepositorio.findById(ticket.getFactura().getIdFactura()).orElse(null);
            ticket.setFactura(facturaDb);

            // Si el cliente no se había asociado pero la factura sí tiene cédula, asociar
            // el cliente de la factura
            if (ticket.getCliente() == null && facturaDb != null && facturaDb.getCedulaC() != null) {
                Cliente clienteDeFactura = this.clienteRepositorio.findById(facturaDb.getCedulaC().trim()).orElse(null);
                ticket.setCliente(clienteDeFactura);
            }
        }

        // 2. Subir el archivo a Cloudinary si viene una imagen
        if (archivoImagen != null && !archivoImagen.isEmpty()) {
            Map uploadResult = cloudinary.uploader().upload(archivoImagen.getBytes(), ObjectUtils.emptyMap());
            String linkImagen = (String) uploadResult.get("secure_url");
            ticket.setEvidenciaImg(linkImagen);
        }

        // 5. MOTOR DE CÁLCULO: Calcular puntaje automático y recomendar prioridad + SLA
        calcularPuntajeYPrioridadRecomendada(ticket, ahora);

        // 6. Valores que inician nulos en la creación
        ticket.setFechaFin(null);
        ticket.setRespuesta(null);
        ticket.setTecnicoAsignado(null);

        // 7. Guardar ticket
        Ticket ticketGuardado = this.ticketRepositorio.save(ticket);

        // 8. Enviar correo de confirmación de radicado al cliente (si tiene correo
        // registrado)
        try {
            Cliente clienteDestino = ticketGuardado.getCliente();
            if (clienteDestino != null && clienteDestino.getCorreo() != null
                    && !clienteDestino.getCorreo().trim().isEmpty()) {
                this.emailService.enviarNotificacionTicketRadicado(
                        ticketGuardado,
                        clienteDestino.getCorreo().trim(),
                        clienteDestino.getNombre());
            }
        } catch (Exception e) {
            // Protección: Cualquier problema de red o SMTP nunca interrumpe la radicación
            // del ticket
            System.err.println("Aviso: No se pudo despachar el correo de notificación del ticket: " + e.getMessage());
        }

        return ticketGuardado;
    }

    /**
     * Motor de priorización inteligente:
     * Evalúa la categoría, urgencia en el texto, monto económico y evidencias,
     * calcula un puntaje (0 - 100) y recomienda la prioridad y fecha límite de SLA.
     */
    private void calcularPuntajeYPrioridadRecomendada(Ticket ticket, LocalDateTime ahora) {
        int puntaje = 0;

        // Factores 1: Impacto según la Categoría del problema
        String categoria = ticket.getCategoriaTicket() != null ? ticket.getCategoriaTicket().toUpperCase() : "";
        switch (categoria) {
            case "CALIDAD_FORRAJE":
            case "PRODUCTO_DANADO":
                // Riesgo directo para la salud del ganado (urgencia máxima)
                puntaje += 40;
                break;
            case "LOGISTICA":
            case "ENTREGA":
                // Retraso de despacho / camión no llega
                puntaje += 30;
                break;
            case "FACTURACION":
            case "PAGO":
                // Discrepancia en cobro
                puntaje += 20;
                break;
            case "SOPORTE_WEB":
            case "APP":
            default:
                puntaje += 10;
                break;
        }

        // Factores 2: Detección de palabras de emergencia en título o descripción
        String texto = ((ticket.getTituloTicket() != null ? ticket.getTituloTicket() : "") + " " +
                (ticket.getDescripcionTicket() != null ? ticket.getDescripcionTicket() : "")).toLowerCase();

        if (texto.contains("hongo") || texto.contains("moho") || texto.contains("podrido") ||
                texto.contains("intoxic") || texto.contains("enfermo") || texto.contains("urgente") ||
                texto.contains("inmediato") || texto.contains("grave")) {
            puntaje += 25; // Suma puntos por criticidad evidente
        }

        // Factores 3: Impacto Económico (si viene de una compra importante)
        if (ticket.getFactura() != null && ticket.getFactura().getTotalVenta() != null) {
            double totalCompra = ticket.getFactura().getTotalVenta();
            if (totalCompra >= 1000000) {
                puntaje += 20; // Compra grande / cliente mayorista
            } else if (totalCompra >= 300000) {
                puntaje += 10;
            }
        }

        // Factores 4: Evidencia fotográfica adjunta
        if (ticket.getEvidenciaImg() != null && !ticket.getEvidenciaImg().trim().isEmpty()) {
            puntaje += 15; // Reclamo sustentado con prueba gráfica
        }

        // Limitar puntaje entre 10 y 100
        puntaje = Math.min(100, Math.max(10, puntaje));
        ticket.setPuntajePrioridad(puntaje);

        // DETERMINAR LA PRIORIDAD RECOMENDADA Y EL SLA SEGÚN EL PUNTAJE CALCULADO:
        String prioridadRecomendada;
        long horasSla;

        if (puntaje >= 75) {
            prioridadRecomendada = "CRITICA";
            horasSla = 24; // 1 día máximo para resolver
        } else if (puntaje >= 50) {
            prioridadRecomendada = "ALTA";
            horasSla = 48; // 2 días
        } else if (puntaje >= 30) {
            prioridadRecomendada = "MEDIA";
            horasSla = 96; // 4 días
        } else {
            prioridadRecomendada = "BAJA";
            horasSla = 168; // 7 días
        }

        ticket.setPrioridad(prioridadRecomendada);
        ticket.setFechaLimite(ahora.plusHours(horasSla));
        ticket.setSlaVencido(false);
    }

    // Listar todos los tickets (ordenados de forma ascendente por fecha límite para
    // priorizar los más próximos a vencerse)
    public List<Ticket> buscarTodos() {
        return this.ticketRepositorio.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.ASC, "fechaLimite")
                .and(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
                        "idTicket")));
    }

    // Filtrar tickets en la base de datos (PostgreSQL) por estado, prioridad,
    // categoría y búsqueda textual
    public List<Ticket> filtrarTickets(String estado, String prioridad, String categoria, String busqueda) {
        String Estado = (estado != null && !estado.trim().isEmpty() && !estado.equalsIgnoreCase("TODOS"))
                ? estado.trim()
                : null;
        String Prioridad = (prioridad != null && !prioridad.trim().isEmpty() && !prioridad.equalsIgnoreCase("TODAS"))
                ? prioridad.trim()
                : null;
        String Categoria = (categoria != null && !categoria.trim().isEmpty() && !categoria.equalsIgnoreCase("TODAS"))
                ? categoria.trim()
                : null;
        String Busqueda = (busqueda != null && !busqueda.trim().isEmpty()) ? busqueda.trim() : null;

        return this.ticketRepositorio.filtrarTickets(Estado, Prioridad, Categoria, Busqueda);
    }

    // Listar tickets de un cliente
    public List<Ticket> buscarPorCliente(String cedula) {
        if (cedula == null || cedula.trim().isEmpty()) {
            return List.of();
        }
        return this.ticketRepositorio.buscarPorCedulaCliente(cedula.trim());
    }

    public List<Ticket> buscarPorAsesor(String cedula) {
        return buscarPorAsesor(cedula, null);
    }

    public List<Ticket> buscarPorAsesor(String cedula, String busqueda) {
        if (cedula == null || cedula.trim().isEmpty()) {
            return List.of();
        }
        try {
            Long cedulaLong = Long.parseLong(cedula.trim());
            if (busqueda != null && !busqueda.trim().isEmpty()) {
                return this.ticketRepositorio.buscarPorAsesorYFiltro(cedulaLong, busqueda.trim());
            }
            return this.ticketRepositorio.buscarPorCedulaAsesor(cedulaLong);
        } catch (NumberFormatException e) {
            return List.of();
        }
    }

    public List<Ticket> buscarAtendidosPorAsesor(String cedula, Integer anio, Integer mes, Integer dia) {
        if (cedula == null || cedula.trim().isEmpty()) {
            return List.of();
        }
        try {
            Long cedulaLong = Long.parseLong(cedula.trim());
            return this.ticketRepositorio.buscarAtendidosPorAsesorYFecha(cedulaLong, anio, mes, dia);
        } catch (NumberFormatException e) {
            return List.of();
        }
    }

    public List<Ticket> buscarPorAsesorYEstado(String cedula) {
        if (cedula == null || cedula.trim().isEmpty()) {
            return List.of();
        }
        try {
            Long cedulaLong = Long.parseLong(cedula.trim());
            return this.ticketRepositorio.buscarPorCedulaAsesorYestado(cedulaLong);
        } catch (NumberFormatException e) {
            return List.of();
        }
    }

    // Listar tickets de una factura
    public List<Ticket> buscarPorFactura(Long idFactura) {
        return this.ticketRepositorio.findByFacturaIdFactura(idFactura);
    }

    // Listar exclusivamente usuarios con rol asesor
    public List<Usuario> listarAsesores() {
        List<Usuario> lista = this.usuarioRepositorio.findAsesores();
        // Ocultar contraseñas antes de serializar
        lista.forEach(u -> u.setClave(null));
        return lista;
    }

    // Asignar técnico al ticket
    @Transactional
    public Ticket asignarTecnico(Long idTicket, Long cedulaTecnico) {
        Ticket ticket = this.ticketRepositorio.findById(idTicket)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado con id: " + idTicket));

        Usuario tecnico = this.usuarioRepositorio.findById(cedulaTecnico)
                .orElseThrow(() -> new RuntimeException("Técnico no encontrado con cédula: " + cedulaTecnico));

        if (tecnico.getActivo() != null && !tecnico.getActivo()) {
            throw new IllegalStateException("El asesor seleccionado (" + tecnico.getNombre() + ") se encuentra inactivo y no puede ser asignado.");
        }

        ticket.setTecnicoAsignado(tecnico);
        ticket.setEstadoTicket("EN_ANALISIS");
        Ticket ticketGuardado = this.ticketRepositorio.save(ticket);

        // Enviar correo de notificación al cliente con los datos del asesor asignado
        try {
            Cliente cliente = ticketGuardado.getCliente();
            if (cliente != null && cliente.getCorreo() != null && !cliente.getCorreo().trim().isEmpty()) {
                this.emailService.enviarNotificacionAsesorAsignado(
                        ticketGuardado,
                        tecnico,
                        cliente.getCorreo().trim(),
                        cliente.getNombre());
            }
        } catch (Exception e) {
            System.err.println("Aviso: No se pudo despachar el correo de asignación de asesor: " + e.getMessage());
        }

        return ticketGuardado;
    }

    // Dar solución y cerrar ticket
    @Transactional
    public Ticket resolverTicket(Long idTicket, String respuesta) {
        Ticket ticket = this.ticketRepositorio.findById(idTicket)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado con id: " + idTicket));

        ticket.setRespuesta(respuesta);
        ticket.setFechaFin(LocalDateTime.now());
        ticket.setEstadoTicket("RESUELTO");
        Ticket ticketGuardado = this.ticketRepositorio.save(ticket);

        // Enviar correo de notificación al cliente informando la solución del ticket
        try {
            Cliente cliente = ticketGuardado.getCliente();
            if (cliente != null && cliente.getCorreo() != null && !cliente.getCorreo().trim().isEmpty()) {
                this.emailService.enviarNotificacionTicketResuelto(
                        ticketGuardado,
                        respuesta,
                        cliente.getCorreo().trim(),
                        cliente.getNombre());
            }
        } catch (Exception e) {
            System.err.println("Aviso: No se pudo despachar el correo de solución del ticket: " + e.getMessage());
        }

        return ticketGuardado;
    }

}
