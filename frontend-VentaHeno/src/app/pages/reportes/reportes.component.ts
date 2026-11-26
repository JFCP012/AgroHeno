import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent {
  private router = inject(Router);

  volverAdmin() {
    this.router.navigate(['/admin']);
  }

  irAReportesMes() {
    this.router.navigate(['/reportes-mes']);
  }

  irAReportesAnimal() {
    this.router.navigate(['/reportes-animal']);
  }

  irAReportesPaca() {
    this.router.navigate(['/reportes-paca']);
  }

  irAReportesCliente() {
    this.router.navigate(['/reportes-cliente']);
  }
}
