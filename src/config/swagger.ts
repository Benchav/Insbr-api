import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ERP Insumos API',
            version: '1.0.0',
            description: 'API profesional para distribución de insumos - Sucursales Diriamba y Jinotepe',
            contact: {
                name: 'Joshua Chávez',
                email: 'support@insbr-api.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT para autenticación'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Mensaje de error'
                        }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        sku: { type: 'string' },
                        category: { type: 'string' },
                        costPrice: { type: 'integer', description: 'Precio de costo en centavos' },
                        retailPrice: { type: 'integer', description: 'Precio al detalle en centavos' },
                        wholesalePrice: { type: 'integer', description: 'Precio al por mayor en centavos' },
                        unit: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Branch: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        code: { type: 'string' },
                        address: { type: 'string' },
                        phone: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Stock: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        productId: { type: 'string', format: 'uuid' },
                        branchId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer' },
                        minStock: { type: 'integer' },
                        maxStock: { type: 'integer' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                CreditAccount: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        type: { type: 'string', enum: ['CPP', 'CXC'] },
                        branchId: { type: 'string', format: 'uuid' },
                        supplierId: { type: 'string', format: 'uuid', nullable: true },
                        customerId: { type: 'string', format: 'uuid', nullable: true },
                        totalAmount: { type: 'integer', description: 'Monto total en centavos' },
                        paidAmount: { type: 'integer', description: 'Monto pagado en centavos' },
                        balanceAmount: { type: 'integer', description: 'Saldo pendiente en centavos' },
                        status: { type: 'string', enum: ['PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO'] },
                        dueDate: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            { name: 'Products', description: 'Gestión de productos (catálogo compartido)' },
            { name: 'Branches', description: 'Gestión de sucursales' },
            { name: 'Stock', description: 'Gestión de inventario por sucursal' },
            { name: 'Sales', description: 'Gestión de ventas' },
            { name: 'Purchases', description: 'Gestión de compras' },
            { name: 'Credit', description: 'Gestión de cuentas por cobrar y pagar' },
            { name: 'Transfers', description: 'Transferencias entre sucursales' },
            { name: 'Cash', description: 'Movimientos de caja' }
        ]
    },
    apis: ['./src/api/controllers/*.ts'] // Ruta a los controladores con JSDoc
};

export const swaggerSpec = swaggerJsdoc(options);
