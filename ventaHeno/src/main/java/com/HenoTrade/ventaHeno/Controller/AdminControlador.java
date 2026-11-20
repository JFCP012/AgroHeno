package com.HenoTrade.ventaHeno.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.service.AdminServise;

import java.util.Optional;

@RestController
@RequestMapping("/Admin")
public class AdminControlador {

    @Autowired
    private AdminServise adminServise;

    @GetMapping("/login")
    public ResponseEntity<?> loginAdmin(
            @RequestParam(value = "cedulaU", required = true) Long cedulaU,
            @RequestParam String clave) {

        if (cedulaU == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Cédula no proporcionada");
        }

        Optional<Usuario> usuarioOpt = this.adminServise.loginAdmin(cedulaU, clave);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            if (usuario.getRol() == null || usuario.getRol().trim().isEmpty()) {
                usuario.setRol("ADMIN");
            }
            return ResponseEntity.ok(usuario);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(false);
    }

    @PostMapping("/crearUsuario")
    public ResponseEntity<?> crearUsuario(@RequestBody Usuario usuario) {
        try {
            Usuario nuevoUsuario = this.adminServise.crearUsuario(usuario);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoUsuario);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(java.util.Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Error al crear el usuario: " + e.getMessage()));
        }
    }

    @GetMapping("/listarUsuarios")
    public ResponseEntity<?> listarUsuarios() {
        return ResponseEntity.ok(this.adminServise.listarTodos());
    }
}
