import { Cliente } from './Cliente';
import { Factura } from './Factura';
import { Usuario } from '../services/admin.service';

export type CategoriaTicket =
    | 'CALIDAD_FORRAJE'
    | 'LOGISTICA'
    | 'FACTURACION'
    | 'SOPORTE_WEB'
    | string;

export type PrioridadTicket =
    | 'CRITICA'
    | 'ALTA'
    | 'MEDIA'
    | 'BAJA'
    | string;

export type EstadoTicket =
    | 'RADICADO'
    | 'EN_ANALISIS'
    | 'EN_CAMPO'
    | 'RESUELTO'
    | 'CERRADO'
    | string;

export interface Ticket {
    idTicket?: number;
    codigoRadicado?: string;
    tituloTicket: string;
    descripcionTicket: string;
    categoriaTicket: CategoriaTicket;
    prioridad?: PrioridadTicket;
    puntajePrioridad?: number;
    estadoTicket?: EstadoTicket;
    fechaInicio?: string;
    fechaActualizacion?: string;
    fechaLimite?: string;
    fechaFin?: string;
    slaVencido?: boolean;
    respuesta?: string;
    evidenciaImg?: string;

    // Relaciones con otras entidades
    factura?: Factura | { idFactura: number } | null;
    tecnicoAsignado?: Usuario | { cedulaU: number } | null;
    cliente?: Cliente | { cedula: string } | null;
}
