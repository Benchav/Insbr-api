import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SaleService } from '../../application/services/sale.service.js';
import { PdfService } from '../../infrastructure/reports/pdf.service.js';
import { ExcelService } from '../../infrastructure/reports/excel.service.js';
import { authorize } from '../../infrastructure/web/middlewares/auth.middleware.js';

// Interfaz simple para el repositorio de sucursales
interface IBranchRepository {
    findById(id: string): Promise<any>;
}

// Interfaz simple para el repositorio de movimientos de caja
interface ICashMovementRepository {
    findByBranch(branchId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<any[]>;
}

export function createReportController(
    saleService: SaleService,
    pdfService: PdfService,
    excelService: ExcelService,
    branchRepository: IBranchRepository,
    cashMovementRepository: ICashMovementRepository
): Router {
    const router = Router();
    // Note: authenticate middleware will be applied at app.ts level
    // Here we only apply authorize for specific roles

    /**
     * @swagger
     * /api/reports/sales/{id}/ticket:
     *   get:
     *     summary: Generar ticket PDF de una venta
     *     tags: [Reports]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID de la venta
     *     responses:
     *       200:
     *         description: PDF generado exitosamente
     *         content:
     *           application/pdf:
     *             schema:
     *               type: string
     *               format: binary
     *       404:
     *         description: Venta no encontrada
     *       401:
     *         description: No autorizado
     *       500:
     *         description: Error al generar el ticket
     */
    router.get('/sales/:id/ticket', authorize(['ADMIN', 'GERENTE', 'CAJERO']), async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'No autorizado' });
            }

            const saleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            // Buscar la venta
            const sale = await saleService.getSale(saleId);
            if (!sale) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }

            // Buscar la sucursal
            const branch = await branchRepository.findById(sale.branchId);
            if (!branch) {
                return res.status(404).json({ error: 'Sucursal no encontrada' });
            }

            // Buscar el cajero que realizó la venta (opcional)
            let cashier = undefined;
            if (sale.createdBy) {
                try {
                    const userRepo = new (await import('../../infrastructure/turso/repositories/user.repository.turso.js')).UserRepositoryTurso();
                    cashier = await userRepo.findById(sale.createdBy);
                } catch (error) {
                    console.log('No se pudo obtener información del cajero');
                }
            }

            // Buscar el cliente (opcional)
            let customer = undefined;
            if (sale.customerId) {
                try {
                    const customerRepo = new (await import('../../infrastructure/turso/repositories/customer.repository.turso.js')).CustomerRepositoryTurso();
                    customer = await customerRepo.findById(sale.customerId);
                } catch (error) {
                    console.log('No se pudo obtener información del cliente');
                }
            }

            // Generar el PDF con toda la información
            const pdfBuffer = await pdfService.generateTicket(
                sale,
                branch,
                cashier || undefined,
                customer || undefined
            );

            // Configurar headers para visualización directa (para imprimir)
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename=ticket-' + saleId.substring(0, 8) + '.pdf');
            res.setHeader('Content-Length', pdfBuffer.length);

            // Enviar el PDF
            res.send(pdfBuffer);

        } catch (error: any) {
            console.error('Error generando ticket:', error);
            res.status(500).json({ error: error.message || 'Error al generar el ticket' });
        }
    });

    /**
     * @swagger
     * /api/reports/sales/excel:
     *   get:
     *     summary: Generar reporte de ventas en Excel
     *     tags: [Reports]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: from
     *         schema:
     *           type: string
     *           format: date
     *         description: Fecha de inicio (YYYY-MM-DD)
     *       - in: query
     *         name: to
     *         schema:
     *           type: string
     *           format: date
     *         description: Fecha de fin (YYYY-MM-DD)
     *       - in: query
     *         name: branchId
     *         schema:
     *           type: string
     *         description: ID de la sucursal (opcional, por defecto usa la del usuario)
     *     responses:
     *       200:
     *         description: Excel generado exitosamente
     *         content:
     *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
     *             schema:
     *               type: string
     *               format: binary
     *       401:
     *         description: No autorizado
     *       500:
     *         description: Error al generar el reporte
     */
    router.get('/sales/excel', authorize(['ADMIN', 'GERENTE']), async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'No autorizado' });
            }

            // Parsear parámetros de query
            const querySchema = z.object({
                from: z.string().optional(),
                to: z.string().optional(),
                branchId: z.string().optional()
            });

            const query = querySchema.parse(req.query);

            // Determinar la sucursal (usar la del usuario si no se especifica)
            const branchId = query.branchId || req.user.branchId;

            // Parsear fechas si existen
            const filters: any = {};
            if (query.from) {
                filters.startDate = new Date(query.from);
            }
            if (query.to) {
                filters.endDate = new Date(query.to);
                // Ajustar a fin del día
                filters.endDate.setHours(23, 59, 59, 999);
            }

            // Obtener las ventas
            const sales = await saleService.listSalesByBranch(branchId, filters);

            // Generar el Excel
            const excelBuffer = await excelService.generateSalesReport(sales);

            // Generar nombre de archivo
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `Reporte_Ventas_${dateStr}.xlsx`;

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', excelBuffer.length);

            // Enviar el Excel
            res.send(excelBuffer);

        } catch (error: any) {
            console.error('Error generando reporte de ventas:', error);
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(500).json({ error: error.message || 'Error al generar el reporte' });
            }
        }
    });

    /**
     * @swagger
     * /api/reports/cash/excel:
     *   get:
     *     summary: Generar reporte de flujo de caja en Excel
     *     tags: [Reports]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: from
     *         schema:
     *           type: string
     *           format: date
     *         description: Fecha de inicio (YYYY-MM-DD)
     *       - in: query
     *         name: to
     *         schema:
     *           type: string
     *           format: date
     *         description: Fecha de fin (YYYY-MM-DD)
     *       - in: query
     *         name: branchId
     *         schema:
     *           type: string
     *         description: ID de la sucursal (opcional, por defecto usa la del usuario)
     *     responses:
     *       200:
     *         description: Excel generado exitosamente
     *         content:
     *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
     *             schema:
     *               type: string
     *               format: binary
     *       401:
     *         description: No autorizado
     *       500:
     *         description: Error al generar el reporte
     */
    router.get('/cash/excel', authorize(['ADMIN', 'GERENTE']), async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'No autorizado' });
            }

            // Parsear parámetros de query
            const querySchema = z.object({
                from: z.string().optional(),
                to: z.string().optional(),
                branchId: z.string().optional()
            });

            const query = querySchema.parse(req.query);

            // Determinar la sucursal (usar la del usuario si no se especifica)
            const branchId = query.branchId || req.user.branchId;

            // Parsear fechas si existen
            const filters: any = {};
            if (query.from) {
                filters.startDate = new Date(query.from);
            }
            if (query.to) {
                filters.endDate = new Date(query.to);
                // Ajustar a fin del día
                filters.endDate.setHours(23, 59, 59, 999);
            }

            // Obtener los movimientos de caja
            const movements = await cashMovementRepository.findByBranch(branchId, filters);

            // Generar el Excel
            const excelBuffer = await excelService.generateCashFlowReport(movements);

            // Generar nombre de archivo
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `Reporte_Caja_${dateStr}.xlsx`;

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', excelBuffer.length);

            // Enviar el Excel
            res.send(excelBuffer);

        } catch (error: any) {
            console.error('Error generando reporte de caja:', error);
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(500).json({ error: error.message || 'Error al generar el reporte' });
            }
        }
    });

    return router;
}
