import PDFDocument from 'pdfkit';
import { Sale, SaleItem } from '../../core/entities/sale.entity.js';
import { Branch } from '../../core/entities/branch.entity.js';

// Constantes de formato de moneda nicaragüense
const baseCurrencyFormatter = new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatCurrency = (value: number) => baseCurrencyFormatter.format(value);

/**
 * Servicio para generar tickets PDF térmicos (80mm)
 */
export class PdfService {
    /**
     * Genera un ticket de venta en formato térmico 80mm
     * @param sale Venta a imprimir
     * @param branch Sucursal donde se realizó la venta
     * @returns Buffer con el PDF generado
     */
    async generateTicket(sale: Sale, branch: Branch): Promise<Buffer> {
        // Calcular totales (convertir de centavos a córdobas)
        const subtotal = sale.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) / 100;
        const total = sale.total / 100;
        const discount = sale.discount / 100;

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
                this.drawTicketMeta(doc, sale);
                this.drawTicketItems(doc, sale.items);
                this.drawTicketTotals(doc, subtotal, discount, total);
                this.drawTicketFooter(doc);

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

        // Nombre de la empresa (centrado, negrita)
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .text(branch.name.toUpperCase(), margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        // Dirección
        doc.font("Helvetica")
            .fontSize(8)
            .text(branch.address, margin, doc.y + 2, {
                width: contentWidth,
                align: "center"
            });

        // Teléfono
        doc.text(`Tel: ${branch.phone}`, margin, doc.y + 2, {
            width: contentWidth,
            align: "center"
        });

        // Línea separadora punteada
        doc.moveDown(0.5);
        this.drawDottedLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja la metadata del ticket (fecha, folio, cliente)
     */
    private drawTicketMeta(doc: PDFKit.PDFDocument, sale: Sale): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        doc.font("Helvetica")
            .fontSize(8);

        // Folio
        const folio = sale.id.substring(0, 8).toUpperCase();
        doc.text(`Folio: ${folio}`, margin, doc.y, { width: contentWidth });

        // Fecha y hora
        const saleDate = new Date(sale.createdAt);
        const dateStr = this.formatDate(saleDate);
        const timeStr = this.formatTime(saleDate);
        doc.text(`Fecha: ${dateStr} ${timeStr}`, margin, doc.y, { width: contentWidth });

        // Cliente
        const customerName = sale.customerId || "Público General";
        doc.text(`Cliente: ${customerName}`, margin, doc.y, { width: contentWidth });

        // Tipo de venta
        const saleType = sale.type === 'CASH' ? 'Contado' : 'Crédito';
        doc.text(`Tipo: ${saleType}`, margin, doc.y, { width: contentWidth });

        // Línea separadora punteada
        doc.moveDown(0.5);
        this.drawDottedLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja los items del ticket
     */
    private drawTicketItems(doc: PDFKit.PDFDocument, items: SaleItem[]): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        doc.font("Helvetica-Bold")
            .fontSize(8)
            .text("DESCRIPCIÓN", margin, doc.y, { width: contentWidth });

        doc.moveDown(0.3);

        // Iterar sobre los items
        for (const item of items) {
            doc.font("Helvetica").fontSize(8);

            // Nombre del producto
            const productName = item.productName.length > 28
                ? item.productName.substring(0, 25) + "..."
                : item.productName;

            doc.text(productName, margin, doc.y, { width: contentWidth });

            // Línea de detalle: cantidad x precio = subtotal
            const unitPrice = item.unitPrice / 100;
            const subtotal = item.subtotal / 100;
            const detailLine = `  ${item.quantity} x ${formatCurrency(unitPrice)}`;
            const subtotalStr = formatCurrency(subtotal);

            // Calcular posición para alinear el subtotal a la derecha
            const detailWidth = doc.widthOfString(detailLine);
            const subtotalWidth = doc.widthOfString(subtotalStr);
            const spacingWidth = contentWidth - detailWidth - subtotalWidth;

            doc.text(detailLine, margin, doc.y, { continued: true, width: detailWidth + spacingWidth });
            doc.text(subtotalStr, { align: "right" });

            doc.moveDown(0.2);
        }

        // Línea separadora punteada
        doc.moveDown(0.3);
        this.drawDottedLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja los totales del ticket
     */
    private drawTicketTotals(doc: PDFKit.PDFDocument, subtotal: number, discount: number, total: number): void {
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

        // Total (destacado)
        doc.font("Helvetica-Bold").fontSize(11);
        this.drawTotalLine(doc, "TOTAL:", formatCurrency(total), margin, contentWidth);

        doc.moveDown(0.5);
        this.drawDottedLine(doc);
        doc.moveDown(0.5);
    }

    /**
     * Dibuja el pie del ticket
     */
    private drawTicketFooter(doc: PDFKit.PDFDocument): void {
        const margin = 10;
        const pageWidth = 226;
        const contentWidth = pageWidth - 2 * margin;

        doc.font("Helvetica")
            .fontSize(8)
            .text("¡Gracias por su compra!", margin, doc.y, {
                width: contentWidth,
                align: "center"
            });

        doc.fontSize(7)
            .text("No se aceptan devoluciones después de 24 horas", margin, doc.y + 2, {
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
     * Dibuja una línea de total con label y valor alineado a la derecha
     */
    private drawTotalLine(doc: PDFKit.PDFDocument, label: string, value: string, margin: number, contentWidth: number): void {
        const labelWidth = doc.widthOfString(label);
        const valueWidth = doc.widthOfString(value);
        const spacingWidth = contentWidth - labelWidth - valueWidth;

        doc.text(label, margin, doc.y, { continued: true, width: labelWidth + spacingWidth });
        doc.text(value, { align: "right" });
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
