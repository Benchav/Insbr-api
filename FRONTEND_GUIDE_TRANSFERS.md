# Guía de Implementación Frontend: Flujo de Transferencias Multisucursal

Este documento detalla cómo integrar el nuevo sistema de transferencias (Envíos y Solicitudes) en el frontend.

## 1. Conceptos Clave

El sistema ahora soporta dos tipos de flujos de trabajo (*workflows*):

| Característica | Flujo de ENVÍO (Push) | Flujo de SOLICITUD (Pull) |
| :--- | :--- | :--- |
| **Origen** | Sucursal A envía a B | Sucursal B pide a A |
| **Iniciador** | Usuario de Sucursal A | Usuario de Sucursal B |
| **Tipo (`type`)** | `'SEND'` | `'REQUEST'` |
| **Estado Inicial** | `PENDING` | `REQUESTED` |
| **Requiere Aprobación** | No (nace aprobada) | Sí (Sucursal A debe aceptar) |

---

## 2. Modelos de Datos (TypeScript)

Copia estas interfaces en tu proyecto frontend (ej: `src/types/transfer.ts`).

```typescript
export type TransferStatus = 'REQUESTED' | 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
export type TransferType = 'SEND' | 'REQUEST';
export type TransferDirection = 'FROM' | 'TO'; // Para filtrado

export interface TransferItem {
    productId: string;
    productName: string;
    quantity: number;
}

export interface Transfer {
    id: string;
    
    // Sucursales
    fromBranchId: string;
    toBranchId: string;

    // Items
    items: TransferItem[];

    // Metadatos
    status: TransferStatus;
    type: TransferType;
    notes?: string;

    // Auditoría
    createdBy: string;
    approvedBy?: string;
    shippedBy?: string;
    completedBy?: string;
    
    // Fechas
    createdAt: string; // ISO date
    approvedAt?: string;
    shippedAt?: string;
    completedAt?: string;
}

export interface CreateTransferDto {
    toBranchId: string; // Destino siempre obligatorio
    fromBranchId?: string; // Opcional (solo ADMIN puede definirlo, sino se inferirá del usuario)
    items: { productId: string; quantity: number }[];
    notes?: string;
}
```

---

## 3. Capa de Servicio (Service Layer)

Ejemplo de implementación usando `axios` (o adáptalo a `fetch`).

```typescript
// src/services/transferService.ts
import axios from './axiosConfig'; // Tu instancia configurada de axios
import { Transfer, CreateTransferDto, TransferStatus, TransferDirection } from '../types/transfer';

export const transferService = {
    /**
     * Listar transferencias con filtros
     */
    getAll: async (params?: { status?: TransferStatus; direction?: TransferDirection }) => {
        const { data } = await axios.get<Transfer[]>('/api/transfers', { params });
        return data;
    },

    /**
     * Obtener detalle de una transferencia
     */
    getById: async (id: string) => {
        const { data } = await axios.get<Transfer>(`/api/transfers/${id}`);
        return data;
    },

    /**
     * Crear nueva transferencia (SEND o REQUEST se determina automáticamente en backend)
     */
    create: async (payload: CreateTransferDto) => {
        const { data } = await axios.post<Transfer>('/api/transfers', payload);
        return data;
    },

    /**
     * Acciones de Transición de Estado
     */
    
    // Paso 2 (Solo REQUEST): Aceptar solicitud
    accept: async (id: string) => {
        const { data } = await axios.patch<Transfer>(`/api/transfers/${id}/accept`);
        return data;
    },

    // Paso 3: Despachar mercadería (Salida de inventario)
    ship: async (id: string) => {
        const { data } = await axios.patch<Transfer>(`/api/transfers/${id}/ship`);
        return data;
    },

    // Paso 4: Recibir mercadería (Entrada a inventario)
    receive: async (id: string) => {
        const { data } = await axios.patch<Transfer>(`/api/transfers/${id}/receive`);
        return data;
    },

    // Cancelar (Solo si no está completada)
    cancel: async (id: string) => {
        const { data } = await axios.delete<{ message: string; transfer: Transfer }>(`/api/transfers/${id}`);
        return data;
    },
};
```

