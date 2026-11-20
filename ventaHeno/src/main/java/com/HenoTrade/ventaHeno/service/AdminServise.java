package com.HenoTrade.ventaHeno.service;

import org.springframework.stereotype.Service;
import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.Repository.UsuarioRepositorio;

import java.util.List;
import java.util.Optional;

@Service
public class AdminServise {

    private final UsuarioRepositorio repositorio;

    public AdminServise(UsuarioRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    public String normalizarRol(String rol) {
        if (rol == null || rol.trim().isEmpty()) {
            return "admin";
        }
        String clean = rol.trim().toLowerCase().replace("_", "").replace(" ", "");
        if (clean.contains("admin")) {
            return "admin";
        } else if (clean.contains("asesor") || clean.contains("tecnico")) {
            return "asesor";
        } else if (clean.contains("gestor") || clean.contains("ticket")) {
            return "gestorTickets";
        }
        throw new IllegalArgumentException("El perfil seleccionado no es válido. Opciones permitidas: admin, asesor, gestorTickets.");
    }

    public Optional<Usuario> loginAdmin(Long cedulaU, String clave) {
        if (cedulaU == null || clave == null) {
            return Optional.empty();
        }
        Optional<Usuario> usuarioOpt = this.repositorio.findById(cedulaU);
        if (usuarioOpt.isPresent()) {
            Usuario u = usuarioOpt.get();
            String claveGuardada = u.getClave() != null ? u.getClave().trim() : "";
            if (clave.trim().equals(claveGuardada)) {
                // 1. Validar que el usuario esté activo
                if (Boolean.FALSE.equals(u.getActivo()) || (u.getActivo() != null && !u.getActivo())) {
                    throw new IllegalStateException("El usuario con cédula " + cedulaU + " se encuentra inactivo. Comuníquese con el administrador.");
                }

                // 2. Normalizar y validar rol (admin, asesor, gestorTickets)
                String rolNormalizado = normalizarRol(u.getRol());
                u.setRol(rolNormalizado);

                return Optional.of(u);
            }
        }
        return Optional.empty();
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

        usuario.setRol(normalizarRol(usuario.getRol()));

        if (usuario.getActivo() == null) {
            usuario.setActivo(true);
        }

        if (this.repositorio.existsById(usuario.getCedulaU())) {
            throw new IllegalStateException("Ya existe un usuario registrado con la cédula " + usuario.getCedulaU() + ". No es posible crear otro usuario con la misma cédula.");
        }

        return this.repositorio.save(usuario);
    }

    public Usuario editarUsuario(Long cedulaU, Usuario datos) {
        if (cedulaU == null) {
            throw new IllegalArgumentException("La cédula del usuario es obligatoria.");
        }
        Usuario usuario = this.repositorio.findById(cedulaU).orElseThrow(
                () -> new IllegalArgumentException("No se encontró ningún usuario con la cédula " + cedulaU)
        );

        if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
            usuario.setNombre(datos.getNombre().trim());
        }
        if (datos.getClave() != null && !datos.getClave().trim().isEmpty()) {
            usuario.setClave(datos.getClave().trim());
        }
        if (datos.getRol() != null && !datos.getRol().trim().isEmpty()) {
            usuario.setRol(normalizarRol(datos.getRol()));
        }
        if (datos.getActivo() != null) {
            usuario.setActivo(datos.getActivo());
        }

        return this.repositorio.save(usuario);
    }

    public Usuario cambiarEstado(Long cedulaU) {
        if (cedulaU == null) {
            throw new IllegalArgumentException("La cédula del usuario es obligatoria.");
        }
        Usuario usuario = this.repositorio.findById(cedulaU).orElseThrow(
                () -> new IllegalArgumentException("No se encontró ningún usuario con la cédula " + cedulaU)
        );
        boolean estadoActual = usuario.getActivo() == null || usuario.getActivo();
        usuario.setActivo(!estadoActual);
        return this.repositorio.save(usuario);
    }

    public Optional<Usuario> buscarPorId(Long cedulaU) {
        return this.repositorio.findById(cedulaU);
    }

    public List<Usuario> listarTodos() {
        return this.repositorio.findAll();
    }
}
