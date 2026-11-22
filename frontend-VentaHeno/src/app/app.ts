import { Component, signal, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarritoService } from './services/carrito.service';
import { ClienteService } from './services/cliente.service';
import { AdminService, Usuario } from './services/admin.service';
import { filter } from 'rxjs/operators';
import { Cliente } from './models/Cliente';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('frontend-VentaHeno');

  clienteService = inject(ClienteService);
  adminService = inject(AdminService);
  private router = inject(Router);
  carritoService = inject(CarritoService);
  private cdr = inject(ChangeDetectorRef);

  esRutaExcluida = false;
  mostrarLoginModal = false;
  cargandoLogin = false;
  clienteLogueado: Cliente | null = null;
  usuarioAdminLogueado: Usuario | null = null;
  mostrarAdminMenu = false;
  mostrarEditarPerfilAdmin = false;
  editAdminNombre: string = "";
  editAdminImagen: File | null = null;
  editAdminImagenPreview: string | null = null;
  guardandoPerfilAdmin = false;
  perfilAdminError: string = "";
  perfilAdminExito: string = "";
  idC: string = "";
  claveC: string = "";
  loginErrorMsg: string = "";
  cedulaErrorMsg: string = "";

  ngOnInit() {
    this.cargarClienteLogueado();
    this.cargarUsuarioAdminLogueado();

    // Escuchar activamente los eventos del Router para actualizar la exclusión de vistas y estado del cliente
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.cargarClienteLogueado();
      this.cargarUsuarioAdminLogueado();
      this.mostrarAdminMenu = false;
      this.actualizarEstadoExclusion(event.urlAfterRedirects || event.url);
      window.scrollTo(0, 0);
    });

    // Evaluar el estado de la ruta inicial
    this.actualizarEstadoExclusion(this.router.url);
  }

  private cargarUsuarioAdminLogueado() {
    this.usuarioAdminLogueado = this.adminService.getUsuario();
  }

  toggleAdminMenu() {
    this.mostrarAdminMenu = !this.mostrarAdminMenu;
  }

  cerrarSesionAdmin() {
    this.mostrarAdminMenu = false;
    this.adminService.logoutAdmin();
    this.usuarioAdminLogueado = null;
    this.router.navigate(['/producto']);
  }

  abrirEditarPerfilAdmin() {
    if (!this.usuarioAdminLogueado) return;
    this.mostrarAdminMenu = false;
    this.editAdminNombre = this.usuarioAdminLogueado.nombre || "";
    this.editAdminImagen = null;
    this.editAdminImagenPreview = this.usuarioAdminLogueado.imagen || null;
    this.perfilAdminError = "";
    this.perfilAdminExito = "";
    this.mostrarEditarPerfilAdmin = true;
  }

  cerrarEditarPerfilAdmin() {
    if (this.editAdminImagenPreview && this.editAdminImagenPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.editAdminImagenPreview);
    }
    this.editAdminImagen = null;
    this.editAdminImagenPreview = null;
    this.perfilAdminError = "";
    this.perfilAdminExito = "";
    this.mostrarEditarPerfilAdmin = false;
  }

  onAdminFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      if (this.editAdminImagenPreview && this.editAdminImagenPreview.startsWith('blob:')) {
        URL.revokeObjectURL(this.editAdminImagenPreview);
      }
      this.editAdminImagen = file;
      this.editAdminImagenPreview = URL.createObjectURL(file);
      this.cdr.detectChanges();
    }
  }

  guardarPerfilAdmin() {
    if (!this.usuarioAdminLogueado || this.guardandoPerfilAdmin) return;
    const nombreLimpio = (this.editAdminNombre || "").trim();
    if (nombreLimpio.length < 3) {
      this.perfilAdminError = "El nombre debe tener al menos 3 caracteres.";
      return;
    }

    this.perfilAdminError = "";
    this.perfilAdminExito = "";
    this.guardandoPerfilAdmin = true;
    this.cdr.detectChanges();

    this.adminService.editarUsuario(
      this.usuarioAdminLogueado.cedulaU,
      { nombre: nombreLimpio },
      this.editAdminImagen
    ).subscribe({
      next: (actualizado) => {
        this.guardandoPerfilAdmin = false;
        this.usuarioAdminLogueado = actualizado;
        this.perfilAdminExito = "Perfil actualizado correctamente.";
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cerrarEditarPerfilAdmin();
          this.cdr.detectChanges();
        }, 900);
      },
      error: (err) => {
        this.guardandoPerfilAdmin = false;
        this.perfilAdminError = err.error?.message || "No se pudo actualizar el perfil.";
        this.cdr.detectChanges();
      }
    });
  }

  private cargarClienteLogueado() {
    const clienteGuardado = localStorage.getItem('clienteActivo');
    if (clienteGuardado) {
      try {
        this.clienteLogueado = JSON.parse(clienteGuardado);
      } catch (e) {
        console.error('Error al cargar cliente desde localStorage:', e);
      }
    } else {
      this.clienteLogueado = null;
    }
  }

  private actualizarEstadoExclusion(url: string) {
    const current = (url || (typeof window !== 'undefined' ? window.location.pathname : '') || '').toLowerCase();
    this.esRutaExcluida = current.includes('admin') ||
      current.includes('usuario') ||
      current.includes('crear-producto') ||
      current.includes('reportes') ||
      current.includes('gestion-henos') ||
      current.includes('gestion-tickets') ||
      current.includes('asesor-tickets') ||
      current.includes('gestion-preguntas-frecuentes') ||
      current.includes('preguntas-frecuentes') ||
      current.includes('ayuda');
  }

  get cantidadEnCarrito() {
    return this.carritoService.obtenerCantidadTotal();
  }

  get mostrarCarrito() {
    return !this.esRutaExcluida &&
      !this.router.url.includes('/carrito') &&
      !this.router.url.includes('/factura') &&
      this.cantidadEnCarrito > 0;
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }

  abrirModalUsuario() {
    if (this.clienteLogueado) {
      this.router.navigate(['/perfil-cliente']);
    } else {
      this.loginErrorMsg = "";
      this.cedulaErrorMsg = "";
      this.mostrarLoginModal = true;
    }
  }

  validarCedulaInput() {
    if (this.idC && !/^[0-9]*$/.test(this.idC)) {
      this.cedulaErrorMsg = "Solo se permiten números en la cédula.";
      this.idC = this.idC.replace(/[^0-9]/g, '');
    } else {
      this.cedulaErrorMsg = "";
    }
  }

  submitLoginCliente() {
    if (this.cargandoLogin) return;

    this.loginErrorMsg = "";
    this.cedulaErrorMsg = "";

    const cedula = this.idC?.trim();
    if (!cedula) {
      this.loginErrorMsg = "Por favor ingrese su cédula.";
      return;
    }

    if (!/^[0-9]+$/.test(cedula)) {
      this.loginErrorMsg = "La cédula solo debe contener números.";
      return;
    }

    if (!this.claveC || this.claveC.trim() === "") {
      this.loginErrorMsg = "Por favor ingrese su clave.";
      return;
    }

    this.cargandoLogin = true;
    this.cdr.detectChanges();

    this.clienteService.login(cedula, this.claveC).subscribe({
      next: (isValid) => {
        this.cargandoLogin = false;
        if (isValid && isValid.cedula) {
          this.clienteLogueado = isValid;
          localStorage.setItem('clienteActivo', JSON.stringify(isValid));
          this.clienteLogueado.imagen = isValid.imagen ?? "";
          this.cerrarModalUsuario();
          this.cdr.detectChanges();
          this.router.navigate(['/']);
          window.scrollTo(0, 0);
        } else {
          this.loginErrorMsg = "No se encontró la cédula o la clave es incorrecta.";
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error al iniciar sesión:', error);
        this.cargandoLogin = false;
        if (error.status === 404) {
          this.loginErrorMsg = "No existe un cliente registrado con esta cédula.";
        } else if (error.status === 401 || error.status === 400) {
          this.loginErrorMsg = "Cédula o clave incorrecta. Por favor verifique sus datos.";
        } else {
          this.loginErrorMsg = typeof error.error === 'string' && error.error
            ? error.error
            : (error.error?.message || 'No se encontró la cédula ingresada o la contraseña es incorrecta.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModalUsuario() {
    this.mostrarLoginModal = false;
    this.loginErrorMsg = "";
    this.cedulaErrorMsg = "";
  }
  registrarCliente() {
    this.router.navigate(['/crear-cliente']);
    this.cerrarModalUsuario();
  }
  cerrarSesion() {
    localStorage.removeItem('clienteActivo');
    window.location.href = '/';
  }

}
