import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Usuario {
  cedulaU: number;
  nombre: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl = `${API_BASE_URL}/Admin`;

  constructor(private http: HttpClient) { }

  loginAdmin(cedulaU: number, clave: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/login?cedulaU=${cedulaU}&clave=${encodeURIComponent(clave)}`)
      .pipe(
        tap(response => {
          if (response && typeof response === 'object') {
            sessionStorage.setItem('usuario', JSON.stringify(response));
            const rol = (response.rol || 'ADMIN').toUpperCase();
            sessionStorage.setItem('rol', rol);
            sessionStorage.setItem('isAdmin', rol === 'ADMIN' ? 'true' : 'false');
          } else if (response === true) {
            sessionStorage.setItem('isAdmin', 'true');
            sessionStorage.setItem('rol', 'ADMIN');
          } else {
            sessionStorage.removeItem('isAdmin');
            sessionStorage.removeItem('rol');
            sessionStorage.removeItem('usuario');
          }
        })
      );
  }

  isAdminLoggedIn(): boolean {
    const rol = sessionStorage.getItem('rol');
    return rol === 'ADMIN' || (sessionStorage.getItem('isAdmin') === 'true' && !rol);
  }

  getRol(): string | null {
    return sessionStorage.getItem('rol');
  }

  getUsuario(): Usuario | null {
    const data = sessionStorage.getItem('usuario');
    return data ? JSON.parse(data) : null;
  }

  logoutAdmin() {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('rol');
    sessionStorage.removeItem('usuario');
  }
}
