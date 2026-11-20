import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, NuevoUsuario, Usuario } from '../../services/admin.service';
import { ClienteService } from '../../services/cliente.service';
import { Cliente } from '../../models/Cliente';

export type TipoCuenta = 'CLIENTE' | 'ADMIN' | 'GESTOR_TICKETS' | 'ASESOR';

@Component({
  selector: 'app-crear-usuario-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-usuario-admin.component.html',
  styleUrls: ['./crear-usuario-admin.component.css']
})
export class CrearUsuarioAdminComponent implements OnInit {
  private router = inject(Router);
  private adminService = inject(AdminService);
  private clienteService = inject(ClienteService);
  private cdr = inject(ChangeDetectorRef);

  // Tipo de cuenta seleccionada por defecto
  tipoCuenta: TipoCuenta = 'CLIENTE';

  // Datos para Usuario Interno (ADMIN, GESTOR_TICKETS, ASESOR)
  usuarioInterno: NuevoUsuario = {
    cedulaU: 0,
    nombre: '',
    clave: '',
    rol: 'ADMIN'
  };
  cedulaUInput: string = '';

  // Datos para Cliente
  cliente: Cliente = {
    cedula: '',
    nombre: '',
    telefono: '',
    direccion: '',
    correo: '',
    clave: ''
  };

  // Imagen para cliente
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;

  // Estados de carga y feedback
  loading: boolean = false;
  successMsg: string = '';
  errorMsg: string = '';

  // Pestaña activa: 'crear' o 'listar'
  pestanaActiva: 'crear' | 'listar' = 'crear';
  usuariosInternos: Usuario[] = [];
  clientesList: Cliente[] = [];
  cargandoListas: boolean = false;

  ngOnInit() {
    this.actualizarRolSegunTipo();
  }

  cambiarTipoCuenta(nuevoTipo: TipoCuenta) {
    this.tipoCuenta = nuevoTipo;
    this.successMsg = '';
    this.errorMsg = '';
    this.actualizarRolSegunTipo();
  }

  actualizarRolSegunTipo() {
    if (this.tipoCuenta === 'ADMIN') {
      this.usuarioInterno.rol = 'ADMIN';
    } else if (this.tipoCuenta === 'GESTOR_TICKETS') {
      this.usuarioInterno.rol = 'GESTOR_TICKETS';
    } else if (this.tipoCuenta === 'ASESOR') {
      this.usuarioInterno.rol = 'ASESOR';
    }
  }

  get esUsuarioInterno(): boolean {
    return this.tipoCuenta !== 'CLIENTE';
  }

  get etiquetaRol(): string {
    switch (this.tipoCuenta) {
      case 'ADMIN': return 'Administrador del Sistema';
      case 'GESTOR_TICKETS': return 'Gestor de Tickets (SLA & Asignaciones)';
      case 'ASESOR': return 'Asesor Técnico de Tickets';
      default: return 'Cliente Comprador';
    }
  }

  validarCedulaU() {
    if (this.cedulaUInput && !/^[0-9]*$/.test(this.cedulaUInput)) {
      this.cedulaUInput = this.cedulaUInput.replace(/[^0-9]/g, '');
    }
    this.usuarioInterno.cedulaU = this.cedulaUInput ? Number(this.cedulaUInput) : 0;
  }

  validarCedulaCliente() {
    if (this.cliente.cedula && !/^[0-9]*$/.test(this.cliente.cedula)) {
      this.cliente.cedula = this.cliente.cedula.replace(/[^0-9]/g, '');
    }
  }

  validarTelefonoCliente() {
    if (this.cliente.telefono && !/^[0-9]*$/.test(this.cliente.telefono)) {
      this.cliente.telefono = this.cliente.telefono.replace(/[^0-9]/g, '');
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      if (this.imagenPreview && this.imagenPreview.startsWith('blob:')) {
        URL.revokeObjectURL(this.imagenPreview);
      }
      this.imagenSeleccionada = file;
      this.imagenPreview = URL.createObjectURL(file);
      this.cdr.detectChanges();
    }
  }

