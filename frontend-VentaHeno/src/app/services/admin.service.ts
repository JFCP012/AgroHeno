import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Usuario {
  cedulaU: number;
  nombre: string;
  rol: string;
  activo?: boolean;
}

export interface NuevoUsuario {
  cedulaU: number;
  nombre: string;
  clave: string;
  rol: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl = `${API_BASE_URL}/Admin`;

  constructor(private http: HttpClient) { }

  loginAdmin(cedulaU: number, clave: string): Observable<any> {
    this.logoutAdmin();
    return this.http.get<any>(`${this.apiUrl}/login?cedulaU=${cedulaU}&clave=${encodeURIComponent(clave)}`)
      .pipe(
        tap(response => {
          if (response && typeof response === 'object') {
            if (response.activo === false) {
              this.logoutAdmin();
              throw new Error('El usuario se encuentra inactivo. Comuníquese con el administrador.');
            }
            sessionStorage.setItem('usuario', JSON.stringify(response));
            const rawRol = (response.rol || 'admin').trim().toLowerCase();
            const rol = rawRol.includes('admin') ? 'admin' : (rawRol.includes('asesor') ? 'asesor' : 'gestorTickets');
            sessionStorage.setItem('rol', rol);
            sessionStorage.setItem('isAdmin', rol === 'admin' ? 'true' : 'false');
          } else {
            this.logoutAdmin();
          }
        })
      );
  }

  isAdminLoggedIn(): boolean {
    const usuario = this.getUsuario();
    if (usuario && usuario.activo === false) return false;
    const rol = (sessionStorage.getItem('rol') || '').toLowerCase();
    return rol === 'admin' || (sessionStorage.getItem('isAdmin') === 'true' && !rol);
  }

  isGestorTicketsLoggedIn(): boolean {
    const usuario = this.getUsuario();
    if (usuario && usuario.activo === false) return false;
    const rol = (sessionStorage.getItem('rol') || '').toLowerCase();
    return rol === 'gestortickets' || this.isAdminLoggedIn();
  }

  isAsesorLoggedIn(): boolean {
    const usuario = this.getUsuario();
    if (usuario && usuario.activo === false) return false;
    const rol = (sessionStorage.getItem('rol') || '').toLowerCase();
    return rol === 'asesor' || rol === 'admin';
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

  editarUsuario(cedulaU: number, usuario: Partial<Usuario & { clave?: string }>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/editar/${cedulaU}`, usuario);
  }

  cambiarEstadoUsuario(cedulaU: number): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/desactivar/${cedulaU}`, {});
  }

  desactivarUsuario(cedulaU: number): Observable<Usuario> {
    return this.cambiarEstadoUsuario(cedulaU);
  }

  activarUsuario(cedulaU: number): Observable<Usuario> {
    return this.cambiarEstadoUsuario(cedulaU);
  }
}
