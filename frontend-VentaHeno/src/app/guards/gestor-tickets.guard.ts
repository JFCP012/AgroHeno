import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const gestorTicketsGuard: CanActivateFn = (route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (adminService.isGestorTicketsLoggedIn()) {
    return true;
  }

  // Si no está autenticado como gestorTickets o admin, redirigir a la tienda
  router.navigate(['/producto']);
  return false;
};
