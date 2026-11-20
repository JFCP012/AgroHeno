import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, NuevoUsuario, Usuario } from '../../services/admin.service';

export interface PerfilOpcion {
  valor: 'ADMIN' | 'ASESOR' | 'GESTOR_TICKETS';
  nombre: string;
}

@Component({
  selector: 'app-crear-usuario-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-usuario-admin.component.html',
  styleUrls: ['./crear-usuario-admin.component.css']
})
export class CrearUsuarioAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private adminService = inject(AdminService);

  usuarioForm!: FormGroup;

  readonly perfilesDisponibles: PerfilOpcion[] = [
    { valor: 'ADMIN', nombre: 'Administrador' },
    { valor: 'ASESOR', nombre: 'Asesor' },
    { valor: 'GESTOR_TICKETS', nombre: 'Gestor de Tickets' }
  ];

  loading: boolean = false;
  successMsg: string = '';
  errorMsg: string = '';

  usuariosRegistrados: Usuario[] = [];
  cargandoUsuarios: boolean = false;

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarUsuariosRegistrados();
  }

  private inicializarFormulario(): void {
    this.usuarioForm = this.fb.group({
      cedulaU: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      clave: ['', [Validators.required, Validators.minLength(4)]],
      rol: ['ADMIN', [Validators.required]]
    });
  }

  get f() {
    return this.usuarioForm.controls;
  }

  onSubmit(): void {
    this.successMsg = '';
    this.errorMsg = '';

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
      rol: formValues.rol
    };

    this.adminService.crearUsuario(payload).subscribe({
      next: (usuarioCreado) => {
        this.loading = false;
        const perfilNombre = this.obtenerNombrePerfil(usuarioCreado.rol);
        this.successMsg = `Usuario registrado con éxito: ${usuarioCreado.nombre} (${perfilNombre}) - Cédula: ${usuarioCreado.cedulaU}.`;
        this.usuarioForm.reset({ rol: 'ADMIN' });
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
      }
    });
  }

  limpiarFormulario(): void {
    this.usuarioForm.reset({ rol: 'ADMIN' });
    this.successMsg = '';
    this.errorMsg = '';
  }

  cargarUsuariosRegistrados(): void {
    this.cargandoUsuarios = true;
    this.adminService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuariosRegistrados = data || [];
        this.cargandoUsuarios = false;
      },
      error: () => {
        this.cargandoUsuarios = false;
      }
    });
  }

  obtenerNombrePerfil(codigoRol: string): string {
    const normalizado = (codigoRol || '').toUpperCase().trim();
    const encontrado = this.perfilesDisponibles.find(p => p.valor === normalizado);
    return encontrado ? encontrado.nombre : codigoRol;
  }

  volverAlPanel(): void {
    this.router.navigate(['/admin']);
  }
}