---

## 4. Lógica de UI Interactiva

Para integrar esto *perfectamente*, tu UI debe guiar al usuario mostrando **solo las acciones válidas** para su rol y sucursal actual.

### 4.1. Tabla de Permisos de Acción

Asume: `userBranchId` es la sucursal del usuario logueado.

| Estado Actual | Origen (`from`) | Destino (`to`) | Acción Visible | Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **REQUESTED** | `userBranchId` | - | **✅ Aceptar Solicitud** | `PATCH /accept` |
| **REQUESTED** | - | `userBranchId` | ❌ Esperando aprobación | - |
| | | | | |
| **PENDING** | `userBranchId` | - | **🚚 Despachar / Enviar** | `PATCH /ship` |
| **PENDING** | - | `userBranchId` | ❌ Esperando envío | - |
| | | | | |
| **IN_TRANSIT** | - | `userBranchId` | **📥 Recibir Mercadería** | `PATCH /receive` |
| **IN_TRANSIT** | `userBranchId` | - | ❌ En camino... | - |

> **Nota:** El botón **Cancelar** (`DELETE`) debe estar disponible para el **Creador** (o Admin) siempre que el estado no sea `COMPLETED` o `CANCELLED`.

### 4.2. Ejemplo de Componente de Acciones (React)

```tsx
const TransferActions = ({ transfer, userBranchId, onAction }: { transfer: Transfer, userBranchId: string, onAction: () => void }) => {
    
    // Helper para verificar roles
    const isOrigin = transfer.fromBranchId === userBranchId;
    const isDest = transfer.toBranchId === userBranchId;

    return (
        <div className="flex gap-2">
            {/* Lógica de Aprobación */}
            {transfer.status === 'REQUESTED' && isOrigin && (
                <Button onClick={() => transferService.accept(transfer.id).then(onAction)}>
                    ✅ Aceptar Solicitud
                </Button>
            )}

            {/* Lógica de Envío */}
            {transfer.status === 'PENDING' && isOrigin && (
                <Button onClick={() => transferService.ship(transfer.id).then(onAction)}>
                    🚚 Despachar Mercadería
                </Button>
            )}

            {/* Lógica de Recepción */}
            {transfer.status === 'IN_TRANSIT' && isDest && (
                <Button variant="success" onClick={() => transferService.receive(transfer.id).then(onAction)}>
                    📥 Confirmar Recepción
                </Button>
            )}

            {/* Cancelación (Simplificada) */}
            {['REQUESTED', 'PENDING'].includes(transfer.status) && isOrigin && (
                <Button variant="destructive" onClick={() => transferService.cancel(transfer.id).then(onAction)}>
                    🚫 Cancelar
                </Button>
            )}
        </div>
    );
};
```

---

## 5. Diseño de Formulario de Creación

Al crear una transferencia:
1.  **Selección de Sucursal Destino**:
    *   Si el usuario es "Sucursal A", selecciona "Sucursal B".
    *   **Backend Auto-Detecta**:
        *   Si selecciona *su misma* sucursal -> Error.
        *   Si selecciona *otra* -> Se infiere `type`.
2.  **Lista de Productos**:
    *   Permite agregar múltiples productos.
    *   **Validación Visual**: Si es tipo `SEND` (envío directo), muestra el *Stock Disponible* actual de cada producto p/evitar errores, aunque el backend validará también.

## 6. Feedback Visual (Badges)

Usa colores para los estados:
*   `REQUESTED`: 🟡 Amarillo (Alerta: Requiere acción)
*   `PENDING`: 🔵 Azul (Preparando)
*   `IN_TRANSIT`: 🟣 Violeta (En camino)
*   `COMPLETED`: 🟢 Verde (Finalizado)
*   `CANCELLED`: 🔴 Rojo (Cancelado)
