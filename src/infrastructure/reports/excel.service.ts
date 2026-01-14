import ExcelJS from 'exceljs';
import { Sale } from '../../core/entities/sale.entity.js';
import { CashMovement } from '../../core/entities/cash-movement.entity.js';
import { IProductRepository } from '../../core/interfaces/product.repository.js';

/**
 * Servicio para generar reportes Excel profesionales con diseño tipo Dashboard
 */
export class ExcelService {
    constructor(private productRepository: IProductRepository) { }

    /**
     * Genera un reporte profesional de ventas en formato Excel
     * @param sales Array de ventas a incluir en el reporte
     * @returns Buffer con el archivo Excel generado
     */
    async generateSalesReport(sales: Sale[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte de Ventas', {
            properties: { tabColor: { argb: 'FF4472C4' } }
        });

        // ========== CABECERA ==========
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'INSUMOS BARRERA - Reporte de Ventas';
        titleCell.font = {
            name: 'Calibri',
            size: 16,
            bold: true,
            color: { argb: 'FF4472C4' }
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Fecha de generación
        worksheet.mergeCells('A2:G2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Generado: ${this.formatDateTime(new Date())}`;
        dateCell.font = { name: 'Calibri', size: 10, italic: true };
        dateCell.alignment = { horizontal: 'center' };

        // ========== DASHBOARD - TARJETAS DE RESUMEN ==========
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalUnits = sales.reduce((sum, sale) =>
            sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );
        const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Fila 4: Tarjetas de resumen
        worksheet.getRow(4).height = 40;

        // Tarjeta 1: # Ventas
        this.createDashboardCard(worksheet, 'A4', 'B4', '# Ventas', totalSales.toString(), 'FFEFF6FF');

        // Tarjeta 2: Total Facturado
        this.createDashboardCard(worksheet, 'C4', 'D4', 'Total Facturado',
            this.formatMoney(totalRevenue), 'FFE7F3E7');

        // Tarjeta 3: Unidades
        this.createDashboardCard(worksheet, 'E4', 'F4', 'Unidades', totalUnits.toString(), 'FFFFF4E6');

        // Tarjeta 4: Ticket Promedio
        this.createDashboardCard(worksheet, 'G4', 'G4', 'Ticket Promedio',
            this.formatMoney(avgTicket), 'FFE3F2FD');

        // ========== TABLA DE DATOS ==========
        // Encabezados de tabla (Fila 6)
        worksheet.getRow(6).height = 25;
        const headers = ['Folio', 'Fecha', 'Sucursal', 'Cliente', 'Método Pago', 'Tipo', 'Total'];
        const headerRow = worksheet.getRow(6);

        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        // Datos de ventas
        let currentRow = 7;
        for (const sale of sales) {
            const row = worksheet.getRow(currentRow);
            row.height = 20;

            const folio = sale.id.substring(0, 8).toUpperCase();
            const fecha = this.formatDate(sale.createdAt);
            const cliente = sale.customerId || 'Público General';
            const metodoPago = this.getPaymentMethodLabel(sale.paymentMethod);
            const tipo = sale.type === 'CASH' ? 'Contado' : 'Crédito';

            row.getCell(1).value = folio;
            row.getCell(2).value = fecha;
            row.getCell(3).value = sale.branchId;
            row.getCell(4).value = cliente;
            row.getCell(5).value = metodoPago;
            row.getCell(6).value = tipo;
            row.getCell(7).value = sale.total / 100; // Convertir centavos a córdobas
            row.getCell(7).numFmt = '"C$" #,##0.00';

            // Aplicar bordes y alineación
            for (let col = 1; col <= 7; col++) {
                const cell = row.getCell(col);
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                };
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
                cell.font = { name: 'Calibri', size: 10 };
            }

            // Centrar algunas columnas
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

            currentRow++;
        }

        // Ajustar anchos de columna
        worksheet.getColumn(1).width = 12; // Folio
        worksheet.getColumn(2).width = 18; // Fecha
        worksheet.getColumn(3).width = 15; // Sucursal
        worksheet.getColumn(4).width = 25; // Cliente
        worksheet.getColumn(5).width = 15; // Método Pago
        worksheet.getColumn(6).width = 12; // Tipo
        worksheet.getColumn(7).width = 15; // Total

        // Generar buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Genera un reporte profesional de flujo de caja en formato Excel
     * @param movements Array de movimientos de caja
     * @returns Buffer con el archivo Excel generado
     */
    async generateCashFlowReport(movements: CashMovement[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Flujo de Caja', {
            properties: { tabColor: { argb: 'FF70AD47' } }
        });

        // ========== CABECERA ==========
        worksheet.mergeCells('A1:F1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'INSUMOS BARRERA - Reporte de Flujo de Caja';
        titleCell.font = {
            name: 'Calibri',
            size: 16,
            bold: true,
            color: { argb: 'FF70AD47' }
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Fecha de generación
        worksheet.mergeCells('A2:F2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Generado: ${this.formatDateTime(new Date())}`;
        dateCell.font = { name: 'Calibri', size: 10, italic: true };
        dateCell.alignment = { horizontal: 'center' };

        // ========== DASHBOARD - TARJETAS DE RESUMEN ==========
        const totalIncome = movements
            .filter(m => m.type === 'INCOME')
            .reduce((sum, m) => sum + m.amount, 0);

        const totalExpense = movements
            .filter(m => m.type === 'EXPENSE')
            .reduce((sum, m) => sum + m.amount, 0);

        const balance = totalIncome - totalExpense;

        // Fila 4: Tarjetas de resumen
        worksheet.getRow(4).height = 40;

        // Tarjeta 1: Ingresos (Verde)
        this.createDashboardCard(worksheet, 'A4', 'B4', 'Total Ingresos',
            this.formatMoney(totalIncome), 'FFE7F3E7', 'FF70AD47');

        // Tarjeta 2: Egresos (Rojo)
        this.createDashboardCard(worksheet, 'C4', 'D4', 'Total Egresos',
            this.formatMoney(totalExpense), 'FFFCE4E4', 'FFE74C3C');

        // Tarjeta 3: Balance (Azul)
        this.createDashboardCard(worksheet, 'E4', 'F4', 'Balance Neto',
            this.formatMoney(balance), 'FFE3F2FD', 'FF4472C4');

        // ========== TABLA DE DATOS ==========
        // Encabezados de tabla (Fila 6)
        worksheet.getRow(6).height = 25;
        const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Método Pago', 'Monto'];
        const headerRow = worksheet.getRow(6);

        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF70AD47' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        // Datos de movimientos
        let currentRow = 7;
        for (const movement of movements) {
            const row = worksheet.getRow(currentRow);
            row.height = 20;

            const fecha = this.formatDateTime(movement.createdAt);
            const tipo = movement.type === 'INCOME' ? 'Ingreso' : 'Egreso';
            const categoria = this.getCategoryLabel(movement.category);
            const metodoPago = this.getPaymentMethodLabel(movement.paymentMethod);

            row.getCell(1).value = fecha;
            row.getCell(2).value = tipo;
            row.getCell(3).value = categoria;
            row.getCell(4).value = movement.description;
            row.getCell(5).value = metodoPago;
            row.getCell(6).value = movement.amount / 100; // Convertir centavos a córdobas
            row.getCell(6).numFmt = '"C$" #,##0.00';

            // Aplicar bordes y alineación
            for (let col = 1; col <= 6; col++) {
                const cell = row.getCell(col);
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                };
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
                cell.font = { name: 'Calibri', size: 10 };
            }

            // Centrar algunas columnas
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };

            // Color según tipo
            if (movement.type === 'INCOME') {
                row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FF70AD47' }, bold: true };
            } else {
                row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FFE74C3C' }, bold: true };
            }

            currentRow++;
        }

        // Ajustar anchos de columna
        worksheet.getColumn(1).width = 20; // Fecha
        worksheet.getColumn(2).width = 12; // Tipo
        worksheet.getColumn(3).width = 18; // Categoría
        worksheet.getColumn(4).width = 35; // Descripción
        worksheet.getColumn(5).width = 15; // Método Pago
        worksheet.getColumn(6).width = 15; // Monto

        // Generar buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Crea una tarjeta visual de dashboard en el Excel
     */
    private createDashboardCard(
        worksheet: ExcelJS.Worksheet,
        startCell: string,
        endCell: string,
        label: string,
        value: string,
        bgColor: string,
        textColor: string = 'FF000000'
    ): void {
        worksheet.mergeCells(`${startCell}:${endCell}`);
        const cell = worksheet.getCell(startCell);

        cell.value = `${label}\n${value}`;
        cell.font = {
            name: 'Calibri',
            size: 12,
            bold: true,
            color: { argb: textColor }
        };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
        };
        cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true
        };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF4472C4' } },
            bottom: { style: 'medium', color: { argb: 'FF4472C4' } },
            left: { style: 'medium', color: { argb: 'FF4472C4' } },
            right: { style: 'medium', color: { argb: 'FF4472C4' } }
        };
    }

    /**
     * Formatea un monto en centavos a formato de moneda nicaragüense
     */
    private formatMoney(centavos: number): string {
        const cordobas = centavos / 100;
        return `C$ ${cordobas.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /**
     * Formatea una fecha en formato DD/MM/YYYY
     */
    private formatDate(date: Date): string {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Formatea una fecha y hora en formato legible
     */
    private formatDateTime(date: Date): string {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    /**
     * Obtiene la etiqueta legible del método de pago
     */
    private getPaymentMethodLabel(method?: 'CASH' | 'TRANSFER' | 'CHECK'): string {
        if (!method) return 'N/A';
        const labels = {
            CASH: 'Efectivo',
            TRANSFER: 'Transferencia',
            CHECK: 'Cheque'
        };
        return labels[method] || method;
    }

    /**
     * Obtiene la etiqueta legible de la categoría de movimiento
     */
    private getCategoryLabel(category: string): string {
        const labels: Record<string, string> = {
            SALE: 'Venta',
            PURCHASE: 'Compra',
            CREDIT_PAYMENT: 'Abono Crédito',
            EXPENSE: 'Gasto',
            TRANSFER: 'Transferencia',
            ADJUSTMENT: 'Ajuste'
        };
        return labels[category] || category;
    }
}
