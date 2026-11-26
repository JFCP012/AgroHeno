package com.HenoTrade.ventaHeno.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.awt.Color;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPCellEvent;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;

import com.HenoTrade.ventaHeno.Entity.DetalleVenta;
import com.HenoTrade.ventaHeno.Entity.Factura;
import com.HenoTrade.ventaHeno.Entity.Ticket;
import com.HenoTrade.ventaHeno.Entity.Usuario;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String remitente;

    /**
     * Envía un correo con diseño corporativo al cliente cuando radica un ticket.
     * Si no hay configuración SMTP configurada o falla la conexión, la excepción se captura
     * para asegurar que la creación y persistencia del ticket NUNCA se interrumpa.
     */
    @Async
    public void enviarNotificacionTicketRadicado(Ticket ticket, String correoDestino, String nombreCliente) {
        if (correoDestino == null || correoDestino.trim().isEmpty()) {
            log.info("Ticket {}: El cliente no tiene correo registrado. Se omite el envío.", ticket.getCodigoRadicado());
            return;
        }

        if (mailSender == null || remitente == null || remitente.trim().isEmpty() || remitente.contains("tu_correo@gmail.com")) {
            log.warn("Ticket {}: El servicio de correo no está configurado en application.properties (spring.mail.username). Correo no enviado.",
                    ticket.getCodigoRadicado());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(remitente, "AgroHeno Soporte");
            helper.setTo(correoDestino.trim());
            helper.setSubject("Radicado de Ticket [" + ticket.getCodigoRadicado() + "] - AgroHeno");

            String cuerpoHtml = construirPlantillaHtmlRadicado(ticket, nombreCliente);
            helper.setText(cuerpoHtml, true);

            mailSender.send(message);
            log.info("Correo de confirmación enviado exitosamente a {} para el ticket {}", correoDestino, ticket.getCodigoRadicado());
        } catch (Exception e) {
            log.error("No se pudo enviar el correo para el ticket {}: {}", ticket.getCodigoRadicado(), e.getMessage());
        }
    }

    private String construirPlantillaHtmlRadicado(Ticket ticket, String nombreCliente) {
        String nombre = (nombreCliente != null && !nombreCliente.trim().isEmpty()) ? nombreCliente : "Estimado/a cliente";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a");
        String fechaLimiteStr = (ticket.getFechaLimite() != null) ? ticket.getFechaLimite().format(formatter) : "Dentro de las próximas 48 horas";
        String facturaTexto = (ticket.getFactura() != null && ticket.getFactura().getIdFactura() != null)
                ? "Factura #" + ticket.getFactura().getIdFactura()
                : "Sin factura vinculada";

        return "<!DOCTYPE html>"
                + "<html lang='es'>"
                + "<head><meta charset='UTF-8'><style>"
                + "body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }"
                + ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }"
                + ".header { background: linear-gradient(135deg, #036c39 0%, #024d28 100%); padding: 30px 24px; text-align: center; color: #ffffff; }"
                + ".header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }"
                + ".header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; color: #fdf6e2; }"
                + ".content { padding: 28px 24px; }"
                + ".greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }"
                + ".badge-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center; margin: 20px 0; }"
                + ".radicado-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 1px; }"
                + ".radicado-code { font-size: 22px; font-weight: 800; color: #036c39; font-family: 'Consolas', monospace; margin-top: 4px; }"
                + ".details-table { width: 100%; border-collapse: collapse; margin-top: 18px; }"
                + ".details-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }"
                + ".details-table td.label { font-weight: 600; color: #64748b; width: 35%; }"
                + ".details-table td.value { color: #0f172a; font-weight: 500; }"
                + ".info-pill { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1; }"
                + ".desc-box { background: #f8fafc; border-left: 4px solid #cca243; padding: 12px 14px; margin: 18px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; line-height: 1.5; }"
                + ".sla-notice { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; margin-top: 18px; font-size: 13px; color: #92400e; }"
                + ".footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; }"
                + "</style></head>"
                + "<body>"
                + "<div class='container'>"
                + "  <div class='header'>"
                + "    <h1>🌱 AgroHeno</h1>"
                + "    <p>Centro de Atención y Soporte Postventa</p>"
                + "  </div>"
                + "  <div class='content'>"
                + "    <p class='greeting'>Hola <strong>" + escapeHtml(nombre) + "</strong>,</p>"
                + "    <p>Hemos recibido tu requerimiento de soporte y se ha radicado exitosamente en nuestro sistema.</p>"
                + "    <div class='badge-box'>"
                + "      <div class='radicado-label'>Tu Número de Radicado</div>"
                + "      <div class='radicado-code'>" + escapeHtml(ticket.getCodigoRadicado()) + "</div>"
                + "    </div>"
                + "    <table class='details-table'>"
                + "      <tr><td class='label'>Asunto:</td><td class='value'><strong>" + escapeHtml(ticket.getTituloTicket()) + "</strong></td></tr>"
                + "      <tr><td class='label'>Categoría:</td><td class='value'>" + escapeHtml(ticket.getCategoriaTicket() != null ? ticket.getCategoriaTicket() : "General") + "</td></tr>"
                + "      <tr><td class='label'>Referencia:</td><td class='value'>" + escapeHtml(facturaTexto) + "</td></tr>"
                + "      <tr><td class='label'>Estado inicial:</td><td class='value'><span class='info-pill'>" + escapeHtml(ticket.getEstadoTicket()) + "</span></td></tr>"
                + "      <tr><td class='label'>Límite estimado:</td><td class='value'>" + escapeHtml(fechaLimiteStr) + "</td></tr>"
                + "    </table>"
                + "    <div class='desc-box'><strong>Descripción registrada:</strong><br>" + escapeHtml(ticket.getDescripcionTicket()) + "</div>"
                + "    <div class='sla-notice'>Nuestro equipo técnico revisará los detalles y te responderá dentro del plazo estipulado. Puedes consultar el avance en tiempo real ingresando a tu <strong>Perfil de AgroHeno &gt; Mis Tickets</strong>.</div>"
                + "  </div>"
                + "  <div class='footer'>"
                + "    © " + java.time.Year.now().getValue() + " AgroHeno - Calidad que Alimenta el Futuro.<br>"
                + "    Este es un correo automático generado por el sistema de tickets, por favor no responder directamente a este mensaje."
                + "  </div>"
                + "</div>"
                + "</body></html>";
    }

    /**
     * Envía un correo con diseño corporativo al cliente informando que su ticket
     * ha sido asignado a un asesor técnico para su atención y análisis.
     */
    @Async
    public void enviarNotificacionAsesorAsignado(Ticket ticket, Usuario tecnico, String correoDestino, String nombreCliente) {
        if (correoDestino == null || correoDestino.trim().isEmpty()) {
            log.info("Ticket {}: El cliente no tiene correo registrado. Se omite el envío de asignación de asesor.", ticket.getCodigoRadicado());
            return;
        }

        if (mailSender == null || remitente == null || remitente.trim().isEmpty() || remitente.contains("tu_correo@gmail.com")) {
            log.warn("Ticket {}: El servicio de correo no está configurado en application.properties. Correo de asesor no enviado.",
                    ticket.getCodigoRadicado());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(remitente, "AgroHeno Soporte");
            helper.setTo(correoDestino.trim());
            helper.setSubject("Asesor asignado a tu Ticket [" + ticket.getCodigoRadicado() + "] - AgroHeno");

            String cuerpoHtml = construirPlantillaHtmlAsesor(ticket, tecnico, nombreCliente);
            helper.setText(cuerpoHtml, true);

            mailSender.send(message);
            log.info("Correo de asesor asignado ({}) enviado exitosamente a {} para el ticket {}",
                    (tecnico != null ? tecnico.getNombre() : "Técnico"), correoDestino, ticket.getCodigoRadicado());
        } catch (Exception e) {
            log.error("No se pudo enviar el correo de asesor para el ticket {}: {}", ticket.getCodigoRadicado(), e.getMessage());
        }
    }

    private String construirPlantillaHtmlAsesor(Ticket ticket, Usuario tecnico, String nombreCliente) {
        String nombre = (nombreCliente != null && !nombreCliente.trim().isEmpty()) ? nombreCliente : "Estimado/a cliente";
        String nombreAsesor = (tecnico != null && tecnico.getNombre() != null) ? tecnico.getNombre() : "Equipo Técnico Especializado";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a");
        String fechaLimiteStr = (ticket.getFechaLimite() != null) ? ticket.getFechaLimite().format(formatter) : "Dentro del plazo estipulado";

        return "<!DOCTYPE html>"
                + "<html lang='es'>"
                + "<head><meta charset='UTF-8'><style>"
                + "body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }"
                + ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }"
                + ".header { background: linear-gradient(135deg, #036c39 0%, #024d28 100%); padding: 30px 24px; text-align: center; color: #ffffff; }"
                + ".header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }"
                + ".header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; color: #fdf6e2; }"
                + ".content { padding: 28px 24px; }"
                + ".greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }"
                + ".advisor-card { background: #fdf8ec; border: 1.5px solid rgba(204, 162, 67, 0.45); border-radius: 10px; padding: 18px 20px; margin: 20px 0; text-align: center; }"
                + ".advisor-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #8c6814; letter-spacing: 1px; }"
                + ".advisor-name { font-size: 20px; font-weight: 800; color: #351903; margin: 6px 0 2px 0; }"
                + ".advisor-role { font-size: 13px; color: #718096; }"
                + ".details-table { width: 100%; border-collapse: collapse; margin-top: 18px; }"
                + ".details-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }"
                + ".details-table td.label { font-weight: 600; color: #64748b; width: 35%; }"
                + ".details-table td.value { color: #0f172a; font-weight: 500; }"
                + ".status-pill { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }"
                + ".note-box { background: #f8fafc; border-left: 4px solid #036c39; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; line-height: 1.5; }"
                + ".footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; }"
                + "</style></head>"
                + "<body>"
                + "<div class='container'>"
                + "  <div class='header'>"
                + "    <h1>🌱 AgroHeno</h1>"
                + "    <p>Actualización de Caso - Asesor Técnico Asignado</p>"
                + "  </div>"
                + "  <div class='content'>"
                + "    <p class='greeting'>Hola <strong>" + escapeHtml(nombre) + "</strong>,</p>"
                + "    <p>Te informamos que tu solicitud de soporte ha sido asignada a un asesor técnico para su análisis detallado:</p>"
                + "    <div class='advisor-card'>"
                + "      <div class='advisor-title'>Asesor Especializado Asignado</div>"
                + "      <div class='advisor-name'>👤 " + escapeHtml(nombreAsesor) + "</div>"
                + "      <div class='advisor-role'>Soporte Técnico y Atención Postventa AgroHeno</div>"
                + "    </div>"
                + "    <table class='details-table'>"
                + "      <tr><td class='label'>N° Radicado:</td><td class='value'><strong>" + escapeHtml(ticket.getCodigoRadicado()) + "</strong></td></tr>"
                + "      <tr><td class='label'>Asunto:</td><td class='value'>" + escapeHtml(ticket.getTituloTicket()) + "</td></tr>"
                + "      <tr><td class='label'>Nuevo estado:</td><td class='value'><span class='status-pill'>EN ANÁLISIS</span></td></tr>"
                + "      <tr><td class='label'>Límite estimado (SLA):</td><td class='value'>" + escapeHtml(fechaLimiteStr) + "</td></tr>"
                + "    </table>"
                + "    <div class='note-box'>Tu asesor ya se encuentra evaluando los antecedentes del caso para contactarte o emitir una solución dentro del tiempo pactado. Puedes hacer seguimiento en tiempo real desde tu <strong>Perfil de AgroHeno &gt; Mis Tickets</strong>.</div>"
                + "  </div>"
                + "  <div class='footer'>"
                + "    © " + java.time.Year.now().getValue() + " AgroHeno - Calidad que Alimenta el Futuro.<br>"
                + "    Este es un correo automático informativo generado por el sistema de tickets, por favor no responder directamente a este mensaje."
                + "  </div>"
                + "</div>"
                + "</body></html>";
    }

    /**
     * Envía un correo con diseño corporativo al cliente informando que su ticket
     * ha sido resuelto y detallando la respuesta/solución brindada por el asesor.
     */
    @Async
    public void enviarNotificacionTicketResuelto(Ticket ticket, String respuesta, String correoDestino, String nombreCliente) {
        if (correoDestino == null || correoDestino.trim().isEmpty()) {
            log.info("Ticket {}: El cliente no tiene correo registrado. Se omite el envío de ticket resuelto.", ticket.getCodigoRadicado());
            return;
        }

        if (mailSender == null || remitente == null || remitente.trim().isEmpty() || remitente.contains("tu_correo@gmail.com")) {
            log.warn("Ticket {}: El servicio de correo no está configurado en application.properties. Correo de solución no enviado.",
                    ticket.getCodigoRadicado());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(remitente, "AgroHeno Soporte");
            helper.setTo(correoDestino.trim());
            helper.setSubject("Ticket Solucionado [" + ticket.getCodigoRadicado() + "] - AgroHeno");

            String cuerpoHtml = construirPlantillaHtmlResuelto(ticket, respuesta, nombreCliente);
            helper.setText(cuerpoHtml, true);

            mailSender.send(message);
            log.info("Correo de resolución enviado exitosamente a {} para el ticket {}", correoDestino, ticket.getCodigoRadicado());
        } catch (Exception e) {
            log.error("No se pudo enviar el correo de resolución para el ticket {}: {}", ticket.getCodigoRadicado(), e.getMessage());
        }
    }

    private String construirPlantillaHtmlResuelto(Ticket ticket, String respuesta, String nombreCliente) {
        String nombre = (nombreCliente != null && !nombreCliente.trim().isEmpty()) ? nombreCliente : "Estimado/a cliente";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a");
        String fechaCierreStr = (ticket.getFechaFin() != null)
                ? ticket.getFechaFin().format(formatter)
                : java.time.LocalDateTime.now().format(formatter);
        String nombreAsesor = (ticket.getTecnicoAsignado() != null && ticket.getTecnicoAsignado().getNombre() != null)
                ? ticket.getTecnicoAsignado().getNombre()
                : "Equipo Técnico AgroHeno";
        String facturaTexto = (ticket.getFactura() != null && ticket.getFactura().getIdFactura() != null)
                ? "Factura #" + ticket.getFactura().getIdFactura()
                : "Sin factura vinculada";

        String respuestaFormateada = (respuesta != null && !respuesta.trim().isEmpty())
                ? escapeHtml(respuesta).replace("\r\n", "<br>").replace("\n", "<br>")
                : "El caso ha sido verificado y resuelto satisfactoriamente de acuerdo con nuestros estándares de servicio.";

        return "<!DOCTYPE html>"
                + "<html lang='es'>"
                + "<head><meta charset='UTF-8'><style>"
                + "body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }"
                + ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }"
                + ".header { background: linear-gradient(135deg, #036c39 0%, #024d28 100%); padding: 30px 24px; text-align: center; color: #ffffff; }"
                + ".header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }"
                + ".header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; color: #fdf6e2; }"
                + ".content { padding: 28px 24px; }"
                + ".greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }"
                + ".badge-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }"
                + ".status-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 1px; }"
                + ".radicado-code { font-size: 22px; font-weight: 800; color: #036c39; font-family: 'Consolas', monospace; margin: 4px 0 6px 0; }"
                + ".resolved-pill { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; background: #15803d; color: #ffffff; }"
                + ".solution-box { background: #fdf8ec; border: 1.5px solid rgba(204, 162, 67, 0.45); border-radius: 10px; padding: 18px 20px; margin: 22px 0; }"
                + ".solution-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #8c6814; letter-spacing: 0.8px; margin-bottom: 10px; }"
                + ".solution-text { font-size: 14.5px; color: #1e293b; line-height: 1.6; }"
                + ".details-table { width: 100%; border-collapse: collapse; margin-top: 18px; }"
                + ".details-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }"
                + ".details-table td.label { font-weight: 600; color: #64748b; width: 35%; }"
                + ".details-table td.value { color: #0f172a; font-weight: 500; }"
                + ".note-box { background: #f8fafc; border-left: 4px solid #036c39; padding: 12px 16px; margin: 22px 0; border-radius: 0 8px 8px 0; font-size: 13.5px; color: #334155; line-height: 1.5; }"
                + ".footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; }"
                + "</style></head>"
                + "<body>"
                + "<div class='container'>"
                + "  <div class='header'>"
                + "    <h1>🌱 AgroHeno</h1>"
                + "    <p>Centro de Atención y Soporte Postventa</p>"
                + "  </div>"
                + "  <div class='content'>"
                + "    <p class='greeting'>Hola <strong>" + escapeHtml(nombre) + "</strong>,</p>"
                + "    <p>Nos complace informarte que tu requerimiento de soporte ha sido atendido y <strong>resuelto con éxito</strong> por nuestro equipo técnico.</p>"
                + "    <div class='badge-box'>"
                + "      <div class='status-label'>Estado del Requerimiento</div>"
                + "      <div class='radicado-code'>" + escapeHtml(ticket.getCodigoRadicado()) + "</div>"
                + "      <span class='resolved-pill'>✓ RESUELTO</span>"
                + "    </div>"
                + "    <div class='solution-box'>"
                + "      <div class='solution-title'>📝 Solución y Dictamen del Asesor:</div>"
                + "      <div class='solution-text'>" + respuestaFormateada + "</div>"
                + "    </div>"
                + "    <table class='details-table'>"
                + "      <tr><td class='label'>Asunto:</td><td class='value'><strong>" + escapeHtml(ticket.getTituloTicket()) + "</strong></td></tr>"
                + "      <tr><td class='label'>Categoría:</td><td class='value'>" + escapeHtml(ticket.getCategoriaTicket() != null ? ticket.getCategoriaTicket() : "General") + "</td></tr>"
                + "      <tr><td class='label'>Referencia:</td><td class='value'>" + escapeHtml(facturaTexto) + "</td></tr>"
                + "      <tr><td class='label'>Atendido por:</td><td class='value'>👤 " + escapeHtml(nombreAsesor) + "</td></tr>"
                + "      <tr><td class='label'>Fecha de resolución:</td><td class='value'>" + escapeHtml(fechaCierreStr) + "</td></tr>"
                + "    </table>"
                + "    <div class='note-box'>Agradecemos tu confianza en <strong>AgroHeno</strong>. Puedes consultar el historial completo de tu caso en cualquier momento ingresando a tu cuenta en <strong>Mis Tickets</strong>.</div>"
                + "  </div>"
                + "  <div class='footer'>"
                + "    © " + java.time.Year.now().getValue() + " AgroHeno - Calidad que Alimenta el Futuro.<br>"
                + "    Este es un correo automático generado por el sistema de tickets, por favor no responder directamente a este mensaje."
                + "  </div>"
                + "</div>"
                + "</body></html>";
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
    }

    /**
     * Envía un correo con diseño corporativo y el PDF de la factura adjunto
     * al cliente cuando se procesa una compra exitosa.
     */
    @Async
    public void enviarFacturaConPdf(Factura factura, List<DetalleVenta> detalles, String correoDestino) {
        if (correoDestino == null || correoDestino.trim().isEmpty()) {
            log.info("Factura #{}: No se especificó correo electrónico de destino. Se omite el envío del correo.", factura.getIdFactura());
            return;
        }

        if (mailSender == null || remitente == null || remitente.trim().isEmpty() || remitente.contains("tu_correo@gmail.com")) {
            log.warn("Factura #{}: El servicio de correo no está configurado en application.properties (spring.mail.username). Correo no enviado.",
                    factura.getIdFactura());
            return;
        }

        try {
            byte[] pdfBytes = generarFacturaPdf(factura, detalles);
            if (pdfBytes == null || pdfBytes.length == 0) {
                log.warn("Factura #{}: No se pudo generar el archivo PDF de la factura para enviar por correo.", factura.getIdFactura());
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(remitente, "AgroHeno Facturación");
            helper.setTo(correoDestino.trim());
            helper.setSubject("Factura de Compra [FACT-" + (factura.getIdFactura() != null ? factura.getIdFactura() : "") + "] - AgroHeno");

            String cuerpoHtml = construirPlantillaHtmlFactura(factura, detalles);
            helper.setText(cuerpoHtml, true);

            String nombreAdjunto = "Factura_AgroHeno_" + (factura.getIdFactura() != null ? factura.getIdFactura() : "compra") + ".pdf";
            helper.addAttachment(nombreAdjunto, new ByteArrayResource(pdfBytes));

            mailSender.send(message);
            log.info("Factura #{}: Correo con PDF adjunto enviado exitosamente a {}", factura.getIdFactura(), correoDestino);
        } catch (Exception e) {
            log.error("Factura #{}: Error al enviar el correo con la factura PDF a {}: {}", factura.getIdFactura(), correoDestino, e.getMessage(), e);
        }
    }

    /**
     * Genera en memoria el documento PDF de la factura con el diseño oficial de AgroHeno
     * (idéntico para descarga web y envío por correo electrónico).
     */
    public byte[] generarFacturaPdf(Factura factura, List<DetalleVenta> detalles) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Márgenes exactos (14mm izq/der = 182mm ancho útil; 96mm arriba para el encabezado superior)
            Document document = new Document(PageSize.A4, mm(14f), mm(14f), mm(96f), mm(26f));
            PdfWriter writer = PdfWriter.getInstance(document, baos);

            // Pie de página idéntico en cada hoja
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter w, Document doc) {
                    PdfContentByte canvas = w.getDirectContent();
                    canvas.saveState();
                    canvas.setColorStroke(new Color(200, 200, 200));
                    canvas.setLineWidth(0.6f);
                    canvas.moveTo(mm(14f), yFromTop(275f));
                    canvas.lineTo(mm(196f), yFromTop(275f));
                    canvas.stroke();
                    canvas.restoreState();

                    Font thanksFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(148, 163, 184));
                    Font subFooterFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(150, 150, 150));
                    ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER,
                            new Phrase("Gracias por su compra en AgroHeno.", thanksFont), mm(105f), yFromTop(281f), 0);
                    ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER,
                            new Phrase("Fabricantes de heno", subFooterFont), mm(105f), yFromTop(287f), 0);
                }
            });

            document.open();
            PdfContentByte cb = writer.getDirectContent();

            // Paleta oficial del formato de factura AgroHeno
            Color brandGreen = new Color(56, 161, 105);     // RGB(56, 161, 105)
            Color altMintGreen = new Color(240, 253, 244);  // RGB(240, 253, 244)
            Color totalsCardBg = new Color(248, 250, 252);  // RGB(248, 250, 252)
            Color titleDark = new Color(30, 41, 59);        // RGB(30, 41, 59)
            Color labelSlate = new Color(71, 85, 105);      // RGB(71, 85, 105)
            Color bodySlate = new Color(51, 65, 85);
            Color gridBorder = new Color(200, 200, 200);

            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA, 22, brandGreen);
            Font facturaTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 14, titleDark);
            Font clienteTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 11, titleDark);
            Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 10, labelSlate);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, Color.WHITE);
            Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, bodySlate);
            Font totalBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, titleDark);

            // 1. Logo + Marca AgroHeno + Línea divisoria verde
            float textLogoX = mm(14f);
            try {
                ClassPathResource logoResource = new ClassPathResource("Logo2.png");
                if (logoResource.exists()) {
                    try (InputStream is = logoResource.getInputStream()) {
                        byte[] logoBytes = is.readAllBytes();
                        Image logoImg = Image.getInstance(logoBytes);
                        float logoHeightPt = mm(25f);
                        float aspectRatio = logoImg.getHeight() > 0 ? (logoImg.getWidth() / logoImg.getHeight()) : 1.0f;
                        float logoWidthPt = logoHeightPt * aspectRatio;
                        logoImg.scaleAbsolute(logoWidthPt, logoHeightPt);
                        logoImg.setAbsolutePosition(mm(14f), yFromTop(35f));
                        document.add(logoImg);
                        textLogoX = mm(14f) + logoWidthPt + mm(5f);
                    }
                }
            } catch (Exception ex) {
                log.warn("No se pudo cargar Logo2.png para el PDF: {}", ex.getMessage());
            }

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("AgroHeno", brandFont), textLogoX, yFromTop(24f), 0);

            cb.saveState();
            cb.setColorStroke(brandGreen);
            cb.setLineWidth(mm(0.5f));
            cb.moveTo(mm(14f), yFromTop(40f));
            cb.lineTo(mm(196f), yFromTop(40f));
            cb.stroke();
            cb.restoreState();

            // 2. Bloque izquierdo: FACTURA DE VENTA + metadatos
            String idFacturaStr = (factura.getIdFactura() != null) ? factura.getIdFactura().toString() : "Pendiente";
            String fechaRaw = (factura.getFechaFactura() != null) ? factura.getFechaFactura().toString() : java.time.LocalDate.now().toString();
            String fechaStr = fechaRaw.contains("T") ? fechaRaw.substring(0, fechaRaw.indexOf('T')) : fechaRaw;
            String tipoVenta = (factura.getEnvio() > 0) ? "Online" : "POS";

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("FACTURA DE VENTA", facturaTitleFont), mm(14f), yFromTop(50f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("N° Factura: " + idFacturaStr, infoFont), mm(14f), yFromTop(60f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Fecha: " + fechaStr, infoFont), mm(14f), yFromTop(67f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Tipo de Venta: " + tipoVenta, infoFont), mm(14f), yFromTop(74f), 0);

            // 3. Bloque derecho: Datos del Cliente
            String nombreC = (factura.getNombreC() != null && !factura.getNombreC().isBlank()) ? factura.getNombreC() : "Consumidor Final";
            String cedulaC = (factura.getCedulaC() != null && !factura.getCedulaC().isBlank()) ? factura.getCedulaC() : "-";
            String telefonoC = (factura.getTelefonoC() != null && !factura.getTelefonoC().isBlank()) ? factura.getTelefonoC() : "-";
            String correoC = (factura.getCorreoC() != null && !factura.getCorreoC().isBlank()) ? factura.getCorreoC() : "No registrado";
            String direccionC = (factura.getDireccionC() != null && !factura.getDireccionC().isBlank()) ? factura.getDireccionC() : "-";

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Datos del Cliente:", clienteTitleFont), mm(120f), yFromTop(50f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Nombre: " + nombreC, infoFont), mm(120f), yFromTop(58f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Cédula/NIT: " + cedulaC, infoFont), mm(120f), yFromTop(65f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Teléfono: " + telefonoC, infoFont), mm(120f), yFromTop(72f), 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Correo: " + correoC, infoFont), mm(120f), yFromTop(79f), 0);

            ColumnText ctDir = new ColumnText(cb);
            ctDir.setSimpleColumn(mm(120f), yFromTop(95f), mm(196f), yFromTop(81.5f));
            Paragraph pDir = new Paragraph("Dirección: " + direccionC, infoFont);
            pDir.setLeading(12.5f);
            ctDir.addElement(pDir);
            ctDir.go();

            // 4. Tabla de Productos (inicia exactamente en y = 96mm)
            PdfPTable itemsTable = new PdfPTable(5);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{18f, 22f, 22f, 18f, 20f});
            itemsTable.setHeaderRows(1);

            String[] headers = {"ID Producto", "Tipo de Heno", "Costo Unitario", "Cantidad", "Costo Total"};
            for (String h : headers) {
                PdfPCell hc = new PdfPCell(new Phrase(h, tableHeaderFont));
                hc.setBackgroundColor(brandGreen);
                hc.setBorderColor(gridBorder);
                hc.setBorderWidth(0.4f);
                hc.setPaddingTop(5.5f);
                hc.setPaddingBottom(6.5f);
                hc.setPaddingLeft(6f);
                hc.setPaddingRight(6f);
                hc.setHorizontalAlignment(Element.ALIGN_LEFT);
                itemsTable.addCell(hc);
            }

            boolean filaBlanca = false;
            if (detalles != null && !detalles.isEmpty()) {
                for (DetalleVenta d : detalles) {
                    Color rowBg = filaBlanca ? Color.WHITE : altMintGreen;
                    filaBlanca = !filaBlanca;

                    String idProd = (d.getHeno() != null && d.getHeno().getIdHeno() != null) ? d.getHeno().getIdHeno().toString() : "-";
                    String nombreHeno = (d.getHeno() != null && d.getHeno().getNombre() != null) ? d.getHeno().getNombre() : "Producto";
                    double precioU = (d.getHeno() != null && d.getHeno().getPrecioU() != null) ? d.getHeno().getPrecioU() : 0.0;
                    int cant = (d.getCantidad() != null) ? d.getCantidad() : 0;
                    double totalLinea = precioU * cant;

                    String[] rowValues = {
                        idProd,
                        nombreHeno,
                        formatearPesos(precioU),
                        String.valueOf(cant),
                        formatearPesos(totalLinea)
                    };

                    for (String val : rowValues) {
                        PdfPCell cell = new PdfPCell(new Phrase(val, tableBodyFont));
                        cell.setBackgroundColor(rowBg);
                        cell.setBorderColor(gridBorder);
                        cell.setBorderWidth(0.4f);
                        cell.setPaddingTop(5.5f);
                        cell.setPaddingBottom(6.5f);
                        cell.setPaddingLeft(6f);
                        cell.setPaddingRight(6f);
                        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
                        itemsTable.addCell(cell);
                    }
                }
            }
            document.add(itemsTable);

            // 5. Caja redondeada de Totales alineada a la derecha (66mm de ancho)
            double total = (factura.getTotalVenta() != null) ? factura.getTotalVenta() : 0.0;
            double envio = factura.getEnvio();
            double subtotalNeto = Math.max(0.0, total - envio);

            PdfPTable outerTotales = new PdfPTable(1);
            outerTotales.setTotalWidth(mm(66f));
            outerTotales.setLockedWidth(true);
            outerTotales.setHorizontalAlignment(Element.ALIGN_RIGHT);
            outerTotales.setSpacingBefore(mm(5f));

            PdfPCell outerCell = new PdfPCell();
            outerCell.setBorder(Rectangle.NO_BORDER);
            outerCell.setPaddingTop(mm(3.5f));
            outerCell.setPaddingBottom(mm(4f));
            outerCell.setPaddingLeft(mm(5f));
            outerCell.setPaddingRight(mm(4f));
            outerCell.setCellEvent(new PdfPCellEvent() {
                @Override
                public void cellLayout(PdfPCell cell, Rectangle position, PdfContentByte[] canvases) {
                    PdfContentByte bg = canvases[PdfPTable.BACKGROUNDCANVAS];
                    bg.saveState();
                    bg.setColorFill(totalsCardBg);
                    bg.roundRectangle(position.getLeft(), position.getBottom(),
                            position.getWidth(), position.getHeight(), mm(2f));
                    bg.fill();
                    bg.restoreState();
                }
            });

            PdfPTable innerTotales = new PdfPTable(2);
            innerTotales.setWidthPercentage(100);
            innerTotales.setWidths(new float[]{45f, 55f});

            // Subtotal
            PdfPCell subLbl = new PdfPCell(new Phrase("Subtotal:", infoFont));
            subLbl.setBorder(Rectangle.NO_BORDER);
            subLbl.setPaddingBottom(4f);
            innerTotales.addCell(subLbl);

            PdfPCell subVal = new PdfPCell(new Phrase(formatearPesos(subtotalNeto), infoFont));
            subVal.setBorder(Rectangle.NO_BORDER);
            subVal.setPaddingBottom(4f);
            subVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            innerTotales.addCell(subVal);

            // Envío
            PdfPCell envLbl = new PdfPCell(new Phrase("Envío:", infoFont));
            envLbl.setBorder(Rectangle.NO_BORDER);
            envLbl.setPaddingBottom(7f);
            innerTotales.addCell(envLbl);

            PdfPCell envVal = new PdfPCell(new Phrase(formatearPesos(envio), infoFont));
            envVal.setBorder(Rectangle.NO_BORDER);
            envVal.setPaddingBottom(7f);
            envVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            innerTotales.addCell(envVal);

            // TOTAL
            PdfPCell totLbl = new PdfPCell(new Phrase("TOTAL:", totalBoldFont));
            totLbl.setBorder(Rectangle.NO_BORDER);
            innerTotales.addCell(totLbl);

            PdfPCell totVal = new PdfPCell(new Phrase(formatearPesos(total), totalBoldFont));
            totVal.setBorder(Rectangle.NO_BORDER);
            totVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            innerTotales.addCell(totVal);

            outerCell.addElement(innerTotales);
            outerTotales.addCell(outerCell);
            document.add(outerTotales);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Error al generar el PDF de la factura {}: {}", factura.getIdFactura(), e.getMessage(), e);
            return null;
        }
    }

    private static float mm(float millimeters) {
        return millimeters * 2.8346457f;
    }

    private static float yFromTop(float topMillimeters) {
        return PageSize.A4.getHeight() - mm(topMillimeters);
    }

    private String formatearPesos(Double valor) {
        if (valor == null) valor = 0.0;
        NumberFormat nf = NumberFormat.getNumberInstance(new Locale("es", "CO"));
        nf.setMaximumFractionDigits(0);
        return "$" + nf.format(valor);
    }

    private String construirPlantillaHtmlFactura(Factura factura, List<DetalleVenta> detalles) {
        String nombre = (factura.getNombreC() != null && !factura.getNombreC().trim().isEmpty()) ? factura.getNombreC() : "Estimado/a cliente";
        String idFacturaStr = (factura.getIdFactura() != null) ? "FACT-" + factura.getIdFactura() : "FACT-PENDIENTE";
        String fechaStr = (factura.getFechaFactura() != null) ? factura.getFechaFactura().toString() : java.time.LocalDate.now().toString();
        String totalFormateado = formatearMoneda(factura.getTotalVenta());
        String metodoEntrega = (factura.getEnvio() > 0) ? "Envío a domicilio" : "Recogida en bodega";

        StringBuilder filasProductos = new StringBuilder();
        if (detalles != null) {
            for (DetalleVenta d : detalles) {
                String nom = (d.getHeno() != null && d.getHeno().getNombre() != null) ? escapeHtml(d.getHeno().getNombre()) : "Heno";
                int cant = (d.getCantidad() != null) ? d.getCantidad() : 0;
                double pu = (d.getHeno() != null && d.getHeno().getPrecioU() != null) ? d.getHeno().getPrecioU() : 0.0;
                filasProductos.append("<tr>")
                        .append("<td style='padding:8px 10px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#1e293b;'>").append(nom).append("</td>")
                        .append("<td style='padding:8px 10px; border-bottom:1px solid #f1f5f9; font-size:13px; text-align:center; color:#1e293b;'>").append(cant).append(" pacas</td>")
                        .append("<td style='padding:8px 10px; border-bottom:1px solid #f1f5f9; font-size:13px; text-align:right; font-weight:600; color:#036c39;'>").append(formatearMoneda(pu * cant)).append("</td>")
                        .append("</tr>");
            }
        }

        return "<!DOCTYPE html>"
                + "<html lang='es'>"
                + "<head><meta charset='UTF-8'><style>"
                + "body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }"
                + ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }"
                + ".header { background: linear-gradient(135deg, #036c39 0%, #024d28 100%); padding: 30px 24px; text-align: center; color: #ffffff; }"
                + ".header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }"
                + ".header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; color: #fdf6e2; }"
                + ".content { padding: 28px 24px; }"
                + ".greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }"
                + ".badge-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }"
                + ".factura-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 1px; }"
                + ".factura-code { font-size: 24px; font-weight: 800; color: #036c39; font-family: 'Consolas', monospace; margin: 4px 0 6px 0; }"
                + ".success-pill { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #15803d; color: #ffffff; }"
                + ".details-table { width: 100%; border-collapse: collapse; margin-top: 18px; }"
                + ".details-table td { padding: 9px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }"
                + ".details-table td.label { font-weight: 600; color: #64748b; width: 35%; }"
                + ".details-table td.value { color: #0f172a; font-weight: 500; }"
                + ".products-table { width: 100%; border-collapse: collapse; margin-top: 14px; background: #f8fafc; border-radius: 8px; overflow: hidden; }"
                + ".products-table th { background: #e2e8f0; padding: 9px 10px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }"
                + ".pdf-attachment-banner { background: #fdf8ec; border: 1.5px solid rgba(204, 162, 67, 0.45); border-radius: 10px; padding: 14px 18px; margin: 22px 0; text-align: center; }"
                + ".pdf-attachment-banner p { margin: 0; font-size: 14px; color: #351903; }"
                + ".footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; }"
                + "</style></head>"
                + "<body>"
                + "<div class='container'>"
                + "  <div class='header'>"
                + "    <h1>🌱 AgroHeno</h1>"
                + "    <p>Confirmación de Compra y Factura Electrónica</p>"
                + "  </div>"
                + "  <div class='content'>"
                + "    <p class='greeting'>Hola <strong>" + escapeHtml(nombre) + "</strong>,</p>"
                + "    <p>¡Gracias por tu compra! Tu pedido ha sido procesado exitosamente y hemos generado tu comprobante de venta.</p>"
                + "    <div class='badge-box'>"
                + "      <div class='factura-label'>Número de Factura</div>"
                + "      <div class='factura-code'>" + escapeHtml(idFacturaStr) + "</div>"
                + "      <span class='success-pill'>✓ PAGO CONFIRMADO</span>"
                + "    </div>"
                + "    <div class='pdf-attachment-banner'>"
                + "      <p>📎 <strong>Documento PDF Adjunto:</strong> Hemos adjuntado a este correo tu factura oficial en formato PDF para que puedas descargarla o imprimirla.</p>"
                + "    </div>"
                + "    <table class='details-table'>"
                + "      <tr><td class='label'>Fecha:</td><td class='value'>" + escapeHtml(fechaStr) + "</td></tr>"
                + "      <tr><td class='label'>Cliente:</td><td class='value'>" + escapeHtml(factura.getNombreC()) + " (CC: " + escapeHtml(factura.getCedulaC()) + ")</td></tr>"
                + "      <tr><td class='label'>Método de Entrega:</td><td class='value'>" + escapeHtml(metodoEntrega) + "</td></tr>"
                + "      <tr><td class='label'>Dirección:</td><td class='value'>" + escapeHtml(factura.getDireccionC() != null ? factura.getDireccionC() : "Finca Santa Helena") + "</td></tr>"
                + "      <tr><td class='label'>Total Pagado:</td><td class='value'><strong style='color:#036c39; font-size:16px;'>" + escapeHtml(totalFormateado) + "</strong></td></tr>"
                + "    </table>"
                + "    <h4 style='margin:20px 0 8px 0; color:#334155; font-size:14px;'>Detalle de Productos:</h4>"
                + "    <table class='products-table'>"
                + "      <tr><th style='text-align:left;'>Producto</th><th style='text-align:center;'>Cantidad</th><th style='text-align:right;'>Subtotal</th></tr>"
                + filasProductos.toString()
                + "    </table>"
                + "  </div>"
                + "  <div class='footer'>"
                + "    © " + java.time.Year.now().getValue() + " AgroHeno - Calidad que Alimenta el Futuro.<br>"
                + "    Finca Santa Helena - La Dorada, Caldas | agrohenosoporte@gmail.com"
                + "  </div>"
                + "</div>"
                + "</body></html>";
    }

    private String formatearMoneda(Double valor) {
        if (valor == null) valor = 0.0;
        NumberFormat nf = NumberFormat.getNumberInstance(new Locale("es", "CO"));
        nf.setMaximumFractionDigits(0);
        return "$" + nf.format(valor) + " COP";
    }
}
