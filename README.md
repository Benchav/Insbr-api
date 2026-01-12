# ERP Insumos API

API profesional para distribución de insumos con soporte multisucursal (Diriamba y Jinotepe).

## 🚀 Características

- ✅ **Arquitectura limpia** con separación de capas (Core, Application, Infrastructure, API)
- ✅ **Aislamiento multisucursal** - Datos aislados por sucursal
- ✅ **Gestión de crédito doble** - CPP (Cuentas por Pagar) y CXC (Cuentas por Cobrar)
- ✅ **Precisión financiera** - Montos en centavos (enteros)
- ✅ **Documentación Swagger** - OpenAPI 3.0
- ✅ **Validación robusta** - Zod schemas
- ✅ **TypeScript** - Type-safe con ESM

## 📋 Requisitos

- Node.js 20+
- npm o pnpm

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd insbr-api

# Instalar dependencias
npm install
```

## 🏃 Ejecución

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

## 📚 Documentación

Una vez iniciado el servidor, accede a:

- **Swagger UI:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health
- **API Root:** http://localhost:3000

## 🏗️ Arquitectura

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

## 📊 Datos de Prueba

Al iniciar el servidor, se cargan automáticamente:

- **2 Sucursales:** Diriamba y Jinotepe
- **5 Productos:** Insumos para panadería/distribución
- **1 Proveedor:** Con deuda pendiente de C$ 3,000.00
- **1 Cliente:** Con línea de crédito de C$ 500,000.00

## 🔑 Reglas de Negocio

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

## 🔌 API Endpoints

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

## 🧪 Testing

```bash
npm test
```

## 📝 Próximos Pasos

1. Implementar controladores faltantes (Sales, Purchases, Credit, Transfers)
2. Agregar autenticación JWT
3. Implementar middleware de aislamiento por sucursal
4. Agregar reportes (balance de caja, ventas, compras)
5. Migrar a base de datos (PostgreSQL/MySQL)

## 👨‍💻 Autor

Joshua Chávez

## 📄 Licencia

ISC
