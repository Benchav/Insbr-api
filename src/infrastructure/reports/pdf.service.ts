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
     * Dibuja la cabecera del ticket con información de la sucursal
     */
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
     * Dibuja los items del ticket con mejor formato
     */
    private drawTicketItems(doc: PDFKit.PDFDocument, items: SaleItem[]): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        // Encabezado de items
        doc.font("Helvetica-Bold")
            .fontSize(8)
            .text("CANT  DESCRIPCIÓN", margin, doc.y, { width: contentWidth * 0.7, continued: true })
            .text("IMPORTE", { width: contentWidth * 0.3, align: "right" });

        doc.moveDown(0.2);
        this.drawThinLine(doc);
        doc.moveDown(0.3);

        // Iterar sobre los items
        for (const item of items) {
            doc.font("Helvetica").fontSize(9);

            // Nombre del producto (truncar si es muy largo)
            let productName = item.productName;
            if (productName.length > 26) {
                productName = productName.substring(0, 23) + "...";
            }

            // Cantidad y nombre
            const qtyText = `${item.quantity}x`;
            doc.font("Helvetica-Bold")
                .text(qtyText, margin, doc.y, { width: 20, continued: true });

            doc.font("Helvetica")
                .text(` ${productName}`, { width: contentWidth - 20 });

            // Precio unitario e importe
            const unitPrice = item.unitPrice / 100;
            const subtotal = item.subtotal / 100;

            const priceText = `    ${formatCurrency(unitPrice)} c/u`;
            const subtotalText = formatCurrency(subtotal);

            doc.fontSize(8)
                .text(priceText, margin, doc.y, { width: contentWidth * 0.65, continued: true })
                .font("Helvetica-Bold")
                .text(subtotalText, { width: contentWidth * 0.35, align: "right" });

            doc.moveDown(0.3);
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
            .fontSize(10)
            .text("¡GRACIAS POR SU COMPRA!", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        doc.moveDown(0.5);

        // Políticas
        doc.font("Helvetica")
            .fontSize(7)
            .text("Políticas de devolución:", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        doc.fontSize(7)
            .text("- Devoluciones dentro de 24 horas", margin, doc.y + 2, {
                width: contentWidth,
                align: "center"
            });

        doc.text("- Presentar este ticket", margin, doc.y + 2, {
            width: contentWidth,
            align: "center"
        });

        // Estado de la venta (si está cancelada)
        if (sale.status === 'CANCELLED') {
            doc.moveDown(0.5);
            doc.font("Helvetica-Bold")
                .fontSize(10)
                .text("*** VENTA CANCELADA ***", margin, doc.y, {
                    width: contentWidth,
                    align: "center"
                });
        }

        doc.moveDown(0.5);

        // Información adicional
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
     * Formatea una fecha en formato DD/MM/YYYY
     */
    private formatDate(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Formatea una hora en formato HH:MM AM/PM
     */
    private formatTime(date: Date): string {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    }
}

