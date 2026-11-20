import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const asesorTicketsGuard: CanActivateFn = (route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  const usuario = adminService.getUsuario();
  if (adminService.isAsesorLoggedIn() && (!usuario || usuario.activo !== false)) {
    return true;
  }

  adminService.logoutAdmin();
  router.navigate(['/producto']);
  return false;
};
