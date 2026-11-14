package com.HenoTrade.ventaHeno.Controller;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.HenoTrade.ventaHeno.Entity.Ticket;
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

    @GetMapping("/cliente/{cedula}")
    public List<Ticket> listarPorCliente(@PathVariable String cedula) {
        return this.ticketServise.buscarPorCliente(cedula);
    }

    @GetMapping("/factura/{idFactura}")
    public List<Ticket> listarPorFactura(@PathVariable Long idFactura) {
        return this.ticketServise.buscarPorFactura(idFactura);
    }
}
