export type CategoriaPregunta =
    | 'CALIDAD_FORRAJE'
    | 'LOGISTICA'
    | 'FACTURACION'
    | 'GENERAL'
    | string;

export interface PreguntasFrecuentes {
    idPregunta?: number;
    pregunta: string;
    respuesta: string;
    categoria: string;
    orden?: number;
    activo?: boolean;
    abierta?: boolean;
}
