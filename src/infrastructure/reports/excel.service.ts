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
     * Genera un reporte profesional de inventario agrupado por sucursal (Solo ADMIN)
     * @param stockByBranch Inventario organizado por sucursal
     * @returns Buffer con el archivo Excel generado
     */
    async generateInventoryReport(stockByBranch: Array<{
        branchId: string;
        branchName: string;
        branchCode: string;
        stock: Array<{
            productId: string;
            productName: string;
            productSku: string;
            quantity: number;
            minStock: number;
            maxStock: number;
            costPrice: number;
            retailPrice: number;
        }>;
    }>): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario por Sucursal', {
            properties: { tabColor: { argb: 'FFFF9800' } }
        });

        // ========== CABECERA PRINCIPAL ==========
        worksheet.mergeCells('A1:H1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'INSUMOS BARRERA - Reporte de Inventario';
        titleCell.font = {
            name: 'Calibri',
            size: 18,
            bold: true,
            color: { argb: 'FFFF9800' }
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 35;

        // Fecha de generación
        worksheet.mergeCells('A2:H2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Generado: ${this.formatDateTime(new Date())}`;
        dateCell.font = { name: 'Calibri', size: 10, italic: true };
        dateCell.alignment = { horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // ========== RESUMEN GENERAL ==========
        const totalProducts = stockByBranch.reduce((sum, branch) => sum + branch.stock.length, 0);
        const totalValue = stockByBranch.reduce((sum, branch) =>
            sum + branch.stock.reduce((s, item) => s + (item.quantity * item.costPrice), 0), 0
        );
        const lowStockItems = stockByBranch.reduce((sum, branch) =>
            sum + branch.stock.filter(item => item.quantity <= item.minStock).length, 0
        );

        worksheet.getRow(4).height = 40;
        this.createDashboardCard(worksheet, 'A4', 'B4', 'Total Productos', totalProducts.toString(), 'FFFFE0B2');
        this.createDashboardCard(worksheet, 'C4', 'E4', 'Valor Total Inventario',
            this.formatMoney(totalValue), 'FFE1F5FE');
        this.createDashboardCard(worksheet, 'F4', 'H4', 'Productos Bajo Stock',
            lowStockItems.toString(), lowStockItems > 0 ? 'FFFFCDD2' : 'FFC8E6C9');

        let currentRow = 6;

        // ========== DATOS POR SUCURSAL ==========
        for (const branch of stockByBranch) {
            // Separador visual
            currentRow++;

            // HEADER DE SUCURSAL
            worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
            const branchHeader = worksheet.getCell(`A${currentRow}`);
            branchHeader.value = `📍 ${branch.branchName.toUpperCase()} (${branch.branchCode})`;
            branchHeader.font = {
                name: 'Calibri',
                size: 14,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            branchHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF9800' }
            };
            branchHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            worksheet.getRow(currentRow).height = 30;
            currentRow++;

            // Estadísticas de la sucursal
            const branchTotal = branch.stock.length;
            const branchValue = branch.stock.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
            const branchLowStock = branch.stock.filter(item => item.quantity <= item.minStock).length;

            worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
            const branchStats = worksheet.getCell(`A${currentRow}`);
            branchStats.value = `   Productos: ${branchTotal} | Valor: ${this.formatMoney(branchValue)} | Bajo Stock: ${branchLowStock}`;
            branchStats.font = { name: 'Calibri', size: 10, italic: true };
            branchStats.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF3E0' }
            };
            branchStats.alignment = { horizontal: 'left', vertical: 'middle' };
            worksheet.getRow(currentRow).height = 20;
            currentRow++;

            // Encabezados de tabla
            const headers = ['SKU', 'Producto', 'Cantidad', 'Mín', 'Máx', 'Costo Unit.', 'Precio Venta', 'Valor Total'];
            const headerRow = worksheet.getRow(currentRow);
            headerRow.height = 25;

            headers.forEach((header, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = header;
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF757575' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            currentRow++;

            // Datos de productos
            for (const item of branch.stock) {
                const row = worksheet.getRow(currentRow);
                row.height = 20;

                const isLowStock = item.quantity <= item.minStock;
                const valorTotal = item.quantity * item.costPrice;

                row.getCell(1).value = item.productSku;
                row.getCell(2).value = item.productName;
                row.getCell(3).value = item.quantity;
                row.getCell(4).value = item.minStock;
                row.getCell(5).value = item.maxStock;
                row.getCell(6).value = item.costPrice / 100;
                row.getCell(6).numFmt = '"C$" #,##0.00';
                row.getCell(7).value = item.retailPrice / 100;
                row.getCell(7).numFmt = '"C$" #,##0.00';
                row.getCell(8).value = valorTotal / 100;
                row.getCell(8).numFmt = '"C$" #,##0.00';

                // Aplicar estilos
                for (let col = 1; col <= 8; col++) {
                    const cell = row.getCell(col);
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                    cell.font = { name: 'Calibri', size: 10 };
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }

                // Resaltar bajo stock
                if (isLowStock) {
                    row.getCell(3).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFCDD2' }
                    };
                    row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD32F2F' } };
                }

                // Centrar columnas numéricas
                row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

                currentRow++;
            }

            // Subtotal de sucursal
            const subtotalRow = worksheet.getRow(currentRow);
            subtotalRow.height = 25;
            worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
            const subtotalLabel = subtotalRow.getCell(1);
            subtotalLabel.value = `SUBTOTAL ${branch.branchName.toUpperCase()}`;
            subtotalLabel.font = { name: 'Calibri', size: 11, bold: true };
            subtotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
            subtotalLabel.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE0B2' }
            };

            const subtotalValue = subtotalRow.getCell(8);
            subtotalValue.value = branchValue / 100;
            subtotalValue.numFmt = '"C$" #,##0.00';
            subtotalValue.font = { name: 'Calibri', size: 11, bold: true };
            subtotalValue.alignment = { horizontal: 'right', vertical: 'middle' };
            subtotalValue.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE0B2' }
            };

            currentRow += 2;
        }

        // Ajustar anchos de columna
        worksheet.getColumn(1).width = 15; // SKU
        worksheet.getColumn(2).width = 35; // Producto
        worksheet.getColumn(3).width = 12; // Cantidad
        worksheet.getColumn(4).width = 8;  // Mín
        worksheet.getColumn(5).width = 8;  // Máx
        worksheet.getColumn(6).width = 14; // Costo
        worksheet.getColumn(7).width = 14; // Precio
        worksheet.getColumn(8).width = 16; // Valor Total

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Genera un reporte profesional de clientes agrupado por tipo (Solo ADMIN)
     * @param clientsByType Clientes organizados por tipo
     * @returns Buffer con el archivo Excel generado
     */
    async generateClientsReport(clientsByType: Array<{
        type: 'RETAIL' | 'WHOLESALE';
        typeName: string;
        clients: Array<{
            id: string;
            name: string;
            phone: string;
            email?: string;
            address: string;
            creditLimit: number;
            currentDebt: number;
            isActive: boolean;
        }>;
    }>): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Cartera de Clientes', {
            properties: { tabColor: { argb: 'FF9C27B0' } }
        });

        // ========== CABECERA PRINCIPAL ==========
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'INSUMOS BARRERA - Reporte de Clientes';
        titleCell.font = {
            name: 'Calibri',
            size: 18,
            bold: true,
            color: { argb: 'FF9C27B0' }
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 35;

        // Fecha de generación
        worksheet.mergeCells('A2:G2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Generado: ${this.formatDateTime(new Date())}`;
        dateCell.font = { name: 'Calibri', size: 10, italic: true };
        dateCell.alignment = { horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // ========== RESUMEN GENERAL ==========
        const totalClients = clientsByType.reduce((sum, type) => sum + type.clients.length, 0);
        const totalCreditLimit = clientsByType.reduce((sum, type) =>
            sum + type.clients.reduce((s, c) => s + c.creditLimit, 0), 0
        );
        const totalDebt = clientsByType.reduce((sum, type) =>
            sum + type.clients.reduce((s, c) => s + c.currentDebt, 0), 0
        );
        const activeClients = clientsByType.reduce((sum, type) =>
            sum + type.clients.filter(c => c.isActive).length, 0
        );

        worksheet.getRow(4).height = 40;
        this.createDashboardCard(worksheet, 'A4', 'B4', 'Total Clientes', totalClients.toString(), 'FFE1BEE7');
        this.createDashboardCard(worksheet, 'C4', 'D4', 'Límite Crédito Total',
            this.formatMoney(totalCreditLimit), 'FFE3F2FD');
        this.createDashboardCard(worksheet, 'E4', 'F4', 'Deuda Total',
            this.formatMoney(totalDebt), totalDebt > 0 ? 'FFFFECB3' : 'FFC8E6C9');
        this.createDashboardCard(worksheet, 'G4', 'G4', 'Activos',
            activeClients.toString(), 'FFC8E6C9');

        let currentRow = 6;

        // ========== DATOS POR TIPO DE CLIENTE ==========
        for (const clientType of clientsByType) {
            // Separador visual
            currentRow++;

            // HEADER DE TIPO
            worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
            const typeHeader = worksheet.getCell(`A${currentRow}`);
            typeHeader.value = `👥 ${clientType.typeName.toUpperCase()}`;
            typeHeader.font = {
                name: 'Calibri',
                size: 14,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            typeHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF9C27B0' }
            };
            typeHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            worksheet.getRow(currentRow).height = 30;
            currentRow++;

            // Estadísticas del tipo
            const typeTotal = clientType.clients.length;
            const typeCreditLimit = clientType.clients.reduce((sum, c) => sum + c.creditLimit, 0);
            const typeDebt = clientType.clients.reduce((sum, c) => sum + c.currentDebt, 0);
            const typeActive = clientType.clients.filter(c => c.isActive).length;

            worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
            const typeStats = worksheet.getCell(`A${currentRow}`);
            typeStats.value = `   Clientes: ${typeTotal} | Activos: ${typeActive} | Límite Total: ${this.formatMoney(typeCreditLimit)} | Deuda: ${this.formatMoney(typeDebt)}`;
            typeStats.font = { name: 'Calibri', size: 10, italic: true };
            typeStats.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3E5F5' }
            };
            typeStats.alignment = { horizontal: 'left', vertical: 'middle' };
            worksheet.getRow(currentRow).height = 20;
            currentRow++;

            // Encabezados de tabla
            const headers = ['Cliente', 'Teléfono', 'Email', 'Límite Crédito', 'Deuda Actual', 'Disponible', 'Estado'];
            const headerRow = worksheet.getRow(currentRow);
            headerRow.height = 25;

            headers.forEach((header, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = header;
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF757575' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            currentRow++;

            // Datos de clientes
            for (const client of clientType.clients) {
                const row = worksheet.getRow(currentRow);
                row.height = 20;

                const disponible = client.creditLimit - client.currentDebt;
                const hasDebt = client.currentDebt > 0;

                row.getCell(1).value = client.name;
                row.getCell(2).value = client.phone;
                row.getCell(3).value = client.email || 'N/A';
                row.getCell(4).value = client.creditLimit / 100;
                row.getCell(4).numFmt = '"C$" #,##0.00';
                row.getCell(5).value = client.currentDebt / 100;
                row.getCell(5).numFmt = '"C$" #,##0.00';
                row.getCell(6).value = disponible / 100;
                row.getCell(6).numFmt = '"C$" #,##0.00';
                row.getCell(7).value = client.isActive ? 'Activo' : 'Inactivo';

                // Aplicar estilos
                for (let col = 1; col <= 7; col++) {
                    const cell = row.getCell(col);
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                    cell.font = { name: 'Calibri', size: 10 };
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }

                // Resaltar deuda
                if (hasDebt) {
                    row.getCell(5).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFECB3' }
                    };
                    row.getCell(5).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF57C00' } };
                }

                // Resaltar estado
                if (!client.isActive) {
                    row.getCell(7).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFEEEEEE' }
                    };
                    row.getCell(7).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF757575' } };
                } else {
                    row.getCell(7).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFC8E6C9' }
                    };
                    row.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF388E3C' } };
                }

                // Alineación
                row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

                currentRow++;
            }

            // Subtotal del tipo
            const subtotalRow = worksheet.getRow(currentRow);
            subtotalRow.height = 25;
            worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
            const subtotalLabel = subtotalRow.getCell(1);
            subtotalLabel.value = `SUBTOTAL ${clientType.typeName.toUpperCase()}`;
            subtotalLabel.font = { name: 'Calibri', size: 11, bold: true };
            subtotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
            subtotalLabel.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE1BEE7' }
            };

            const subtotalCredit = subtotalRow.getCell(4);
            subtotalCredit.value = typeCreditLimit / 100;
            subtotalCredit.numFmt = '"C$" #,##0.00';
            subtotalCredit.font = { name: 'Calibri', size: 11, bold: true };
            subtotalCredit.alignment = { horizontal: 'right', vertical: 'middle' };
            subtotalCredit.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE1BEE7' }
            };

            const subtotalDebt = subtotalRow.getCell(5);
            subtotalDebt.value = typeDebt / 100;
            subtotalDebt.numFmt = '"C$" #,##0.00';
            subtotalDebt.font = { name: 'Calibri', size: 11, bold: true };
            subtotalDebt.alignment = { horizontal: 'right', vertical: 'middle' };
            subtotalDebt.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE1BEE7' }
            };

            currentRow += 2;
        }

        // Ajustar anchos de columna
        worksheet.getColumn(1).width = 30; // Cliente
        worksheet.getColumn(2).width = 15; // Teléfono
        worksheet.getColumn(3).width = 25; // Email
        worksheet.getColumn(4).width = 16; // Límite
        worksheet.getColumn(5).width = 16; // Deuda
        worksheet.getColumn(6).width = 16; // Disponible
        worksheet.getColumn(7).width = 12; // Estado

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
