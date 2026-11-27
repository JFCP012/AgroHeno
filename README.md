# Proyecto Gestión TI 2 - AgroHeno (Sistema Integral de Ventas, Facturación y Soporte Postventa) 🌾

## Descripción del Proyecto
**AgroHeno** es una plataforma web integral diseñada para la comercialización de pacas de heno, control de inventario, facturación electrónica automatizada, analítica comercial y atención postventa mediante mesa de ayuda con acuerdos de nivel de servicio (**SLA**). El sistema integra un **Frontend reactivo en Angular** y un **Backend transaccional en Spring Boot (Java)** conectado a **PostgreSQL**.

---

## Módulos y Funcionalidades Principales

### 1. Tienda Online, Carrito y Facturación en PDF por Correo
* **Catálogo e Inventario Dinámico**: Visualización de productos activos con stock disponible, filtrado por categoría animal (*Bovinos*, *Equinos*, *Ovinos*) y búsqueda en tiempo real.
* **Cuentas y Perfil de Clientes**: Registro e inicio de sesión de clientes, autocompletado en el proceso de pago, consulta de historial y sección **Mis Tickets** con filtrado combinado por estado y categoría.
* **Checkout y Control de Stock**: Soporte para recogida en bodega (*POS*) y envío nacional, con validación por lotes y descuento automático de inventario (inactivando lógicamente el producto cuando el stock llega a `0`).
* **Factura Unificada en PDF y Envío Automático por Email**:
  * Al confirmar una compra, el backend genera el documento oficial en formato PDF con **OpenPDF** y lo envía de forma asíncrona (`@Async`) como archivo adjunto al correo electrónico del cliente.
  * El botón **Descargar Factura** consume exactamente el mismo generador (`GET /Factura/{idFactura}/pdf`), garantizando que la factura descargada en web y la recibida por correo sean idénticas.

### 2. Centro de Soporte Postventa y Gestión de Tickets (SLA)
* **Radicación de Requerimientos**: Generación de código único de radicado (`TKT-YYYY-XXXXXX`), vinculación opcional con facturas de compra y carga de evidencia fotográfica en la nube mediante **Cloudinary**.
* **Motor Inteligente de Priorización y SLA**: Calcula automáticamente la prioridad inicial y la fecha límite de atención según la categoría del reclamo, palabras clave de urgencia, monto de la factura y evidencia adjunta:
  * `CRÍTICA` → **24 horas**
  * `ALTA` → **48 horas**
  * `MEDIA` → **96 horas (4 días)**
  * `BAJA` → **168 horas (7 días)**
* **Edición Manual de Prioridad**: Desde el detalle del ticket, el **Gestor de Tickets** o **Administrador** puede ajustar manualmente la prioridad (`PUT /ticket/{idTicket}/prioridad`), recalculando automáticamente el plazo límite SLA y el estado de vencimiento.
* **Flujo de Atención y Notificaciones por Correo**: Trazabilidad por estados (`RADICADO` → `EN_ANALISIS` → `RESUELTO`), asignación de asesores técnicos activos y envío automático de correos corporativos HTML en cada etapa (radicación, asignación de asesor y solución del caso).

### 3. Base de Conocimiento (Preguntas Frecuentes - FAQ)
* Módulo público de autogestión (`/preguntas-frecuentes`) organizado por categorías para resolver dudas frecuentes antes de radicar un ticket.
* Panel administrativo (`/gestion-preguntas-frecuentes`) para crear, editar y activar/inactivar preguntas frecuentes.

### 4. Panel Administrativo, Roles y Centro de Reportes
* **Control de Acceso por Roles**: Rutas protegidas con *Guards* para **Administrador** (`admin`), **Gestor de Tickets** (`gestorTickets`) y **Asesor Técnico** (`asesor`), además de edición de perfil y fotografía desde el menú superior.
* **Centro de Reportes (`/reportes`)**: Apartado centralizado que agrupa los cuatro informes comerciales con exportación directa a **PDF** y **Excel (`.xlsx`)**:
  * **Ventas por Mes**
  * **Ventas por Animal**
  * **Ventas por Paca (Tipo de Heno)**
  * **Ventas por Cliente**

### 5. Tablero Ejecutivo de Indicadores y KPIs (`/dashboard-kpis`)
* Indicadores calculados en tiempo real desde la base de datos (cero datos quemados), con filtro por periodo mensual:
  * Cumplimiento de SLA (%), Tiempo Medio de Resolución (*MTTR*), tickets críticos/vencidos y distribución por estado/categoría.
  * Métricas financieras, margen comercial, ventas segmentadas y alertas de salud de inventario para el rol Administrador.

---

## Credenciales Base (Acceso Inmediato sin Alterar la BD)

Al iniciar el backend por primera vez sobre una base de datos vacía, la clase `DataInitializer` crea automáticamente el catálogo base de animales (*Bovinos*, *Equinos*, *Ovinos*) y una cuenta **Administrador Base** lista para usar todas las funciones del sistema sin ejecutar scripts SQL manuales:

| Campo | Valor por defecto |
| :--- | :--- |
| **Cédula / ID de Usuario** | `1000000000` |
| **Contraseña** | `admin123` |
| **Rol** | `admin` (acceso completo a todos los módulos) |

