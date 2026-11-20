import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Usuario {
  cedulaU: number;
  nombre: string;
  rol: string;
}

export interface NuevoUsuario {
  cedulaU: number;
  nombre: string;
  clave: string;
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

  isGestorTicketsLoggedIn(): boolean {
    const rawRol = (sessionStorage.getItem('rol') || '').toUpperCase().trim();
    const cleanRol = rawRol.replace(/[^A-Z]/g, '');
    return cleanRol === 'GESTORTICKETS' || cleanRol === 'GESTOR' || cleanRol.includes('TICKET') || rawRol === 'ADMIN';
  }

  isAsesorLoggedIn(): boolean {
    const rawRol = (sessionStorage.getItem('rol') || '').toUpperCase().trim();
    const cleanRol = rawRol.replace(/[^A-Z]/g, '');
    return cleanRol === 'ASESOR' || cleanRol.includes('ASESOR') || cleanRol.includes('TECNICO') || rawRol === 'ADMIN';
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

  crearUsuario(usuario: NuevoUsuario): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crearUsuario`, usuario);
  }

  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/listarUsuarios`);
  }
}
