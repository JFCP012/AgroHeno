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
        
        String rol = usuario.getRol();
        if (rol == null || rol.trim().isEmpty()) {
            usuario.setRol("ADMIN");
        } else {
            String rolNormalizado = rol.trim().toUpperCase();
            if (!rolNormalizado.equals("ADMIN") && !rolNormalizado.equals("ASESOR") && !rolNormalizado.equals("GESTOR_TICKETS")) {
                throw new IllegalArgumentException("El perfil seleccionado no es válido. Opciones permitidas: ADMIN, ASESOR, GESTOR_TICKETS.");
            }
            usuario.setRol(rolNormalizado);
        }

        if (this.repositorio.existsById(usuario.getCedulaU())) {
            throw new IllegalStateException("Ya existe un usuario registrado con la cédula " + usuario.getCedulaU() + ". No es posible crear otro usuario con la misma cédula.");
        }

        return this.repositorio.save(usuario);
    }

    public List<Usuario> listarTodos() {
        return this.repositorio.findAll();
    }

}
