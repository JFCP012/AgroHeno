import { Routes } from '@angular/router';
import { ProductoComponent } from './pages/producto/producto.component';
import { adminGuard } from './guards/admin.guard';
import { gestorTicketsGuard } from './guards/gestor-tickets.guard';
import { asesorTicketsGuard } from './guards/asesor-tickets.guard';

export const routes: Routes = [
    { path: '', component: ProductoComponent },
    { path: 'producto', component: ProductoComponent },
    {
        path: 'crear-producto',
        loadComponent: () => import('./pages/crear-producto/crear-producto').then(m => m.CrearProducto),
        canActivate: [adminGuard]
    },
    {
        path: 'detalle-producto/:id',
        loadComponent: () => import('./pages/detalle-producto/detalle-producto').then(m => m.DetalleProducto)
    },
    {
        path: 'carrito',
        loadComponent: () => import('./pages/carrito/carrito.component').then(m => m.CarritoComponent)
    },
    {
        path: 'factura',
        loadComponent: () => import('./pages/factura/factura').then(m => m.Factura)
    },
    {
        path: 'crear-cliente',
        loadComponent: () => import('./pages/crear-cliente/crear-cliente').then(m => m.CrearCliente)
    },
    {
        path: 'perfil-cliente',
        loadComponent: () => import('./pages/perfil-cliente/perfil-cliente').then(m => m.PerfilCliente)
    },
    {
        path: 'crearTicket',
        loadComponent: () => import('./pages/crearTicket/crearTicket').then(m => m.CrearTicketComponent)
    },
    {
        path: 'crear-ticket',
        loadComponent: () => import('./pages/crearTicket/crearTicket').then(m => m.CrearTicketComponent)
    },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'crear-usuario-admin',
        loadComponent: () => import('./pages/crear-usuario-admin/crear-usuario-admin.component').then(m => m.CrearUsuarioAdminComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'gestion-usuarios',
        loadComponent: () => import('./pages/crear-usuario-admin/crear-usuario-admin.component').then(m => m.CrearUsuarioAdminComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'gestion-tickets',
        loadComponent: () => import('./pages/gestion-tickets/gestion-tickets.component').then(m => m.GestionTicketsComponent),
        canActivate: [gestorTicketsGuard]
    },
    {
        path: 'gestion-preguntas-frecuentes',
        loadComponent: () => import('./pages/gestion-preguntas-frecuentes/gestion-preguntas-frecuentes.component').then(m => m.GestionPreguntasFrecuentesComponent),
        canActivate: [gestorTicketsGuard]
    },
    {
        path: 'preguntas-frecuentes',
        loadComponent: () => import('./pages/preguntas-frecuentes/preguntas-frecuentes.component').then(m => m.PreguntasFrecuentesComponent)
    },
    {
        path: 'ayuda',
        loadComponent: () => import('./pages/preguntas-frecuentes/preguntas-frecuentes.component').then(m => m.PreguntasFrecuentesComponent)
    },
    {
        path: 'asesor-tickets',
        loadComponent: () => import('./pages/asesor-tickets/asesor-tickets.component').then(m => m.AsesorTicketsComponent),
        canActivate: [asesorTicketsGuard]
    },
    {
        path: 'reportes-mes',
        loadComponent: () => import('./pages/reportes-mes/reportes-mes.component').then(m => m.ReportesMesComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'reportes-animal',
        loadComponent: () => import('./pages/reportes-animal/reportes-animal.component').then(m => m.ReportesAnimalComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'reportes-paca',
        loadComponent: () => import('./pages/reportes-paca/reportes-paca.component').then(m => m.ReportesPacaComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'reportes-cliente',
        loadComponent: () => import('./pages/reportes-cliente/reportes-cliente.component').then(m => m.ReportesClienteComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'gestion-henos',
        loadComponent: () => import('./pages/gestion-henos/gestion-henos.component').then(m => m.GestionHenosComponent),
        canActivate: [adminGuard]
    },
    {
        path: 'dashboard-kpis',
        loadComponent: () => import('./pages/dashboard-kpis/dashboard-kpis.component').then(m => m.DashboardKpisComponent),
        canActivate: [gestorTicketsGuard]
    },
];
