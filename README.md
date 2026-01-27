# ERP Insumos API

API profesional para distribución de insumos con soporte multisucursal (Diriamba y Jinotepe).

##  Características

-  **Arquitectura limpia** con separación de capas (Core, Application, Infrastructure, API)
-  **Aislamiento multisucursal** - Datos aislados por sucursal
-  **Gestión de crédito doble** - CPP (Cuentas por Pagar) y CXC (Cuentas por Cobrar)
-  **Precisión financiera** - Montos en centavos (enteros)
-  **Documentación Swagger** - Open API 3.0
-  **Validación robusta** - Zod schemas
-  **TypeScript** - Type-safe con ESM

##  Requisitos

- Node.js 20+
- npm o pnpm

##  Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Benchav/Insbr-api.git
cd insbr-api

# Instalar dependencias
npm install
```

##  Ejecución

### Modo desarrollo
```bash
npm run dev
```

### Modo producción
```bash
npm run build
npm start
```

### Verificar tipos
```bash
npm run lint
```

##  Documentación

Una vez iniciado el servidor, accede a:

- **Swagger UI:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health
- **API Root:** http://localhost:3000

##  Arquitectura

```
src/
├── core/                   # Capa de dominio
│   ├── entities/          # Entidades de negocio
│   └── interfaces/        # Contratos de repositorios
├── application/           # Capa de aplicación
│   └── services/         # Lógica de negocio
├── infrastructure/        # Capa de infraestructura
│   └── memory/           # Persistencia in-memory
│       ├── repositories/ # Implementaciones
│       ├── storage.ts    # Storage central
│       └── seed.ts       # Datos iniciales
├── api/                   # Capa de API
│   └── controllers/      # Controladores REST
├── config/               # Configuración
│   └── swagger.ts        # Config Swagger
├── app.ts                # Aplicación Express
└── server.ts             # Entry point
```

##  Datos de Prueba

Al iniciar el servidor, se cargan automáticamente:

- **2 Sucursales:** Diriamba y Jinotepe
- **5 Productos:** Insumos para panadería/distribución
- **1 Proveedor:** Con deuda pendiente de C$ 3,000.00
- **1 Cliente:** Con línea de crédito de C$ 500,000.00

##  Reglas de Negocio

### Aislamiento Multisucursal
- Stock, ventas, compras y caja están aislados por `branchId`
- El catálogo de productos es compartido entre sucursales
- Las transferencias permiten mover stock entre sucursales

### Manejo de Moneda
- Todos los montos se manejan como **enteros en centavos**
- Ejemplo: C$ 1,500.00 = 150000 centavos
- Evita errores de precisión de punto flotante

### Gestión de Crédito

**CPP (Cuentas por Pagar):**
- Se crea automáticamente al hacer compra a crédito
- Permite abonos parciales
- Estados: PENDIENTE → PAGADO_PARCIAL → PAGADO

**CXC (Cuentas por Cobrar):**
- Se crea automáticamente al hacer venta a crédito
- Valida límite de crédito antes de vender
- Actualiza deuda del cliente
- Permite abonos parciales

##  API Endpoints

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Próximos endpoints
- Ventas (`/api/sales`)
- Compras (`/api/purchases`)
- Créditos (`/api/credit`)
- Transferencias (`/api/transfers`)
- Stock (`/api/stock`)

##  Transferencias entre Sucursales

El sistema soporta un flujo seguro y auditable para transferencias de productos entre sucursales. Cada acción está protegida por roles y validaciones de stock.

### Flujo de Transferencia
1. **Creación:** Un usuario (o admin) solicita una transferencia de productos entre sucursales.
2. **Aceptación:** (Solo para tipo REQUEST) La sucursal origen acepta la solicitud.
3. **Despacho:** La sucursal origen despacha los productos (stock se descuenta).
4. **Recepción:** La sucursal destino recibe los productos (stock se suma).
5. **Cancelación:** Origen o admin pueden cancelar transferencias no completadas.

### Endpoints principales

| Método | Endpoint                        | Descripción                                 |
|--------|----------------------------------|---------------------------------------------|
| POST   | /api/transfers                  | Crear transferencia                        |
| PATCH  | /api/transfers/:id/accept       | Aceptar solicitud (tipo REQUEST)           |
| PATCH  | /api/transfers/:id/ship         | Despachar transferencia                    |
| PATCH  | /api/transfers/:id/receive      | Recibir transferencia                      |
| DELETE | /api/transfers/:id              | Cancelar transferencia                     |
| GET    | /api/transfers/:id              | Ver detalle de transferencia               |
| GET    | /api/transfers                  | Listar transferencias                      |

### Ejemplo de creación
```json
POST /api/transfers
{
  "toBranchId": "BRANCH-DESTINO-ID",
  "items": [ { "productId": "PROD-XXX", "quantity": 1 } ],
  "notes": "opcional"
}
```
**Respuesta:**
```json
{
  "id": "TRANS-...",
  "fromBranchId": "...",
  "toBranchId": "...",
  "items": [ { "productId": "...", "productName": "...", "quantity": 1 } ],
  "status": "PENDING" | "REQUESTED",
  "type": "SEND" | "REQUEST",
  ...
}
```

### Estados posibles
- `REQUESTED`: Solicitud pendiente de aceptación (tipo REQUEST)
- `PENDING`: Lista para despachar
- `IN_TRANSIT`: Despachada, en camino
- `COMPLETED`: Recibida y finalizada
- `CANCELLED`: Cancelada

### Consideraciones para Frontend
- **Autenticación:** Todos los endpoints requieren JWT (Bearer).
- **Roles:** Solo usuarios con permisos pueden crear, aceptar, despachar, recibir o cancelar transferencias según su branch y rol.
- **Acciones:** El frontend debe mostrar el estado (`status`) y permitir acciones según el mismo.
- **Errores:** Las respuestas de error tienen el formato `{ "error": "mensaje" }` y status HTTP adecuado (400, 403, 404).
- **Listados:** Puedes filtrar transferencias por estado, dirección y sucursal.

### Ejemplo de flujo en frontend
1. Listar transferencias (`GET /api/transfers?status=PENDING`)
2. Mostrar detalle (`GET /api/transfers/:id`)
3. Permitir aceptar/despachar/recibir según estado y rol
4. Actualizar UI tras cada acción exitosa

##  Testing

```bash
npm test
```

##  Próximos Pasos

1. Implementar controladores faltantes (Sales, Purchases, Credit, Transfers)
2. Agregar autenticación JWT
3. Implementar middleware de aislamiento por sucursal
4. Agregar reportes (balance de caja, ventas, compras)
5. Migrar a base de datos (PostgreSQL/MySQL)

##  Autor

Joshua Chávez

##  Licencia

ISC