package com.HenoTrade.ventaHeno.Entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ticket")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ticket", nullable = false, unique = true)
    private Long idTicket;

    @Column(name = "codigo_radicado", nullable = false, unique = true, length = 30)
    private String codigoRadicado; // Ej: TKT-2026-0001

    @Column(name = "titulo_ticket", nullable = false, length = 150)
    private String tituloTicket;

    @Column(name = "descripcion_ticket", nullable = false, columnDefinition = "TEXT")
    private String descripcionTicket;

    @Column(name = "categoria_ticket", nullable = false, length = 50)
    private String categoriaTicket; // CALIDAD_FORRAJE, LOGISTICA, FACTURACION, SOPORTE_WEB

    @Column(name = "prioridad", nullable = false, length = 20)
    private String prioridad; // CRITICA, ALTA, MEDIA, BAJA

    @Column(name = "puntaje_prioridad", nullable = false)
    @Builder.Default
    private Integer puntajePrioridad = 0;

    @Column(name = "estado_ticket", nullable = false, length = 30)
    private String estadoTicket; // RADICADO, EN_ANALISIS, RESUELTO

    @CreationTimestamp
    @Column(name = "fecha_inicio", nullable = false, updatable = false)
    private LocalDateTime fechaInicio;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @Column(name = "fecha_limite")
    private LocalDateTime fechaLimite;

    @Column(name = "fecha_fin")
    private LocalDateTime fechaFin;

    @Column(name = "sla_vencido", nullable = false)
    @Builder.Default
    private Boolean slaVencido = false;

    @Column(name = "respuesta", columnDefinition = "TEXT")
    private String respuesta; // Solución comunicada al cliente

    @Column(name = "evidencia_img", length = 500)
    private String evidenciaImg; // URL foto subida por el cliente

    @ManyToOne
    @JoinColumn(name = "id_factura", nullable = true)
    private Factura factura;

    @ManyToOne
    @JoinColumn(name = "id_tecnico", nullable = true)
    private Usuario tecnicoAsignado;

    @ManyToOne
    @JoinColumn(name = "cedula_cliente", referencedColumnName = "cedula", nullable = true)
    private Cliente cliente;
}