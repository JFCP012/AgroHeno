import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const asesorTicketsGuard: CanActivateFn = (route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (adminService.isAsesorLoggedIn()) {
    return true;
  }

  // Si no está autenticado como asesor o admin, redirigir a la tienda
  router.navigate(['/producto']);
  return false;
};
