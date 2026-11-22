import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, NuevoUsuario, Usuario } from '../../services/admin.service';

export interface PerfilOpcion {
  valor: 'admin' | 'asesor' | 'gestorTickets';
  nombre: string;
}

@Component({
  selector: 'app-crear-usuario-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './crear-usuario-admin.component.html',
  styleUrls: ['./crear-usuario-admin.component.css']
})
export class CrearUsuarioAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  usuarioForm!: FormGroup;

  readonly perfilesDisponibles: PerfilOpcion[] = [
    { valor: 'admin', nombre: 'Administrador' },
    { valor: 'asesor', nombre: 'Asesor' },
    { valor: 'gestorTickets', nombre: 'Gestor de Tickets' }
  ];

  loading: boolean = false;
  successMsg: string = '';
  errorMsg: string = '';

  mostrarModalForm: boolean = false;
  esModoEdicion: boolean = false;
  usuarioEditandoCedula: number | null = null;

  usuariosRegistrados: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  cargandoUsuarios: boolean = false;

  rolFiltro: string = 'TODOS';
  estadoFiltro: string = 'TODOS';
  busquedaTexto: string = '';

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarUsuariosRegistrados();
  }

  private inicializarFormulario(): void {
    this.usuarioForm = this.fb.group({
      cedulaU: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      clave: ['', [Validators.required, Validators.minLength(4)]],
      rol: ['admin', [Validators.required]],
      activo: [true]
    });
  }

  get f() {
    return this.usuarioForm.controls;
  }

  abrirCrear(): void {
    this.esModoEdicion = false;
    this.usuarioEditandoCedula = null;
    this.usuarioForm.get('cedulaU')?.enable();
    this.usuarioForm.get('clave')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.usuarioForm.get('clave')?.updateValueAndValidity();
    this.usuarioForm.reset({ rol: 'admin', activo: true });
    this.errorMsg = '';
    this.successMsg = '';
    this.mostrarModalForm = true;
  }

  abrirEditar(usuario: Usuario): void {
    this.esModoEdicion = true;
    this.usuarioEditandoCedula = usuario.cedulaU;
    const r = (usuario.rol || 'admin').toLowerCase();
    const rolMapeado = r.includes('gestor') || r.includes('ticket') ? 'gestorTickets' : (r.includes('asesor') ? 'asesor' : 'admin');
    this.usuarioForm.patchValue({
      cedulaU: usuario.cedulaU,
      nombre: usuario.nombre,
      clave: '',
      rol: rolMapeado,
      activo: usuario.activo !== false
    });
    this.usuarioForm.get('cedulaU')?.disable();
    this.usuarioForm.get('clave')?.clearValidators();
    this.usuarioForm.get('clave')?.updateValueAndValidity();
    this.errorMsg = '';
    this.successMsg = '';
    this.mostrarModalForm = true;
  }

  cerrarModal(): void {
    this.mostrarModalForm = false;
    this.esModoEdicion = false;
    this.usuarioEditandoCedula = null;
    this.usuarioForm.get('cedulaU')?.enable();
    this.usuarioForm.get('clave')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.usuarioForm.get('clave')?.updateValueAndValidity();
    this.usuarioForm.reset({ rol: 'admin', activo: true });
  }

  aplicarFiltros(): void {
    const q = (this.busquedaTexto || '').toLowerCase().trim();
    this.usuariosFiltrados = this.usuariosRegistrados.filter(u => {
      // Filtro por Rol
      const matchRol = this.rolFiltro === 'TODOS' ||
        (u.rol || '').toLowerCase() === this.rolFiltro.toLowerCase();

      // Filtro por Estado
      const esActivo = u.activo !== false;
      const matchEstado = this.estadoFiltro === 'TODOS' ||
        (this.estadoFiltro === 'ACTIVO' && esActivo) ||
        (this.estadoFiltro === 'INACTIVO' && !esActivo);

      // Filtro por Texto
      const matchTexto = !q ||
        (u.nombre || '').toLowerCase().includes(q) ||
        String(u.cedulaU || '').includes(q);

      return matchRol && matchEstado && matchTexto;
    });
  }

  onSubmit(): void {
    this.errorMsg = '';
    this.successMsg = '';

    if (this.esModoEdicion) {
      if (this.usuarioForm.get('nombre')?.invalid || this.usuarioForm.get('rol')?.invalid) {
        this.usuarioForm.markAllAsTouched();
        return;
      }

      this.loading = true;
      const formValues = this.usuarioForm.getRawValue();
      const payload: any = {
        nombre: formValues.nombre.trim(),
        rol: formValues.rol,
        activo: formValues.activo !== false
      };
      if (formValues.clave && formValues.clave.trim()) {
        payload.clave = formValues.clave.trim();
      }

      this.adminService.editarUsuario(this.usuarioEditandoCedula!, payload).subscribe({
        next: (usuarioEditado) => {
          this.loading = false;
          this.cerrarModal();
          this.mostrarNotificacionExito(`Usuario ${usuarioEditado.nombre} actualizado correctamente.`);
          this.cargarUsuariosRegistrados();
        },
        error: (err) => {
          this.loading = false;
          this.errorMsg = err.error?.message || 'Error al actualizar el usuario.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValues = this.usuarioForm.value;
    const payload: NuevoUsuario = {
      cedulaU: Number(formValues.cedulaU),
      nombre: formValues.nombre.trim(),
      clave: formValues.clave,
      rol: formValues.rol,
      activo: formValues.activo !== false
    };

    this.adminService.crearUsuario(payload).subscribe({
      next: (usuarioCreado) => {
        this.loading = false;
        this.cerrarModal();
        const perfilNombre = this.obtenerNombrePerfil(usuarioCreado.rol);
        this.mostrarNotificacionExito(`Usuario registrado con éxito: ${usuarioCreado.nombre} (${perfilNombre}).`);
        this.cargarUsuariosRegistrados();
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409) {
          this.errorMsg = err.error?.message || 'Ya existe un usuario registrado con esa cédula.';
        } else if (err.status === 400) {
          this.errorMsg = err.error?.message || 'Datos de formulario inválidos.';
        } else {
          this.errorMsg = err.error?.message || 'Error en el servidor al intentar crear el usuario.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  toggleEstado(usuario: Usuario): void {
    const accion = usuario.activo !== false ? 'desactivar' : 'activar';
    const advertencia = usuario.activo !== false ? ' Ya no podrá iniciar sesión en el sistema.' : '';
    if (!confirm(`¿Estás seguro de que deseas ${accion} al usuario ${usuario.nombre}?${advertencia}`)) {
      return;
    }
    this.adminService.cambiarEstadoUsuario(usuario.cedulaU).subscribe({
      next: (actualizado) => {
        const nuevoEstado = actualizado.activo !== false ? 'activado' : 'desactivado';
        this.mostrarNotificacionExito(`Usuario ${usuario.nombre} ${nuevoEstado} correctamente.`);
        this.cargarUsuariosRegistrados();
      },
      error: (err) => {
        this.errorMsg = err.error?.message || `Error al ${accion} el usuario.`;
        this.cdr.detectChanges();
      }
    });
  }

  cargarUsuariosRegistrados(): void {
    this.cargandoUsuarios = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    this.adminService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuariosRegistrados = data || [];
        this.aplicarFiltros();
        this.cargandoUsuarios = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoUsuarios = false;
        this.errorMsg = 'No se pudo conectar con el servidor para cargar los usuarios. ' + (err.error?.message || err.message || 'Verifique que el backend esté en ejecución.');
        this.cdr.detectChanges();
      }
    });
  }

  obtenerNombrePerfil(codigoRol: string): string {
    const normalizado = (codigoRol || '').toUpperCase().trim();
    const encontrado = this.perfilesDisponibles.find(p => p.valor.toUpperCase() === normalizado);
    return encontrado ? encontrado.nombre : codigoRol;
  }

  private mostrarNotificacionExito(msg: string): void {
    this.successMsg = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.successMsg === msg) {
        this.successMsg = '';
        this.cdr.detectChanges();
      }
    }, 4500);
  }

  volverAlPanel(): void {
    this.router.navigate(['/admin']);
  }
}
