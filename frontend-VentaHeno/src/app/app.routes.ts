import { Routes } from '@angular/router';
import { ProductoComponent } from './pages/producto/producto.component';
import { CrearProducto } from './pages/crear-producto/crear-producto';
import { DetalleProducto } from './pages/detalle-producto/detalle-producto';
import { CarritoComponent } from './pages/carrito/carrito.component';
import { Factura } from './pages/factura/factura';
import { AdminComponent } from './pages/admin/admin.component';
import { ReportesMesComponent } from './pages/reportes-mes/reportes-mes.component';
import { adminGuard } from './guards/admin.guard';
import { ReportesAnimalComponent } from './pages/reportes-animal/reportes-animal.component';
import { ReportesPacaComponent } from './pages/reportes-paca/reportes-paca.component';
import { GestionHenosComponent } from './pages/gestion-henos/gestion-henos.component';
import { CrearCliente } from './pages/crear-cliente/crear-cliente';
import { ReportesClienteComponent } from './pages/reportes-cliente/reportes-cliente.component';
import { PerfilCliente } from './pages/perfil-cliente/perfil-cliente';
import { CrearTicketComponent } from './pages/crearTicket/crearTicket';
import { GestionTicketsComponent } from './pages/gestion-tickets/gestion-tickets.component';
import { gestorTicketsGuard } from './guards/gestor-tickets.guard';
import { AsesorTicketsComponent } from './pages/asesor-tickets/asesor-tickets.component';
import { asesorTicketsGuard } from './guards/asesor-tickets.guard';

export const routes: Routes = [
    { path: '', component: ProductoComponent },
    { path: 'producto', component: ProductoComponent },
    { path: 'crear-producto', component: CrearProducto, canActivate: [adminGuard] },
    { path: 'detalle-producto/:id', component: DetalleProducto },
    { path: 'carrito', component: CarritoComponent },
    { path: 'factura', component: Factura },
    { path: 'crear-cliente', component: CrearCliente },
    { path: 'perfil-cliente', component: PerfilCliente },
    { path: 'crearTicket', component: CrearTicketComponent },
    { path: 'crear-ticket', component: CrearTicketComponent },
    { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
    { path: 'gestion-tickets', component: GestionTicketsComponent, canActivate: [gestorTicketsGuard] },
    { path: 'asesor-tickets', component: AsesorTicketsComponent, canActivate: [asesorTicketsGuard] },
    { path: 'reportes-mes', component: ReportesMesComponent, canActivate: [adminGuard] },
    { path: 'reportes-animal', component: ReportesAnimalComponent, canActivate: [adminGuard] },
    { path: 'reportes-paca', component: ReportesPacaComponent, canActivate: [adminGuard] },
    { path: 'reportes-cliente', component: ReportesClienteComponent, canActivate: [adminGuard] },
    { path: 'gestion-henos', component: GestionHenosComponent, canActivate: [adminGuard] },
];