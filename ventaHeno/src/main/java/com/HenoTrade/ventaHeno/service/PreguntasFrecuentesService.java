package com.HenoTrade.ventaHeno.service;

import org.springframework.stereotype.Service;
import com.HenoTrade.ventaHeno.Entity.PreguntasFrecuentes;
import com.HenoTrade.ventaHeno.Repository.PreguntasFrecuentesRepositorio;
import java.util.List;

@Service
public class PreguntasFrecuentesService {

    private final PreguntasFrecuentesRepositorio preguntasFrecuentesRepositorio;

    public PreguntasFrecuentesService(PreguntasFrecuentesRepositorio preguntasFrecuentesRepositorio) {
        this.preguntasFrecuentesRepositorio = preguntasFrecuentesRepositorio;
    }

    public PreguntasFrecuentes crearPreguntasFrecuentes(PreguntasFrecuentes preguntasFrecuentes) {
        if ("GENERAL".equalsIgnoreCase(preguntasFrecuentes.getCategoria())) {
            preguntasFrecuentes.setCategoria("SOPORTE_WEB");
        }
        return this.preguntasFrecuentesRepositorio.save(preguntasFrecuentes);
    }

    public PreguntasFrecuentes buscarPorId(Long id) {
        return this.preguntasFrecuentesRepositorio.findById(id).orElse(null);
    }

    public PreguntasFrecuentes desactivar(Long id) {
        PreguntasFrecuentes preguntasFrecuentes = preguntasFrecuentesRepositorio.findById(id).orElse(null);
        if (preguntasFrecuentes != null) {
            preguntasFrecuentes.setActivo(false);
            return this.preguntasFrecuentesRepositorio.save(preguntasFrecuentes);
        }
        return null;
    }

    public PreguntasFrecuentes editar(Long id, PreguntasFrecuentes datosActualizados) {
        PreguntasFrecuentes existente = this.preguntasFrecuentesRepositorio.findById(id).orElse(null);
        if (existente != null && datosActualizados != null) {
            existente.setPregunta(datosActualizados.getPregunta());
            existente.setRespuesta(datosActualizados.getRespuesta());
            String cat = datosActualizados.getCategoria();
            if ("GENERAL".equalsIgnoreCase(cat)) {
                cat = "SOPORTE_WEB";
            }
            existente.setCategoria(cat);
            if (datosActualizados.getOrden() != null) {
                existente.setOrden(datosActualizados.getOrden());
            }
            if (datosActualizados.getActivo() != null) {
                existente.setActivo(datosActualizados.getActivo());
            }
            return this.preguntasFrecuentesRepositorio.save(existente);
        }
        return null;
    }

    public List<PreguntasFrecuentes> buscarTodos() {
        return this.preguntasFrecuentesRepositorio.findAll();
    }

    public List<PreguntasFrecuentes> buscarPorFiltros(String categoria, Boolean activo) {
        return this.preguntasFrecuentesRepositorio.buscarPorFiltros(categoria, activo);
    }

    public List<PreguntasFrecuentes> buscarPorCategoria(String categoria) {
        return this.buscarPorFiltros(categoria, null);
    }

    public List<PreguntasFrecuentes> buscarPorEstado(Boolean activo) {
        return this.buscarPorFiltros(null, activo);
    }

}
