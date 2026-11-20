import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const gestorTicketsGuard: CanActivateFn = (route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  const usuario = adminService.getUsuario();
  if (adminService.isGestorTicketsLoggedIn() && (!usuario || usuario.activo !== false)) {
    return true;
  }

  adminService.logoutAdmin();
  router.navigate(['/producto']);
  return false;
};
