package com.HenoTrade.ventaHeno.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.HenoTrade.ventaHeno.Entity.PreguntasFrecuentes;

public interface PreguntasFrecuentesRepositorio extends JpaRepository<PreguntasFrecuentes, Long> {

    @Query("SELECT p FROM PreguntasFrecuentes p WHERE " +
           "(:categoria IS NULL OR :categoria = '' OR :categoria = 'TODAS' OR " +
           "p.categoria = :categoria OR " +
           "(:categoria = 'SOPORTE_WEB' AND p.categoria = 'GENERAL') OR " +
           "(:categoria = 'GENERAL' AND p.categoria = 'SOPORTE_WEB')) " +
           "AND (:activo IS NULL OR p.activo = :activo)")
    List<PreguntasFrecuentes> buscarPorFiltros(@Param("categoria") String categoria, @Param("activo") Boolean activo);

    List<PreguntasFrecuentes> findByActivoTrue();

}
