import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket } from '../models/ticket';
import { Usuario } from './admin.service';
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

  filtrarTickets(estado?: string, prioridad?: string, categoria?: string, busqueda?: string): Observable<Ticket[]> {
    let params = new HttpParams();
    if (estado && estado !== 'TODOS') params = params.set('estado', estado);
    if (prioridad && prioridad !== 'TODAS') params = params.set('prioridad', prioridad);
    if (categoria && categoria !== 'TODAS') params = params.set('categoria', categoria);
    if (busqueda && busqueda.trim()) params = params.set('busqueda', busqueda.trim());

    return this.http.get<Ticket[]>(`${this.apiUrl}/filtrar`, { params });
  }

  obtenerTicketsPorCliente(cedula: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/cliente/${cedula}`);
  }

  buscarPorClienteYEstado(cedula: string, estado?: string, categoria?: string): Observable<Ticket[]> {
    let params = new HttpParams().set('cedula', cedula);
    if (estado && estado !== 'TODOS') {
      params = params.set('estado', estado);
    }
    if (categoria && categoria !== 'TODAS') {
      params = params.set('categoria', categoria);
    }
    return this.http.get<Ticket[]>(`${this.apiUrl}/buscarPorClienteYEstado`, { params });
  }

  obtenerTicketsPorFactura(idFactura: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/factura/${idFactura}`);
  }

  asignarTecnico(idTicket: number, cedulaTecnico: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${idTicket}/asignarTecnico?cedulaTecnico=${cedulaTecnico}`, {});
  }

  actualizarPrioridad(idTicket: number, prioridad: string): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${idTicket}/prioridad?prioridad=${encodeURIComponent(prioridad)}`, {});
  }

  listarAsesores(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/asesores`);
  }

  buscarPorAsesor(cedula: string | number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/BuscarPorAsesor/${cedula}`);
  }

  buscarPorAsesorYEstado(cedula: string | number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/BuscarPorAsesorYEstado/${cedula}`);
  }

  buscarPorAsesorYFiltro(cedula: string | number, busqueda: string): Observable<Ticket[]> {
    const q = busqueda && busqueda.trim() ? `?busqueda=${encodeURIComponent(busqueda.trim())}` : '';
    return this.http.get<Ticket[]>(`${this.apiUrl}/BuscarPorAsesor/${cedula}${q}`);
  }

  buscarAtendidosPorAsesorYFecha(
    cedula: string | number,
    anio?: number | null,
    mes?: number | null,
    dia?: number | null
  ): Observable<Ticket[]> {
    const params: string[] = [];
    if (anio != null) params.push(`anio=${anio}`);
    if (mes != null) params.push(`mes=${mes}`);
    if (dia != null) params.push(`dia=${dia}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<Ticket[]>(`${this.apiUrl}/atendidosPorAsesor/${cedula}${q}`);
  }

  resolverTicket(idTicket: number, respuesta: string): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${idTicket}/resolver?respuesta=${encodeURIComponent(respuesta)}`, {});
  }
}
