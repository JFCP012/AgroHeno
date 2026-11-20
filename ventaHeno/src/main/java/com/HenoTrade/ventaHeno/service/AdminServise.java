package com.HenoTrade.ventaHeno.service;

import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.Repository.UsuarioRepositorio;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AdminServise {

    private final UsuarioRepositorio repositorio;

    public AdminServise(UsuarioRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    public Optional<Usuario> loginAdmin(Long cedulaU, String clave) {
        return this.repositorio.findAll().stream()
                .filter(admin -> (admin.getCedulaU() != null && admin.getCedulaU().equals(cedulaU))
                        && admin.getClave().equals(clave))
                .findFirst();
    }

    public Usuario crearUsuario(Usuario usuario) {
        if (usuario.getCedulaU() == null) {
            throw new IllegalArgumentException("La cédula del usuario es obligatoria.");
        }
        if (usuario.getNombre() == null || usuario.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del usuario es obligatorio.");
        }
        if (usuario.getClave() == null || usuario.getClave().trim().isEmpty()) {
            throw new IllegalArgumentException("La contraseña del usuario es obligatoria.");
        }
        
        if (usuario.getRol() == null || usuario.getRol().trim().isEmpty()) {
            usuario.setRol("ADMIN");
        } else {
            String rolNormalizado = usuario.getRol().trim().toUpperCase();
            if (!rolNormalizado.equals("ADMIN") && !rolNormalizado.equals("GESTOR_TICKETS") && !rolNormalizado.equals("ASESOR")) {
                throw new IllegalArgumentException("El rol '" + usuario.getRol() + "' no es válido. Roles válidos: ADMIN, GESTOR_TICKETS, ASESOR.");
            }
            usuario.setRol(rolNormalizado);
        }

        if (this.repositorio.existsById(usuario.getCedulaU())) {
            throw new IllegalArgumentException("Ya existe un usuario interno registrado con la cédula " + usuario.getCedulaU() + ".");
        }

        return this.repositorio.save(usuario);
    }

    public List<Usuario> listarTodos() {
        return this.repositorio.findAll();
    }

}
