package com.HenoTrade.ventaHeno.service;

import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.Repository.UsuarioRepositorio;
import org.springframework.stereotype.Service;

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
}
