package com.HenoTrade.ventaHeno.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.HenoTrade.ventaHeno.Entity.Ticket;

public interface TicketRepositorio extends JpaRepository<Ticket, Long> {

       // 2. Consulta nativa segura para monitorear tickets de un cliente (con o sin
       // factura asociada)
       @Query(value = "SELECT t.* FROM ticket t LEFT JOIN factura f ON t.id_factura = f.id_factura WHERE t.cedula_cliente = :cedula OR f.cedulac = :cedula ORDER BY t.fecha_inicio DESC", nativeQuery = true)
       List<Ticket> buscarPorCedulaCliente(@Param("cedula") String cedula);

       @Query("SELECT t FROM Ticket t WHERE t.tecnicoAsignado.cedulaU = :cedula AND t.fechaFin IS NOT NULL " +
                     "AND (:anio IS NULL OR YEAR(t.fechaFin) = :anio) AND (:mes IS NULL OR MONTH(t.fechaFin) = :mes) " +
                     "AND (:dia IS NULL OR DAY(t.fechaFin) = :dia) ORDER BY t.fechaFin DESC")
       List<Ticket> buscarAtendidosPorAsesorYFecha(@Param("cedula") Long cedula, @Param("anio") Integer anio,
                     @Param("mes") Integer mes, @Param("dia") Integer dia);

       @Query("SELECT t FROM Ticket t WHERE t.tecnicoAsignado.cedulaU = :cedula ORDER BY CASE WHEN t.fechaLimite IS NULL THEN 1 ELSE 0 END, t.fechaLimite ASC, t.idTicket DESC")
       List<Ticket> buscarPorCedulaAsesor(@Param("cedula") Long cedula);

       // Búsqueda para el asesor únicamente por: Radicado, Cédula de cliente o Nombre
       // de cliente
       @Query("SELECT t FROM Ticket t LEFT JOIN t.cliente c WHERE t.tecnicoAsignado.cedulaU = :cedula AND " +
                     "(:busqueda IS NULL OR :busqueda = '' OR " +
                     " LOWER(t.codigoRadicado) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
                     " (c IS NOT NULL AND (LOWER(c.cedula) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
                     "                      LOWER(c.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%'))))) " +
                     "ORDER BY CASE WHEN t.fechaLimite IS NULL THEN 1 ELSE 0 END, t.fechaLimite ASC, t.idTicket DESC")
       List<Ticket> buscarPorAsesorYFiltro(@Param("cedula") Long cedula, @Param("busqueda") String busqueda);

       @Query("SELECT t FROM Ticket t WHERE t.tecnicoAsignado.cedulaU = :cedula AND t.estadoTicket != 'RESUELTO' ORDER BY CASE WHEN t.fechaLimite IS NULL THEN 1 ELSE 0 END, t.fechaLimite ASC, t.idTicket DESC")
       List<Ticket> buscarPorCedulaAsesorYestado(@Param("cedula") Long cedula);

       // 3. Buscar tickets vinculados a una factura específica
       @Query("SELECT t FROM Ticket t WHERE t.factura.idFactura = :idFactura ORDER BY t.fechaInicio DESC")
       List<Ticket> findByFacturaIdFactura(@Param("idFactura") Long idFactura);

       // 4. Filtrado dinámico integral en base de datos (Estado, Prioridad, Categoría
       // y Búsqueda textual)
       @Query("SELECT t FROM Ticket t LEFT JOIN t.cliente c LEFT JOIN t.factura f WHERE " +
                     "(:estado IS NULL OR :estado = '' OR UPPER(t.estadoTicket) = UPPER(:estado)) AND " +
                     "(:prioridad IS NULL OR :prioridad = '' OR UPPER(t.prioridad) = UPPER(:prioridad)) AND " +
                     "(:categoria IS NULL OR :categoria = '' OR UPPER(t.categoriaTicket) = UPPER(:categoria)) AND " +
                     "(:busqueda IS NULL OR :busqueda = '' OR " +
                     " LOWER(t.codigoRadicado) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
                     " LOWER(t.tituloTicket) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
                     " LOWER(t.descripcionTicket) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
                     " (c IS NOT NULL AND (LOWER(c.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR LOWER(c.cedula) LIKE LOWER(CONCAT('%', :busqueda, '%')))) OR "
                     +
                     " (f IS NOT NULL AND CONCAT('', f.idFactura) LIKE CONCAT('%', :busqueda, '%'))) " +
                     "ORDER BY CASE WHEN t.fechaLimite IS NULL THEN 1 ELSE 0 END, t.fechaLimite ASC, t.idTicket DESC")
       List<Ticket> filtrarTickets(
                     @Param("estado") String estado,
                     @Param("prioridad") String prioridad,
                     @Param("categoria") String categoria,
                     @Param("busqueda") String busqueda);

}
