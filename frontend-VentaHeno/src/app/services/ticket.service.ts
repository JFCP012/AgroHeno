import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket } from '../models/ticket';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private apiUrl = `${API_BASE_URL}/ticket`;

  constructor(private http: HttpClient) { }

  crearTicket(ticket: Ticket, imagen?: File | null): Observable<Ticket> {
    const formData = new FormData();
    formData.append('ticket', JSON.stringify(ticket));
    if (imagen) {
      formData.append('imagen', imagen);
    }
    return this.http.post<Ticket>(`${this.apiUrl}/CrearTicket`, formData);
  }

  listarTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/listar`);
  }

  obtenerTicketsPorCliente(cedula: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/cliente/${cedula}`);
  }

  obtenerTicketsPorFactura(idFactura: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/factura/${idFactura}`);
  }
}
