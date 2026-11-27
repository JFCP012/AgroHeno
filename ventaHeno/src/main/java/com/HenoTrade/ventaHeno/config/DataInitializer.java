package com.HenoTrade.ventaHeno.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.HenoTrade.ventaHeno.Entity.Animales;
import com.HenoTrade.ventaHeno.Entity.Usuario;
import com.HenoTrade.ventaHeno.Repository.AnimalRepositorio;
import com.HenoTrade.ventaHeno.Repository.UsuarioRepositorio;

/**
 * Inicializador automático de datos base al arrancar Spring Boot.
 * Garantiza que cualquier entorno nuevo o base de datos recién creada cuente
 * de inmediato con un usuario Administrador funcional y el catálogo base de animales,
 * sin necesidad de ejecutar scripts SQL manuales.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UsuarioRepositorio usuarioRepositorio;
    private final AnimalRepositorio animalRepositorio;

    @Value("${agroheno.admin.base.cedula:1000000000}")
    private Long cedulaAdminBase;

    @Value("${agroheno.admin.base.nombre:Administrador AgroHeno}")
    private String nombreAdminBase;

    @Value("${agroheno.admin.base.clave:admin123}")
    private String claveAdminBase;

    public DataInitializer(UsuarioRepositorio usuarioRepositorio, AnimalRepositorio animalRepositorio) {
        this.usuarioRepositorio = usuarioRepositorio;
        this.animalRepositorio = animalRepositorio;
    }

    @Override
    public void run(String... args) {
        inicializarAdminBase();
        inicializarAnimalesBase();
    }

    private void inicializarAdminBase() {
        try {
            Usuario existente = usuarioRepositorio.findById(cedulaAdminBase).orElse(null);
            if (existente == null) {
                Usuario adminBase = Usuario.builder()
                        .cedulaU(cedulaAdminBase)
                        .nombre(nombreAdminBase)
                        .clave(claveAdminBase)
                        .rol("admin")
                        .activo(true)
                        .build();
                usuarioRepositorio.save(adminBase);
                log.info("==================================================================");
                log.info("  USUARIO ADMIN BASE CREADO AUTOMÁTICAMENTE");
                log.info("  Cédula / ID : {}", cedulaAdminBase);
                log.info("  Contraseña  : {}", claveAdminBase);
                log.info("==================================================================");
            } else {
                boolean requiereGuardar = false;
                if (!"admin".equalsIgnoreCase(existente.getRol())) {
                    existente.setRol("admin");
                    requiereGuardar = true;
                }
                if (Boolean.FALSE.equals(existente.getActivo())) {
                    existente.setActivo(true);
                    requiereGuardar = true;
                }
                if (requiereGuardar) {
                    usuarioRepositorio.save(existente);
                }
                log.info("Usuario administrador base verificado y activo (Cédula: {}).", cedulaAdminBase);
            }
        } catch (Exception e) {
            log.error("No se pudo inicializar el usuario administrador base: {}", e.getMessage());
        }
    }

    private void inicializarAnimalesBase() {
        try {
            if (animalRepositorio.count() == 0) {
                List<Animales> base = List.of(
                        Animales.builder().nombre("Bovinos").build(),
                        Animales.builder().nombre("Equinos").build(),
                        Animales.builder().nombre("Ovinos").build()
                );
                animalRepositorio.saveAll(base);
                log.info("Catálogo base de animales inicializado automáticamente (Bovinos, Equinos, Ovinos).");
            }
        } catch (Exception e) {
            log.error("No se pudo inicializar el catálogo base de animales: {}", e.getMessage());
        }
    }
}
