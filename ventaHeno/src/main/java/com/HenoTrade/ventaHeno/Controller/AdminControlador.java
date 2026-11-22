package com.HenoTrade.ventaHeno.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", "Cédula no proporcionada"));
        }

        try {
            Optional<Usuario> usuarioOpt = this.adminServise.loginAdmin(cedulaU, clave);
            if (usuarioOpt.isPresent()) {
                Usuario usuario = usuarioOpt.get();
                if (usuario.getRol() == null || usuario.getRol().trim().isEmpty()) {
                    usuario.setRol("admin");
                }
                return ResponseEntity.ok(usuario);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Cédula o contraseña incorrecta"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Error al procesar el inicio de sesión: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/crearUsuario", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> crearUsuarioMultipart(
            @RequestParam("usuario") String usuarioJson,
            @RequestParam(value = "imagen", required = false) MultipartFile imagen) {
        try {
            Usuario nuevoUsuario = this.adminServise.crearUsuario(usuarioJson, imagen);
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

    @PostMapping(value = "/crearUsuario", consumes = MediaType.APPLICATION_JSON_VALUE)
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

    @PutMapping(value = {"/editar/{cedulaU}", "/editarUsuario/{cedulaU}"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> editarUsuarioMultipart(
            @PathVariable Long cedulaU,
            @RequestParam("usuario") String usuarioJson,
            @RequestParam(value = "imagen", required = false) MultipartFile imagen) {
        try {
            Usuario actualizado = this.adminServise.editarUsuario(cedulaU, usuarioJson, imagen);
            return ResponseEntity.ok(actualizado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Error al actualizar el usuario: " + e.getMessage()));
        }
    }

    @PutMapping(value = {"/editar/{cedulaU}", "/editarUsuario/{cedulaU}"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> editarUsuario(@PathVariable Long cedulaU, @RequestBody Usuario usuario) {
        try {
            Usuario actualizado = this.adminServise.editarUsuario(cedulaU, usuario);
            return ResponseEntity.ok(actualizado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Error al actualizar el usuario: " + e.getMessage()));
        }
    }

    @PutMapping({"/desactivar/{cedulaU}", "/desactivarUsuario/{cedulaU}", "/cambiarEstado/{cedulaU}"})
    public ResponseEntity<?> cambiarEstado(@PathVariable Long cedulaU) {
        try {
            Usuario actualizado = this.adminServise.cambiarEstado(cedulaU);
            return ResponseEntity.ok(actualizado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Error al cambiar estado del usuario: " + e.getMessage()));
        }
    }

    @GetMapping("/listarUsuarios")
    public ResponseEntity<?> listarUsuarios() {
        return ResponseEntity.ok(this.adminServise.listarTodos());
    }
}
