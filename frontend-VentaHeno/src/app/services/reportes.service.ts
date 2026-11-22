import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReporteVentaMensual, ReporteFacturasAnimal, Animal, ReporteFacturasHeno, ReporteVentaCliente } from '../models/reporte-venta.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {

  private apiUrl = `${API_BASE_URL}/Reportes`;
  private animalUrl = `${API_BASE_URL}/animal`;

  constructor(private http: HttpClient) { }

  obtenerReportePorMes(anio: number, mes: number): Observable<ReporteVentaMensual> {
    const params = new HttpParams().set('anio', String(anio)).set('mes', String(mes));
    return this.http.get<ReporteVentaMensual>(`${this.apiUrl}/ventasPorMes`, { params });
  }

  obtenerReportePorAnimal(idAnimal: number, nombreAnimal: string): Observable<ReporteFacturasAnimal> {
    const params = new HttpParams().set('idAnimal', String(idAnimal)).set('nombreAnimal', nombreAnimal);
    return this.http.get<ReporteFacturasAnimal>(`${this.apiUrl}/ventasPorAnimal`, { params });
  }

  obtenerAnimales(): Observable<Animal[]> {
    return this.http.get<Animal[]>(`${this.animalUrl}/todos`);
  }

  obtenerReportePorHeno(nombreHeno: string): Observable<ReporteFacturasHeno> {
    const params = new HttpParams().set('nombreHeno', nombreHeno);
    return this.http.get<ReporteFacturasHeno>(`${this.apiUrl}/ventasPorHeno`, { params });
  }

  obtenerReportePorCliente(cedula: string): Observable<ReporteVentaCliente> {
    const params = new HttpParams().set('cedula', cedula);
    return this.http.get<ReporteVentaCliente>(`${this.apiUrl}/ventasPorCliente`, { params });
  }
}