> Estos valores pueden personalizarse en `ventaHeno/src/main/resources/application.properties` mediante las propiedades `agroheno.admin.base.*`. La cuenta base está protegida contra desactivación accidental.

---

## Arquitectura y Patrones de Diseño

### Backend (Spring Boot)
Estructurado bajo una arquitectura multicapa para APIs REST:
* **Controllers (`Controller/`)**: Exponen los *Endpoints* REST y gestionan respuestas HTTP.
* **Services (`service/`)**: Encapsulan la lógica de negocio transaccional, motor SLA, cálculo de KPIs, generación de PDFs y despacho asíncrono de correos.
* **Repositories (`Repository/`)**: Implementan el patrón *Repository* con **Spring Data JPA** y consultas JPQL optimizadas (evitando problemas *N+1*).
* **Entities (`Entity/`)**: Modelo de dominio relacional mapeado con JPA/Hibernate.
* **DTOs (`dto/`)**: Objetos de transferencia para reportes, compras y métricas de negocio.
* **Configuraciones (`config/`)**: Configuración de CORS, Cloudinary, recursos web e inicialización automática de datos base (`DataInitializer`).

### Frontend (Angular)
* **Standalone Components**: Interfaz modular organizada por páginas y responsabilidades.
* **Route Guards (`guards/`)**: Protección de rutas administrativas y operativas según el rol autenticado (`adminGuard`, `gestorTicketsGuard`, `asesorTicketsGuard`).
* **Servicios Centralizados (`services/`)**: Comunicación HTTP con el backend, estado reactivo del carrito de compras y utilidades de exportación PDF/Excel.

---

## Tecnologías Utilizadas

**Backend:**
* Java 24 (compatible con JDK 21+)
* Spring Boot 4.1.0 (Web, Data JPA, Mail, Async)
* PostgreSQL
* OpenPDF (`com.github.librepdf:openpdf:2.0.3`) para generación de facturas PDF en servidor
* Cloudinary SDK para almacenamiento de imágenes de productos, perfiles y evidencias
* Lombok

**Frontend:**
* Angular 21 & TypeScript
* `jsPDF` y `jspdf-autotable` para exportación de reportes PDF
* `xlsx` para exportación de reportes en Excel

---

## Requisitos Previos
* [JDK 24 o 21](https://adoptium.net/)
* [Node.js](https://nodejs.org/) (v20+ recomendada) y `npm`
* [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`)
* [PostgreSQL](https://www.postgresql.org/) en ejecución con una base de datos creada llamada `ventaHeno`

---

## ¿Cómo ejecutar el proyecto?

### 1. Levantar el Backend (Spring Boot)
1. Crea una base de datos vacía llamada `ventaHeno` en PostgreSQL (Hibernate creará las tablas automáticamente con `ddl-auto=update` y `DataInitializer` poblará los datos iniciales).
2. Navega al directorio del backend:
   ```bash
   cd ventaHeno
   ```
3. Verifica tus credenciales de PostgreSQL (y opcionalmente Cloudinary / SMTP) en `src/main/resources/application.properties`.
4. Inicia el servidor con Maven Wrapper:
   ```bash
   # En Windows:
   .\mvnw.cmd spring-boot:run

   # En Linux / macOS:
   ./mvnw spring-boot:run
   ```
   El backend quedará disponible en `http://localhost:8080`.

### 2. Levantar el Frontend (Angular)
1. En una nueva terminal, entra al directorio del frontend:
   ```bash
   cd frontend-VentaHeno
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   ng serve
   ```
4. Abre `http://localhost:4200` en tu navegador. Para ingresar como administrador, haz clic en el botón **Admin** del encabezado e ingresa con la cédula `1000000000` y contraseña `admin123`.

---

## Estructura General de Directorios
```text
Proyecto-Gestion-TI2/
├── README.md                        # Documentación general del sistema
├── frontend-VentaHeno/              # Aplicación Frontend (Angular)
│   ├── public/assets/Imagenes/      # Logotipos e iconografía institucional
│   ├── src/
│   │   ├── app/
│   │   │   ├── config/              # Configuración base de URL de la API
│   │   │   ├── guards/              # Protección de rutas por rol (Admin, Gestor, Asesor)
│   │   │   ├── models/              # Interfaces TypeScript del dominio
│   │   │   ├── pages/               # Vistas (Tienda, Factura, Admin, Reportes, Tickets, FAQ, KPIs)
│   │   │   └── services/            # Servicios HTTP, carrito y exportación PDF/Excel
│   │   └── styles.css               # Estilos y variables globales corporativas
│   └── package.json
└── ventaHeno/                       # API REST Backend (Spring Boot)
    ├── src/main/java/com/HenoTrade/ventaHeno/
    │   ├── config/                  # CORS, Cloudinary, WebConfig y DataInitializer
    │   ├── Controller/              # Controladores REST
    │   ├── dto/                     # DTOs de compras, reportes y KPIs
    │   ├── Entity/                  # Entidades JPA (Heno, Factura, Ticket, Usuario, Cliente, FAQ...)
    │   ├── Repository/              # Repositorios Spring Data JPA
    │   └── service/                 # Reglas de negocio, SLA, KPIs y EmailService (SMTP + OpenPDF)
    ├── src/main/resources/          # application.properties y recursos PDF (Logo2.png)
    └── pom.xml
```
