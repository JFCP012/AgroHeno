import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PreguntasFrecuentes } from '../models/preguntasFrecuentes';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class PreguntasFrecuentesService {

    private apiUrl = `${API_BASE_URL}/preguntasFrecuentes`;

    constructor(private http: HttpClient) { }

    crearPreguntasFrecuentes(pregunta: PreguntasFrecuentes): Observable<PreguntasFrecuentes> {
        return this.http.post<PreguntasFrecuentes>(`${this.apiUrl}/CrearPreguntaFrecuente`, pregunta);
    }

    listarTodas(): Observable<PreguntasFrecuentes[]> {
        return this.http.get<PreguntasFrecuentes[]>(`${this.apiUrl}/listar`);
    }

    buscarPorFiltros(categoria?: string, activo?: boolean): Observable<PreguntasFrecuentes[]> {
        const params = new URLSearchParams();
        if (categoria && categoria !== 'TODAS') {
            params.append('categoria', categoria);
        }
        if (activo !== undefined && activo !== null) {
            params.append('activo', String(activo));
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.http.get<PreguntasFrecuentes[]>(`${this.apiUrl}/filtrar${query}`);
    }

    buscarPorCategoria(categoria: string): Observable<PreguntasFrecuentes[]> {
        return this.buscarPorFiltros(categoria);
    }

    buscarPorId(id: number): Observable<PreguntasFrecuentes> {
        return this.http.get<PreguntasFrecuentes>(`${this.apiUrl}/buscarPorId?id=${id}`);
    }

    editar(id: number, pregunta: PreguntasFrecuentes): Observable<PreguntasFrecuentes> {
        return this.http.put<PreguntasFrecuentes>(`${this.apiUrl}/editar/${id}`, pregunta);
    }

    desactivar(id: number): Observable<PreguntasFrecuentes> {
        return this.http.put<PreguntasFrecuentes>(`${this.apiUrl}/desactivar/${id}`, {});
    }

}