export interface Factura {
    idFactura: number;
    cedulaU?: string;
    fechaFactura: string;
    totalVenta: number;
    nombreC: string;
    cedulaC: string;
    direccionC: string;
    telefonoC: string;
    correoC?: string;
    envio: number;
}
