/**
 * User Entity - Gestión de Usuarios
 * Roles:
 * - ADMIN: Acceso global a todas las sucursales
 * - GERENTE: Acceso completo limitado a su sucursal
 * - CAJERO: Acceso operativo (ventas/caja) limitado a su sucursal
 */

export type UserRole = 'ADMIN' | 'GERENTE' | 'CAJERO';

export interface User {
    id: string;
    username: string;        // Nombre de usuario único para login
    password: string;        // Hash bcrypt del password
    name: string;            // Nombre completo para mostrar
    role: UserRole;          // Rol del usuario (ADMIN, GERENTE o CAJERO)
    branchId: string;        // Sucursal asignada (ADMIN puede ver todas)
    isActive: boolean;       // Estado de la cuenta
    createdAt: Date;
    updatedAt: Date;
}
