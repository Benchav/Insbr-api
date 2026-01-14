/**
 * User Entity - Gestión de Usuarios
 * Roles: ADMIN (control total) y SELLER (vendedor con permisos limitados)
 */

export type UserRole = 'ADMIN' | 'SELLER';

export interface User {
    id: string;
    username: string;        // Nombre de usuario único para login
    password: string;        // Hash bcrypt del password
    name: string;            // Nombre completo para mostrar
    role: UserRole;          // Rol del usuario (ADMIN o SELLER)
    branchId: string;        // Sucursal asignada
    isActive: boolean;       // Estado de la cuenta
    createdAt: Date;
    updatedAt: Date;
}
