package com.HenoTrade.ventaHeno.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @Column(name = "cedulaU", nullable = false, unique = true)
    private Long cedulaU;

    @Column(name = "clave", nullable = false)
    private String clave;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "rol", nullable = true)
    @Builder.Default
    private String rol = "admin";

    @Column(name = "activo", nullable = true)
    @Builder.Default
    private Boolean activo = true;

    public Boolean getActivo() {
        return activo == null ? true : activo;
    }
}
