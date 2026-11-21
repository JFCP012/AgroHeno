import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardKpis } from '../models/kpi-dashboard.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class KpiService {
    private http = inject(HttpClient);
    private apiUrl = `${API_BASE_URL}/Reportes`;

    obtenerKpis(soloSoporte: boolean, anio?: number | null, mes?: number | null): Observable<DashboardKpis> {
        let params = new HttpParams().set('soloSoporte', String(soloSoporte));
        if (anio) {
            params = params.set('anio', String(anio));
        }
        if (mes) {
            params = params.set('mes', String(mes));
        }
        return this.http.get<DashboardKpis>(`${this.apiUrl}/kpis`, { params });
    }
}