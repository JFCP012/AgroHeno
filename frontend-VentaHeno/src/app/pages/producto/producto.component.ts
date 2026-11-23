import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HenoService } from '../../services/heno.service';
import { AdminService } from '../../services/admin.service';
import { Heno } from '../../models/heno.model';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './producto.component.html',
  styleUrls: ['./producto.component.css']
})
export class ProductoComponent implements OnInit {
  constructor(private router: Router) { }

  henos: Heno[] = [];
  errorMsg = '';
  categoriaSeleccionada = '';

  // Variables para el modal de login de Admin
  mostrarModalLogin = false;
  idAdminInput: number | null = null;
  claveInput = '';
  loginError = '';

  private henoService = inject(HenoService);
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef); // 2. Inyectar el detector de cambios
  private carritoService = inject(CarritoService);

  ngOnInit() {
    // No cargamos ningún producto al iniciar la página.
    // Solo se mostrarán cuando el usuario presione un filtro.
  }

  get cantidadEnCarrito(): number {
    return this.carritoService.obtenerCantidadTotal();
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }

  cargarHenos(setCategoria = true) {
    if (setCategoria) {
      this.categoriaSeleccionada = 'Todos';
    } else {
      this.categoriaSeleccionada = '';
    }
    this.henoService.buscarHenos().subscribe({
      next: (data) => {
        this.henos = data.filter((h: Heno) => h.stock > 0 && h.estado !== 'Inactivo');
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMsg = 'Error al conectar con el backend: ' + error.message;
        console.error('Error al traer los henos:', error);
      }
    });
  }

  filtrarHenos(nombre: string) {
    this.categoriaSeleccionada = nombre;
    this.henoService.buscarHenosPorTipo(nombre).subscribe({
      next: (data) => {
        this.henos = data.filter((h: Heno) => h.stock > 0 && h.estado !== 'Inactivo');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al filtrar henos:', err);
        this.henos = [];
        this.cdr.detectChanges();
      }
    });
  }

  get esAdmin(): boolean {
    return this.adminService.isAdminLoggedIn();
  }

  volverAlPanel(): void {
    this.router.navigate(['/admin']);
  }

  abrirModalLogin() {
    if (this.adminService.isAdminLoggedIn()) {
      this.router.navigate(['/admin']);
      return;
    }
    this.mostrarModalLogin = true;
    this.idAdminInput = null;
    this.claveInput = '';
    this.loginError = '';
    this.cdr.detectChanges();
  }

  cerrarModalLogin() {
    this.mostrarModalLogin = false;
    this.cdr.detectChanges();
  }

  submitLoginAdmin() {
    if (!this.idAdminInput || !this.claveInput) {
      this.loginError = 'Por favor complete todos los campos';
      this.cdr.detectChanges();
      return;
    }

    this.adminService.loginAdmin(this.idAdminInput, this.claveInput).subscribe({
      next: (resp) => {
        if (resp && typeof resp === 'object') {
          // Bloquear terminantemente si el usuario está inactivo
          if (resp.activo === false) {
            this.adminService.logoutAdmin();
            this.loginError = 'El usuario se encuentra inactivo. Comuníquese con el administrador.';
            this.cdr.detectChanges();
            return;
          }

          const rawRol = (resp.rol || 'ADMIN').toUpperCase().trim();
          const cleanRol = rawRol.replace(/[^A-Z]/g, '');

          this.mostrarModalLogin = false;

          if (cleanRol === 'ADMIN' || cleanRol.includes('ADMIN')) {
            this.router.navigate(['/admin']);
          } else if (cleanRol === 'GESTORTICKETS' || cleanRol === 'GESTOR' || cleanRol.includes('TICKET')) {
            this.router.navigate(['/gestion-tickets']);
          } else if (cleanRol === 'ASESOR' || cleanRol.includes('ASESOR') || cleanRol.includes('TECNICO')) {
            this.router.navigate(['/asesor-tickets']);
          } else {
            this.adminService.logoutAdmin();
            this.loginError = `El rol (${resp.rol}) no tiene permisos para acceder a ningún panel.`;
            this.cdr.detectChanges();
          }
        } else if (resp === true) {
          this.mostrarModalLogin = false;
          this.router.navigate(['/admin']);
        } else {
          this.adminService.logoutAdmin();
          this.loginError = 'ID o clave incorrectos';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al iniciar sesión:', err);
        this.adminService.logoutAdmin();
        this.loginError = err.error?.message || (err.status === 401 ? 'ID o clave incorrectos' : 'Error en el servidor al intentar iniciar sesión.');
        this.cdr.detectChanges();
      }
    });
  }



  buscarHenosPorNombre(nombre: string) {
    this.categoriaSeleccionada = '';
    this.henoService.buscarHenosPorNombre(nombre).subscribe({
      next: (data) => {
        this.henos = data.filter((h: Heno) => h.stock > 0 && h.estado !== 'Inactivo');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al filtrar henos:', err);
        this.henos = [];
        this.cdr.detectChanges();
      }
    });
  }

  detallePorId(idHeno: number | undefined) {
    if (!idHeno) {
      this.errorMsg = 'ID de producto no válido';
      return;
    }
    this.router.navigate(['/detalle-producto', idHeno]);
  }

  getHeroImageUrl(): string {
    switch (this.categoriaSeleccionada) {
      case 'Equinos':
        return "url('assets/Imagenes/Caballos.png')";
      case 'Bovinos':
        return "url('assets/Imagenes/Vacas.png')";
      case 'Ovinos':
        return "url('assets/Imagenes/Ovejas.png')";
      case 'Todos':
      default:
        return "url('../assets/Imagenes/caballo_todos.png')";
    }
  }

  getHeroImagePosition(): string {
    switch (this.categoriaSeleccionada) {
      case 'Equinos':
      case 'Bovinos':
      case 'Ovinos':
        return 'center 70%';
      default:
        return 'center 30%';
    }
  }
}
