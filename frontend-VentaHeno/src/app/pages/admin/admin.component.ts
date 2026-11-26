import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  private router = inject(Router);

  irAGestionHenos() {
    this.router.navigate(['/gestion-henos']);
  }

  irAGestionUsuarios() {
    this.router.navigate(['/crear-usuario-admin']);
  }

  irAReportes() {
    this.router.navigate(['/reportes']);
  }

  irAGestionTickets() {
    this.router.navigate(['/gestion-tickets']);
  }
}
