package com.HenoTrade.ventaHeno.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.HenoTrade.ventaHeno.Entity.Animales;
import com.HenoTrade.ventaHeno.Repository.AnimalRepositorio;

@Service
public class AnimalService {

    private final AnimalRepositorio animalRepositorio;

    public AnimalService(AnimalRepositorio animalRepositorio) {
        this.animalRepositorio = animalRepositorio;
    }

    public Optional<Animales> buscarAnimalPorId(Long id) {
        return this.animalRepositorio.findById(id);
    }

    public List<Animales> obtenerTodos() {
        return this.animalRepositorio.findAll();
    }

    public Animales guardarAnimal(Animales animal) {
        return this.animalRepositorio.save(animal);
    }

}
