import PDFDocument from 'pdfkit';
import { Sale, SaleItem } from '../../core/entities/sale.entity.js';
import { Branch } from '../../core/entities/branch.entity.js';
import { User } from '../../core/entities/user.entity.js';
import { Customer } from '../../core/entities/customer.entity.js';

// Constantes de formato de moneda nicaragüense
const baseCurrencyFormatter = new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatCurrency = (value: number) => baseCurrencyFormatter.format(value);

/**
 * Servicio para generar tickets PDF térmicos profesionales (80mm)
 * Optimizado para impresoras térmicas de ticket
 */
export class PdfService {
    /**
     * Genera un ticket de venta profesional en formato térmico 80mm
     * @param sale Venta a imprimir
     * @param branch Sucursal donde se realizó la venta
     * @param cashier Usuario que realizó la venta (opcional)
     * @param customer Cliente (opcional)
     * @returns Buffer con el PDF generado
     */
    async generateTicket(
        sale: Sale,
        branch: Branch,
        cashier?: User,
        customer?: Customer
    ): Promise<Buffer> {
        // Calcular totales (convertir de centavos a córdobas)
        const subtotal = sale.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) / 100;
        const total = sale.total / 100;
        const discount = sale.discount / 100;
        const tax = sale.tax / 100;

        return new Promise((resolve, reject) => {
            try {
                // Configuración de papel térmico (226px ancho ≈ 80mm)
                const doc = new PDFDocument({
                    margin: 10,
                    size: [226, 1000] // Altura dinámica
                });

                const buffers: Buffer[] = [];
                doc.on("data", buffers.push.bind(buffers));
                doc.on("end", () => resolve(Buffer.concat(buffers)));
                doc.on("error", reject);

                // Dibujar secciones del ticket
                this.drawTicketHeader(doc, branch);
                this.drawTicketMeta(doc, sale, cashier, customer);
                this.drawTicketItems(doc, sale.items);
                this.drawTicketTotals(doc, subtotal, discount, tax, total, sale.type, sale.paymentMethod);
                this.drawTicketFooter(doc, sale);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Genera un estado de cuenta de crédito (CPP) en formato ticket 80mm
     * @param ticketData Datos completos del ticket (cuenta, productos, pagos)
     * @param branchName Nombre de la sucursal
     * @param branchAddress Dirección de la sucursal
     * @param branchPhone Teléfono de la sucursal
     */
    async generateCreditTicket(
        ticketData: any,
        branchName: string,
        branchAddress: string,
        branchPhone: string
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                // Configuración de papel térmico (226px ancho ≈ 80mm)
                const doc = new PDFDocument({
                    margin: 10,
                    size: [226, 1000] // Altura dinámica
                });

                const buffers: Buffer[] = [];
                doc.on("data", buffers.push.bind(buffers));
                doc.on("end", () => resolve(Buffer.concat(buffers)));
                doc.on("error", reject);

                // --- CABECERA ---
                const pageWidth = 226;
                const margin = 10;
                const contentWidth = pageWidth - 2 * margin;

                doc.font("Helvetica-Bold").fontSize(12)
                    .text("ERP INSUMOS", margin, doc.y, { width: contentWidth, align: "center" });
                doc.moveDown(0.2);
                doc.fontSize(10)
                    .text(branchName.toUpperCase(), { width: contentWidth, align: "center" });
                doc.fontSize(8).font("Helvetica")
                    .text(branchAddress, { width: contentWidth, align: "center" });
                doc.text(`Tel: ${branchPhone}`, { width: contentWidth, align: "center" });

                doc.moveDown(0.5);
                this.drawDoubleLine(doc);
                doc.moveDown(0.5);

                // --- TÍTULO ---
                doc.font("Helvetica-Bold").fontSize(10)
                    .text("ESTADO DE CUENTA (CPP)", { width: contentWidth, align: "center" });
                doc.moveDown(0.5);

                // --- INFO CUENTA ---
                doc.font("Helvetica").fontSize(9);
                doc.text(`Proveedor: ${ticketData.account.supplierName}`);
                doc.text(`Factura Prov: ${ticketData.account.invoiceNumber}`);

                const dueDate = new Date(ticketData.account.dueDate);
                doc.text(`Vence: ${this.formatDate(dueDate)}`);

                let statusText = ticketData.account.status;
                if (statusText === 'PENDIENTE') statusText = 'PENDIENTE DE PAGO';
                if (statusText === 'PAGADO_PARCIAL') statusText = 'PAGO PARCIAL';

                doc.font("Helvetica-Bold");
                doc.text(`Estado: ${statusText}`);
                doc.font("Helvetica");

                doc.moveDown(0.5);
                this.drawDottedLine(doc);
                doc.moveDown(0.5);

                // --- DETALLE DE COMPRA ---
                doc.font("Helvetica-Bold").fontSize(9).text("DETALLE DE COMPRA:");
                doc.moveDown(0.2);

                // Headers Items (Posicionamiento Absoluto)
                let y = doc.y;
                doc.fontSize(7);

                // Definición de columnas (Ajustado para mejor espaciado)
                // Ancho total disponible: 206pt (226 - 10 - 10)
                const xQty = margin;          // 10
                const wQty = 30;              // +5pt

                const xDesc = margin + wQty + 5; // 45 (espacio extra)
                const wDesc = 115;            // -5pt

                const xTotal = margin + wQty + 5 + wDesc; // 160
                const wTotal = 56; // Resto hasta 216 (alineado a la derecha)

                doc.text("CANT", xQty, y, { width: wQty, align: 'left' });
                doc.text("DESCRIPCION", xDesc, y, { width: wDesc, align: 'left' });
                doc.text("TOTAL", xTotal, y, { width: wTotal, align: 'right' });

                doc.y = y + 10; // Avanzar manual
                this.drawThinLine(doc);
                doc.moveDown(0.2);

                // Items Loop
                doc.fontSize(8).font("Helvetica");
                ticketData.purchase.items.forEach((item: any) => {
                    y = doc.y;
                    const qty = `${item.quantity}`;
                    const total = formatCurrency(item.subtotal / 100);

                    // 1. Cantidad
                    doc.text(qty, xQty, y, { width: wQty, align: 'left' });

                    // 2. Total (Dibujarlo antes para asegurar posición)
                    doc.text(total, xTotal, y, { width: wTotal, align: 'right' });

                    // 3. Descripción (Puede saltar linea)
                    doc.text(item.productName, xDesc, y, { width: wDesc, align: 'left' });

                    // Calcular nueva altura
                    const descHeight = doc.heightOfString(item.productName, { width: wDesc });
                    const rowHeight = Math.max(descHeight, 10);
                    doc.y = y + rowHeight + 3;
                });

                this.drawThinLine(doc);

                // --- TOTALES ---
                const total = ticketData.account.total / 100;
                const paid = ticketData.account.paid / 100;
                const balance = ticketData.account.balance / 100;

                doc.moveDown(0.5);

                // Helper para linea de total con alineación perfecta
                const printTotalRow = (label: string, val: string, isBold = false, fontSize = 9) => {
                    const currentY = doc.y;
                    doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);

                    // Label Izquierda
                    doc.text(label, margin, currentY, { width: contentWidth * 0.6, align: 'left' });

                    // Valor Derecha (misma Y)
                    doc.text(val, margin, currentY, { width: contentWidth, align: 'right' });

                    // Avanzar según tamaño de fuente
                    doc.y = currentY + fontSize + 4;
                };

                printTotalRow("TOTAL COMPRA:", formatCurrency(total), true, 10);
                printTotalRow("Total Abonado:", `-${formatCurrency(paid)}`, false, 9);

                doc.moveDown(0.2);
                printTotalRow("SALDO ACTUAL:", formatCurrency(balance), true, 14); // Más grande y claro

                doc.moveDown(0.2);
                this.drawDoubleLine(doc);
                doc.moveDown(0.5);

                // --- HISTORIAL PAGOS ---
                if (ticketData.payments.length > 0) {
                    doc.font("Helvetica-Bold").fontSize(9).text("HISTORIAL DE ABONOS:");
                    doc.moveDown(0.2);
                    doc.font("Helvetica").fontSize(7);

                    // Headers Tabla Pagos (Posicionamiento Absoluto)
                    y = doc.y;

                    const xDate = margin;
                    const wDate = 50;

                    const xRef = margin + wDate + 5;
                    const wRef = 85;

                    const xAmount = margin + wDate + 5 + wRef;
                    const wAmount = 66;

                    doc.text("FECHA", xDate, y, { width: wDate, align: 'left' });
                    doc.text("REF/METODO", xRef, y, { width: wRef, align: 'left' });
                    doc.text("MONTO", xAmount, y, { width: wAmount, align: 'right' });

                    doc.y = y + 10;
                    this.drawThinLine(doc);
                    doc.font("Helvetica").fontSize(8);

                    ticketData.payments.forEach((p: any) => {
                        y = doc.y;
                        const date = this.formatDate(new Date(p.date));
                        let ref = p.reference || p.method || '-';
                        const amount = formatCurrency(p.amount / 100);

                        doc.text(date, xDate, y, { width: wDate, align: 'left' });
                        doc.text(ref, xRef, y, { width: wRef, align: 'left' });
                        doc.text(amount, xAmount, y, { width: wAmount, align: 'right' });

                        // Altura basada en referencia
                        const refHeight = doc.heightOfString(ref, { width: wRef });
                        doc.y = y + Math.max(refHeight, 10) + 3;
                    });
                } else {
                    doc.font("Helvetica-Oblique").fontSize(8).text("No hay abonos registrados", { align: "center" });
                }

                doc.moveDown(1);
                // Footer con Fecha Managua
                const now = new Date();
                const genDate = this.formatDate(now);
                const genTime = this.formatTime(now);
                doc.font("Helvetica").fontSize(7).text(`Generado: ${genDate}, ${genTime}`, { align: "center" });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
    private drawTicketHeader(doc: PDFKit.PDFDocument, branch: Branch): void {
        const pageWidth = 226;
        const margin = 10;
        const contentWidth = pageWidth - 2 * margin;

        // Nombre de la empresa (centrado, negrita, más grande)
        doc.font("Helvetica-Bold")
            .fontSize(14)
            .text("ERP INSUMOS", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        doc.moveDown(0.3);

        // Nombre de la sucursal
        doc.fontSize(11)
            .text(branch.name.toUpperCase(), margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        doc.moveDown(0.2);

        // Dirección
        doc.font("Helvetica")
            .fontSize(8)
            .text(branch.address, margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        // Teléfono
        doc.text(`Tel: ${branch.phone}`, margin, doc.y + 2, {
            width: contentWidth,
            align: "center"
        });

        // Línea separadora doble
        doc.moveDown(0.5);
        this.drawDoubleLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja la metadata del ticket (fecha, folio, cajero, cliente)
     */
    private drawTicketMeta(
        doc: PDFKit.PDFDocument,
        sale: Sale,
        cashier?: User,
        customer?: Customer
    ): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        doc.font("Helvetica-Bold")
            .fontSize(10)
            .text("TICKET DE VENTA", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        doc.moveDown(0.5);

        doc.font("Helvetica")
            .fontSize(9);

        // Folio (más prominente)
        const folio = sale.id.substring(sale.id.lastIndexOf('-') + 1).toUpperCase();
        doc.font("Helvetica-Bold")
            .text(`No. ${folio}`, margin, doc.y, { width: contentWidth });

        doc.font("Helvetica");

        // Fecha y hora
        const saleDate = new Date(sale.createdAt);
        const dateStr = this.formatDate(saleDate);
        const timeStr = this.formatTime(saleDate);
        doc.text(`Fecha: ${dateStr}`, margin, doc.y, { width: contentWidth });
        doc.text(`Hora: ${timeStr}`, margin, doc.y, { width: contentWidth });

        // Cajero (si está disponible)
        if (cashier) {
            doc.text(`Cajero: ${cashier.name}`, margin, doc.y, { width: contentWidth });
        }

        // Cliente (solo si existe y no es venta de contado genérica)
        if (customer) {
            doc.text(`Cliente: ${customer.name}`, margin, doc.y, { width: contentWidth });
            if (customer.phone) {
                doc.fontSize(8)
                    .text(`  Tel: ${customer.phone}`, margin, doc.y, { width: contentWidth });
                doc.fontSize(9);
            }
        }

        // Tipo de venta y método de pago
        const saleType = sale.type === 'CASH' ? 'CONTADO' : 'CRÉDITO';
        let paymentInfo = `Tipo: ${saleType}`;

        if (sale.type === 'CASH' && sale.paymentMethod) {
            const paymentMethods: Record<string, string> = {
                'CASH': 'Efectivo',
                'TRANSFER': 'Transferencia',
                'CHECK': 'Cheque'
            };
            paymentInfo += ` - ${paymentMethods[sale.paymentMethod] || sale.paymentMethod}`;
        }

        doc.text(paymentInfo, margin, doc.y, { width: contentWidth });

        // Línea separadora
        doc.moveDown(0.5);
        this.drawDottedLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja los items del ticket con mejor formato usando posicionamiento absoluto
     */
    private drawTicketItems(doc: PDFKit.PDFDocument, items: SaleItem[]): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        // Definir columnas con posicionamiento absoluto
        const xQty = margin;           // Posición X de cantidad
        const wQty = 25;               // Ancho de cantidad

        const xDesc = margin + wQty;   // Posición X de descripción
        const wDesc = 120;             // Ancho de descripción

        const xTotal = margin + wQty + wDesc; // Posición X de total
        const wTotal = contentWidth - wQty - wDesc; // Ancho de total

        // Encabezado de items
        let y = doc.y;
        doc.font("Helvetica-Bold").fontSize(8);
        doc.text("CANT", xQty, y, { width: wQty, align: 'left' });
        doc.text("DESCRIPCIÓN", xDesc, y, { width: wDesc, align: 'left' });
        doc.text("IMPORTE", xTotal, y, { width: wTotal, align: 'right' });

        doc.y = y + 10;
        this.drawThinLine(doc);
        doc.moveDown(0.3);

        // Iterar sobre los items
        for (const item of items) {
            y = doc.y;

            // Nombre del producto (truncar si es muy largo)
            let productName = item.productName;
            if (productName.length > 24) {
                productName = productName.substring(0, 21) + "...";
            }

            // Formatear cantidad y totales
            const qtyText = `${item.quantity}x`;
            const unitPrice = item.unitPrice / 100;
            const subtotal = item.subtotal / 100;
            const subtotalText = formatCurrency(subtotal);

            // 1. Dibujar cantidad (izquierda)
            doc.font("Helvetica-Bold").fontSize(9);
            doc.text(qtyText, xQty, y, { width: wQty, align: 'left' });

            // 2. Dibujar descripción (centro)
            doc.font("Helvetica").fontSize(9);
            doc.text(productName, xDesc, y, { width: wDesc, align: 'left' });

            // 3. Dibujar total (derecha)
            doc.font("Helvetica-Bold").fontSize(9);
            doc.text(subtotalText, xTotal, y, { width: wTotal, align: 'right' });

            // Avanzar Y después de la primera línea
            doc.y = y + 12;

            // Precio unitario en segunda línea (más pequeño)
            const priceText = `${formatCurrency(unitPrice)} c/u`;
            doc.font("Helvetica").fontSize(8);
            doc.text(priceText, xDesc, doc.y, { width: wDesc, align: 'left' });

            doc.moveDown(0.5);
        }

        // Línea separadora
        doc.moveDown(0.2);
        this.drawDottedLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja los totales del ticket con formato mejorado
     */
    private drawTicketTotals(
        doc: PDFKit.PDFDocument,
        subtotal: number,
        discount: number,
        tax: number,
        total: number,
        saleType: string,
        paymentMethod?: string
    ): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        doc.font("Helvetica").fontSize(9);

        // Subtotal
        this.drawTotalLine(doc, "Subtotal:", formatCurrency(subtotal), margin, contentWidth);

        // Descuento (si aplica)
        if (discount > 0) {
            this.drawTotalLine(doc, "Descuento:", `-${formatCurrency(discount)}`, margin, contentWidth);
        }

        // Impuesto (si aplica)
        if (tax > 0) {
            this.drawTotalLine(doc, "IVA:", formatCurrency(tax), margin, contentWidth);
        }

        // Línea antes del total
        doc.moveDown(0.3);
        this.drawThinLine(doc);
        doc.moveDown(0.3);

        // Total (destacado y más grande)
        doc.font("Helvetica-Bold").fontSize(12);
        this.drawTotalLine(doc, "TOTAL:", formatCurrency(total), margin, contentWidth);

        // Si es crédito, mostrar información adicional
        if (saleType === 'CREDIT') {
            doc.moveDown(0.3);
            doc.font("Helvetica").fontSize(8);
            doc.text("** VENTA A CRÉDITO **", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });
        }

        doc.moveDown(0.5);
        this.drawDoubleLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja el pie del ticket
     */
    private drawTicketFooter(doc: PDFKit.PDFDocument, sale: Sale): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        // Mensaje de agradecimiento
        doc.font("Helvetica-Bold")
            .fontSize(11)
            .text("¡GRACIAS POR SU COMPRA!", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        // Estado de la venta (si está cancelada)
        if (sale.status === 'CANCELLED') {
            doc.moveDown(0.8);
            doc.font("Helvetica-Bold")
                .fontSize(10)
                .text("*** VENTA CANCELADA ***", margin, doc.y, {
                    width: contentWidth,
                    align: "center"
                });
        }

        doc.moveDown(0.8);

        // Información del sistema
        doc.font("Helvetica")
            .fontSize(6)
            .text("Sistema ERP Insumos v2.0", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });
    }

    /**
     * Dibuja una línea punteada separadora
     */
    private drawDottedLine(doc: PDFKit.PDFDocument): void {
        const margin = 10;
        const pageWidth = 226;
        const y = doc.y;

        doc.save();
        doc.strokeColor("#000000")
            .lineWidth(0.5)
            .dash(2, 2)
            .moveTo(margin, y)
            .lineTo(pageWidth - margin, y)
            .stroke();
        doc.restore();

        doc.moveDown(0.1);
    }

    /**
     * Dibuja una línea sólida delgada
     */
    private drawThinLine(doc: PDFKit.PDFDocument): void {
        const margin = 10;
        const pageWidth = 226;
        const y = doc.y;

        doc.save();
        doc.strokeColor("#000000")
            .lineWidth(0.5)
            .moveTo(margin, y)
            .lineTo(pageWidth - margin, y)
            .stroke();
        doc.restore();

        doc.moveDown(0.1);
    }

    /**
     * Dibuja una línea doble
     */
    private drawDoubleLine(doc: PDFKit.PDFDocument): void {
        const margin = 10;
        const pageWidth = 226;
        const y = doc.y;

        doc.save();
        doc.strokeColor("#000000")
            .lineWidth(1)
            .moveTo(margin, y)
            .lineTo(pageWidth - margin, y)
            .stroke();

        doc.strokeColor("#000000")
            .lineWidth(1)
            .moveTo(margin, y + 2)
            .lineTo(pageWidth - margin, y + 2)
            .stroke();
        doc.restore();

        doc.moveDown(0.2);
    }

    /**
     * Dibuja una línea de total con label y valor alineado a la derecha
     */
    private drawTotalLine(doc: PDFKit.PDFDocument, label: string, value: string, margin: number, contentWidth: number): void {
        const labelWidth = doc.widthOfString(label);
        const valueWidth = doc.widthOfString(value);
        const spacingWidth = contentWidth - labelWidth - valueWidth;

        doc.text(label, margin, doc.y, { continued: true, width: labelWidth + spacingWidth })
            .text(value, { align: "right" });
    }

    /**
     * Formatea una fecha en formato DD/MM/YYYY (Zona Horaria Nicaragua)
     */
    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Managua'
        }).format(date);
    }

    /**
     * Formatea una hora en formato HH:MM AM/PM (Zona Horaria Nicaragua)
     */
    private formatTime(date: Date): string {
        return new Intl.DateTimeFormat('es-NI', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Managua'
        }).format(date);
    }
}

