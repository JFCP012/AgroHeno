package com.HenoTrade.ventaHeno.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "preguntas_frecuentes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreguntasFrecuentes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pregunta", nullable = false, unique = true)
    private Long idPregunta;

    @Column(name = "pregunta", nullable = false, length = 250)
    private String pregunta;

    // Se usa columnDefinition = "TEXT" porque las respuestas agrícolas suelen
    // requerir varios párrafos
    @Column(name = "respuesta", nullable = false, columnDefinition = "TEXT")
    private String respuesta;

    // Compatible con las categorías de tickets: CALIDAD_FORRAJE, LOGISTICA,
    // FACTURACION, GENERAL
    @Column(name = "categoria", nullable = false, length = 50)
    private String categoria;

    @Column(name = "orden", nullable = false)
    @Builder.Default
    private Integer orden = 1;

    @Column(name = "activo", nullable = false)
    @Builder.Default
    private Boolean activo = true;

}