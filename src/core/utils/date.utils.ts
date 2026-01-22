/**
 * Utilidades de fecha configuradas para Nicaragua (America/Managua, GMT-6)
 * 
 * Este módulo centraliza todas las operaciones de fecha/hora del sistema
 * para asegurar consistencia en la zona horaria.
 */

/**
 * Obtiene la fecha/hora actual en zona horaria de Nicaragua
 */
export function getNicaraguaNow(): Date {
    // Crear fecha en zona horaria de Nicaragua
    const nicaraguaTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/Managua'
    });
    return new Date(nicaraguaTime);
}

/**
 * Obtiene la fecha actual (sin hora) en Nicaragua
 * Útil para comparaciones de "mismo día"
 */
export function getNicaraguaToday(): Date {
    const now = getNicaraguaNow();
    // Resetear a medianoche
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Convierte cualquier fecha a zona horaria de Nicaragua
 */
export function toNicaraguaDate(date: Date | string): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    const nicaraguaTime = d.toLocaleString('en-US', {
        timeZone: 'America/Managua'
    });
    return new Date(nicaraguaTime);
}

/**
 * Normaliza una fecha a medianoche en Nicaragua (para comparaciones de día)
 */
export function normalizeToNicaraguaDay(date: Date | string): Date {
    const d = toNicaraguaDate(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Compara si dos fechas son del mismo día en Nicaragua
 */
export function isSameDayNicaragua(date1: Date | string, date2: Date | string): boolean {
    const d1 = normalizeToNicaraguaDay(date1);
    const d2 = normalizeToNicaraguaDay(date2);

    return d1.getTime() === d2.getTime();
}

/**
 * Verifica si una fecha es de hoy en Nicaragua
 */
export function isTodayNicaragua(date: Date | string): boolean {
    return isSameDayNicaragua(date, getNicaraguaNow());
}

/**
 * Calcula la diferencia en días entre dos fechas (en Nicaragua)
 */
export function getDaysDifferenceNicaragua(date1: Date | string, date2: Date | string): number {
    const d1 = normalizeToNicaraguaDay(date1);
    const d2 = normalizeToNicaraguaDay(date2);

    const diffMs = d2.getTime() - d1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formatea una fecha para mostrar en Nicaragua
 */
export function formatNicaraguaDate(date: Date | string, includeTime = false): string {
    const d = toNicaraguaDate(date);

    if (includeTime) {
        return d.toLocaleString('es-NI', {
            timeZone: 'America/Managua',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    return d.toLocaleDateString('es-NI', {
        timeZone: 'America/Managua',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Agrega días a una fecha en Nicaragua
 */
export function addDaysNicaragua(date: Date | string, days: number): Date {
    const d = toNicaraguaDate(date);
    d.setDate(d.getDate() + days);
    return d;
}
