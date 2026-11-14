package com.HenoTrade.ventaHeno.Controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.HenoTrade.ventaHeno.Entity.Factura;
import com.HenoTrade.ventaHeno.service.FacturaServise;
import com.HenoTrade.ventaHeno.dto.CompraDTO;

@RestController
@RequestMapping("/Factura")
public class FacturaControlador {

    @Autowired
    private FacturaServise facturaServise;

    @PostMapping("/guardarFactura")
    public Factura guardarFactura(@RequestBody Factura factura) {
        return this.facturaServise.guardarFactura(factura);
    }

    @PostMapping("/procesarCompra")
    public ResponseEntity<?> procesarCompra(@RequestBody CompraDTO compraDTO) {
        try {
            Factura facturaGuardada = this.facturaServise.procesarCompra(compraDTO);
            return ResponseEntity.ok(facturaGuardada);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error inesperado al procesar la compra: " + e.getMessage()));
        }
    }
}
