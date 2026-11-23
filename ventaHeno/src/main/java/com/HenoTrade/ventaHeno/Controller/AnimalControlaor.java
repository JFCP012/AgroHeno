package com.HenoTrade.ventaHeno.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.HenoTrade.ventaHeno.Entity.Animales;
import com.HenoTrade.ventaHeno.service.AnimalService;

@RestController
@RequestMapping("/animal")
public class AnimalControlaor {

    @Autowired
    private AnimalService animalService;

    @GetMapping("/buscarAnimalPorId")
    public ResponseEntity<Animales> buscarAnimalPorId(@RequestParam Long id) {
        return animalService.buscarAnimalPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/todos")
    public List<Animales> obtenerTodos() {
        return this.animalService.obtenerTodos();
    }

    @PostMapping("/guardar")
    public Animales guardarAnimal(@RequestBody Animales animal) {
        return this.animalService.guardarAnimal(animal);
    }

}
