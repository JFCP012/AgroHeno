package com.HenoTrade.ventaHeno.service;

import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

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
}
