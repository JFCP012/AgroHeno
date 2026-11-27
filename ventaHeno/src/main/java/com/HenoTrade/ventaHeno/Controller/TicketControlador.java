package com.HenoTrade.ventaHeno.Controller;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.HenoTrade.ventaHeno.Entity.Ticket;
import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.service.TicketServise;

@RestController
@RequestMapping("/ticket")
public class TicketControlador {

    @Autowired
    private TicketServise ticketServise;

    @PostMapping("/CrearTicket")
    public ResponseEntity<?> crearTicket(
            @RequestParam("ticket") String ticketJson,
            @RequestParam(value = "imagen", required = false) MultipartFile archivoImagen) {
        try {
            Ticket ticketGuardado = this.ticketServise.CrearTicket(ticketJson, archivoImagen);
            return ResponseEntity.ok(ticketGuardado);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al procesar la imagen o ticket: " + e.getMessage());
        }
    }

    @GetMapping("/listar")
    public List<Ticket> listarTickets() {
        return this.ticketServise.buscarTodos();
    }

    @GetMapping("/filtrar")
    public List<Ticket> filtrarTickets(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String prioridad,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String busqueda) {
        return this.ticketServise.filtrarTickets(estado, prioridad, categoria, busqueda);
    }

    @GetMapping("/cliente/{cedula}")
    public List<Ticket> listarPorCliente(@PathVariable String cedula) {
        return this.ticketServise.buscarPorCliente(cedula);
    }

    @GetMapping("/factura/{idFactura}")
    public List<Ticket> listarPorFactura(@PathVariable Long idFactura) {
        return this.ticketServise.buscarPorFactura(idFactura);
    }

    @GetMapping("/asesores")
    public List<Usuario> listarAsesores() {
        return this.ticketServise.listarAsesores();
    }

    @PutMapping("/{idTicket}/asignarTecnico")
    public ResponseEntity<?> asignarTecnico(
            @PathVariable Long idTicket,
            @RequestParam Long cedulaTecnico) {
        try {
            Ticket ticketActualizado = this.ticketServise.asignarTecnico(idTicket, cedulaTecnico);
            return ResponseEntity.ok(ticketActualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{idTicket}/prioridad")
    public ResponseEntity<?> actualizarPrioridad(
            @PathVariable Long idTicket,
            @RequestParam String prioridad) {
        try {
            Ticket ticketActualizado = this.ticketServise.actualizarPrioridad(idTicket, prioridad);
            return ResponseEntity.ok(ticketActualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping(value = { "/BuscarPorAsesor/{cedula}", "/BuscarPorAsesor" })
    public List<Ticket> BuscarPorAsesor(
            @PathVariable(value = "cedula", required = false) String cedulaPath,
            @RequestParam(value = "cedula", required = false) String cedula,
            @RequestParam(value = "busqueda", required = false) String busqueda) {
        String finalCedula = (cedulaPath != null && !cedulaPath.trim().isEmpty()) ? cedulaPath : cedula;
        return this.ticketServise.buscarPorAsesor(finalCedula, busqueda);
    }

    @GetMapping(value = { "/atendidosPorAsesor/{cedula}" })
    public List<Ticket> buscarAtendidosPorAsesor(
            @PathVariable String cedula,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer dia) {
        return this.ticketServise.buscarAtendidosPorAsesor(cedula, anio, mes, dia);
    }

    @GetMapping(value = { "/BuscarPorAsesorYEstado/{cedula}" })
    public List<Ticket> BuscarPorAsesorYEstado(
            @PathVariable(value = "cedula", required = false) String cedulaPath,
            @RequestParam(value = "cedula", required = false) String cedula) {
        String finalCedula = (cedulaPath != null && !cedulaPath.trim().isEmpty()) ? cedulaPath : cedula;
        return this.ticketServise.buscarPorAsesorYEstado(finalCedula);
    }

    @PutMapping("/{idTicket}/resolver")
    public ResponseEntity<?> resolverTicket(
            @PathVariable Long idTicket,
            @RequestParam String respuesta) {
        try {
            Ticket ticketResuelto = this.ticketServise.resolverTicket(idTicket, respuesta);
            return ResponseEntity.ok(ticketResuelto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/buscarPorClienteYEstado")
    public List<Ticket> buscarPorClienteYEstado(
            @RequestParam String cedula,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String categoria) {
        return this.ticketServise.buscarPorCedulaClienteYEstado(cedula, estado, categoria);
    }

}
