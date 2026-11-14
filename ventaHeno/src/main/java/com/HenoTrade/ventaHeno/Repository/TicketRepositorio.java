package com.HenoTrade.ventaHeno.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.HenoTrade.ventaHeno.Entity.Ticket;

public interface TicketRepositorio extends JpaRepository<Ticket, Long> {

    // 2. Consulta nativa segura para monitorear tickets de un cliente (con o sin factura asociada)
    @Query(value = "SELECT t.* FROM ticket t LEFT JOIN factura f ON t.id_factura = f.id_factura WHERE t.cedula_cliente = :cedula OR f.cedulac = :cedula ORDER BY t.fecha_inicio DESC", nativeQuery = true)
    List<Ticket> buscarPorCedulaCliente(@Param("cedula") String cedula);

    // 3. Buscar tickets vinculados a una factura específica
    @Query("SELECT t FROM Ticket t WHERE t.factura.idFactura = :idFactura ORDER BY t.fechaInicio DESC")
    List<Ticket> findByFacturaIdFactura(@Param("idFactura") Long idFactura);

}
