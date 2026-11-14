package com.HenoTrade.ventaHeno.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.HenoTrade.ventaHeno.Entity.Usuario;

@Repository
public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

}
