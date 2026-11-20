package com.HenoTrade.ventaHeno.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import com.HenoTrade.ventaHeno.Entity.Usuario;

@Repository
public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

    @Query("SELECT u FROM Usuario u WHERE UPPER(COALESCE(u.rol, '')) LIKE '%ASESOR%' AND (u.activo = true OR u.activo IS NULL)")
    List<Usuario> findAsesores();

    List<Usuario> findByActivoTrue();
}
