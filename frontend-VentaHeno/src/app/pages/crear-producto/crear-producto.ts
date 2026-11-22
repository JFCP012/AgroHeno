import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HenoService } from '../../services/heno.service';
import { Heno } from '../../models/heno.model';

@Component({
  selector: 'app-crear-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-producto.html',
  styleUrl: './crear-producto.css',
})
export class CrearProducto implements OnInit {
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private henoService: HenoService,
    private router: Router
  ) { }

  heno: Heno = {
    nombre: '',
    precioU: 0,
    stock: 0,
    descripcionCorta: '',
    descripcionLarga: '',
    precioC: 0,
    fechaEntrada: '',
    estado: '',
  }
  idAnimales: number[] = [];
  isEditMode = false;
  editHenoId: number | null = null;
  imagen: File | null = null;
  imagenPreview: string | ArrayBuffer | null = null;
  loading = false;
  successMsg = '';
  errorMsg = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.editHenoId = Number(id);
        this.cargarHenoParaEditar(this.editHenoId);
      }
    });
  }

  cargarHenoParaEditar(id: number) {
    forkJoin({
      heno: this.henoService.buscarPorId(id),
      animalIds: this.henoService.buscarAnimales(id)
    }).subscribe({
      next: ({ heno: data, animalIds }) => {
        if (data.fechaEntrada) {
          if (Array.isArray(data.fechaEntrada)) {
            const [yyyy, mm, dd] = data.fechaEntrada;
            data.fechaEntrada = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
          } else {
            const dateStr = String(data.fechaEntrada);
            if (dateStr.includes('T')) {
              data.fechaEntrada = dateStr.split('T')[0];
            } else if (!isNaN(Number(dateStr)) && dateStr.length > 4) {
              const date = new Date(Number(dateStr));
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              data.fechaEntrada = `${yyyy}-${mm}-${dd}`;
            }
          }
        }

        this.heno = data;
        this.imagenPreview = data.imagen || null;
        this.idAnimales = animalIds || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = 'Error al cargar el producto para editar: ' + err.message;
        this.cdr.detectChanges();
      }
    });
  }

  toggleAnimal(event: any, id: number) {
    if (event.target.checked) {
      if (!this.idAnimales.includes(id)) {
        this.idAnimales.push(id);
      }
    } else {
      this.idAnimales = this.idAnimales.filter(animalId => animalId !== id);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imagen = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  crearHeno() {
    const file = this.imagen;
    if (!file && !this.isEditMode) {
      this.errorMsg = 'Debe seleccionar una imagen';
      return;
    }

    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.idAnimales || this.idAnimales.length === 0) {
      this.errorMsg = 'Debe seleccionar al menos un animal';
      this.loading = false;
      return;
    }

    if (this.isEditMode && this.editHenoId) {
      this.henoService.editarHeno(this.editHenoId, this.heno, file, this.idAnimales).subscribe({
        next: () => {
          this.successMsg = '¡Producto editado con éxito!';
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.volver();
          }, 1500);
        },
        error: (err) => {
          console.error('Error al editar heno:', err);
          this.errorMsg = 'Ocurrió un error al editar el producto. Por favor intente de nuevo.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      if (!file) {
        this.errorMsg = 'Debe seleccionar una imagen';
        this.loading = false;
        return;
      }
      this.henoService.crearHeno(this.heno, file, this.idAnimales).subscribe({
        next: () => {
          this.successMsg = '¡Producto creado con éxito!';
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.volver();
          }, 1500);
        },
        error: (err) => {
          console.error('Error al crear heno:', err);
          this.errorMsg = 'Ocurrió un error al guardar el producto. Por favor intente de nuevo.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/gestion-henos']);
  }
}

