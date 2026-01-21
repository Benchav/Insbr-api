import { User } from '../../../core/entities/user.entity.js';

/**
 * Helper para determinar el branchId efectivo según el rol del usuario
 * 
 * LÓGICA DE NEGOCIO:
 * - ADMIN: Puede ver todas las sucursales o filtrar por una específica
 * - GERENTE/CAJERO: Solo pueden ver su propia sucursal
 * 
 * @param user - Usuario autenticado
 * @param queryBranchId - BranchId solicitado en query params (opcional)
 * @returns BranchId efectivo a usar en las consultas, o undefined para "todas"
 */
export function getEffectiveBranchId(
    user: { role: string; branchId: string },
    queryBranchId?: string
): string | undefined {
    // ADMIN puede elegir qué sucursal ver
    if (user.role === 'ADMIN') {
        // Si especifica 'all' o no especifica nada, retorna undefined (todas las sucursales)
        if (!queryBranchId || queryBranchId === 'all') {
            return undefined;
        }
        // Si especifica una sucursal específica, usa esa
        return queryBranchId;
    }

    // GERENTE y CAJERO siempre están restringidos a su sucursal
    // Ignoramos queryBranchId para estos roles por seguridad
    return user.branchId;
}

/**
 * Verifica si un usuario puede acceder a una sucursal específica
 * 
 * @param user - Usuario autenticado
 * @param targetBranchId - Sucursal a la que se quiere acceder
 * @returns true si el usuario puede acceder
 */
export function canAccessBranch(
    user: { role: string; branchId: string },
    targetBranchId: string
): boolean {
    // ADMIN puede acceder a cualquier sucursal
    if (user.role === 'ADMIN') {
        return true;
    }

    // GERENTE y CAJERO solo pueden acceder a su propia sucursal
    return user.branchId === targetBranchId;
}
