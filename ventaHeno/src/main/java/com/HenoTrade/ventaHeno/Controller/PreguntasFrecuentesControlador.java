package com.HenoTrade.ventaHeno.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.HenoTrade.ventaHeno.Entity.PreguntasFrecuentes;
import com.HenoTrade.ventaHeno.service.PreguntasFrecuentesService;

@RestController
@RequestMapping({ "/preguntasFrecuentes", "/preguntas-frecuentes" })
public class PreguntasFrecuentesControlador {

    @Autowired
    private PreguntasFrecuentesService preguntasFrecuentesService;

    @PostMapping({ "/CrearPreguntaFrecuente", "/crear", "" })
    public PreguntasFrecuentes crearPreguntaFrecuente(@RequestBody PreguntasFrecuentes preguntasFrecuentes) {
        return this.preguntasFrecuentesService.crearPreguntasFrecuentes(preguntasFrecuentes);
    }

    @GetMapping("/listar")
    public List<PreguntasFrecuentes> listarTodas() {
        return this.preguntasFrecuentesService.buscarTodos();
    }

    @GetMapping({ "/filtrar", "/buscarPorFiltros", "/categoria", "/buscarPorcategoria" })
    public List<PreguntasFrecuentes> buscarPorFiltros(@RequestParam(required = false) String categoria,
            @RequestParam(required = false) Boolean activo) {
        return this.preguntasFrecuentesService.buscarPorFiltros(categoria, activo);
    }

    @GetMapping("/buscarPorId")
    public PreguntasFrecuentes buscarPorId(@RequestParam Long id) {
        return this.preguntasFrecuentesService.buscarPorId(id);
    }

    @PutMapping("/editar/{id}")
    public PreguntasFrecuentes editar(@PathVariable Long id, @RequestBody PreguntasFrecuentes preguntasFrecuentes) {
        return this.preguntasFrecuentesService.editar(id, preguntasFrecuentes);
    }

    @PutMapping("/desactivar/{id}")
    public PreguntasFrecuentes desactivar(@PathVariable Long id) {
        return this.preguntasFrecuentesService.desactivar(id);
    }

}