  removerImagen() {
    if (this.imagenPreview && this.imagenPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagenPreview);
    }
    this.imagenSeleccionada = null;
    this.imagenPreview = null;
  }

  onSubmit() {
    this.successMsg = '';
    this.errorMsg = '';

    if (this.esUsuarioInterno) {
      this.registrarUsuarioInterno();
    } else {
      this.registrarCliente();
    }
  }

  private registrarUsuarioInterno() {
    if (!this.usuarioInterno.cedulaU || this.usuarioInterno.cedulaU <= 0) {
      this.errorMsg = 'Debe ingresar una cédula válida para el usuario.';
      return;
    }
    if (!this.usuarioInterno.nombre.trim()) {
      this.errorMsg = 'El nombre completo es obligatorio.';
      return;
    }
    if (!this.usuarioInterno.clave.trim()) {
      this.errorMsg = 'La contraseña es obligatoria.';
      return;
    }

    this.loading = true;
    this.actualizarRolSegunTipo();

    this.adminService.crearUsuario({
      cedulaU: this.usuarioInterno.cedulaU,
      nombre: this.usuarioInterno.nombre.trim(),
      clave: this.usuarioInterno.clave,
      rol: this.usuarioInterno.rol
    }).subscribe({
      next: (resp) => {
        this.loading = false;
        this.successMsg = `¡Usuario interno (${this.etiquetaRol}) creado exitosamente con la cédula ${this.usuarioInterno.cedulaU}!`;
        this.limpiarFormularioInterno();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Error al registrar el usuario en el servidor. Verifique si la cédula ya existe.';
      }
    });
  }

  private registrarCliente() {
    if (!this.cliente.cedula || !this.cliente.cedula.trim()) {
      this.errorMsg = 'La cédula del cliente es obligatoria.';
      return;
    }
    if (!this.cliente.nombre || !this.cliente.nombre.trim()) {
      this.errorMsg = 'El nombre del cliente es obligatorio.';
      return;
    }
    if (!this.cliente.telefono || !this.cliente.telefono.trim()) {
      this.errorMsg = 'El teléfono del cliente es obligatorio.';
      return;
    }
    if (!this.cliente.clave || !this.cliente.clave.trim()) {
      this.errorMsg = 'La contraseña es obligatoria para el acceso del cliente.';
      return;
    }

    this.loading = true;

    this.clienteService.registrarCliente(this.cliente, this.imagenSeleccionada).subscribe({
      next: (resp) => {
        this.loading = false;
        this.successMsg = `¡Cliente "${resp.nombre}" registrado exitosamente con la cédula ${resp.cedula}!`;
        this.limpiarFormularioCliente();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'Error al registrar el cliente. Verifique que la cédula o correo no estén duplicados.';
      }
    });
  }

  limpiarFormularioInterno() {
    this.usuarioInterno = {
      cedulaU: 0,
      nombre: '',
      clave: '',
      rol: this.usuarioInterno.rol
    };
    this.cedulaUInput = '';
  }

  limpiarFormularioCliente() {
    this.cliente = {
      cedula: '',
      nombre: '',
      telefono: '',
      direccion: '',
      correo: '',
      clave: ''
    };
    this.removerImagen();
  }

  cambiarPestana(pestana: 'crear' | 'listar') {
    this.pestanaActiva = pestana;
    if (pestana === 'listar') {
      this.cargarListas();
    }
  }

  cargarListas() {
    this.cargandoListas = true;
    this.adminService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuariosInternos = data;
        this.cargandoListas = false;
      },
      error: () => {
        this.cargandoListas = false;
      }
    });

    this.clienteService.listarTodos().subscribe({
      next: (data) => {
        this.clientesList = data;
      },
      error: () => {}
    });
  }

  volverAlPanel() {
    this.router.navigate(['/admin']);
  }
}
