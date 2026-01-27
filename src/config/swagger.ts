import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ERP Insumos API',
            version: '1.0.0',
            description: 'API profesional para distribución de insumos - Sucursales Diriamba y Jinotepe',
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
                    Transfer: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            fromBranchId: { type: 'string' },
                            toBranchId: { type: 'string' },
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        productId: { type: 'string' },
                                        productName: { type: 'string' },
                                        quantity: { type: 'integer' }
                                    }
                                }
                            },
                            status: { type: 'string', enum: ['REQUESTED', 'PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] },
                            type: { type: 'string', enum: ['SEND', 'REQUEST'] },
                            notes: { type: 'string' },
                            createdBy: { type: 'string' },
                            approvedBy: { type: 'string' },
                            completedBy: { type: 'string' },
                            shippedBy: { type: 'string' },
                            shippedAt: { type: 'string', format: 'date-time' },
                            createdAt: { type: 'string', format: 'date-time' },
                            approvedAt: { type: 'string', format: 'date-time' },
                            completedAt: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                paths: {
                    '/api/transfers': {
                        post: {
                            summary: 'Crear transferencia (SEND o REQUEST)',
                            tags: [ 'Transfers' ],
                            security: [ { bearerAuth: [] } ],
                            requestBody: {
                                required: true,
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            required: [ 'toBranchId', 'items' ],
                                            properties: {
                                                toBranchId: { type: 'string' },
                                                items: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        required: [ 'productId', 'quantity' ],
                                                        properties: {
                                                            productId: { type: 'string' },
                                                            quantity: { type: 'integer' }
                                                        }
                                                    }
                                                },
                                                notes: { type: 'string' },
                                                fromBranchId: { type: 'string' }
                                            },
                                            example: {
                                                toBranchId: 'BRANCH-002',
                                                items: [ { productId: 'PROD-001', quantity: 5 } ],
                                                notes: 'Reposición urgente'
                                            }
                                        }
                                    }
                                }
                            },
                            responses: {
                                201: {
                                    description: 'Transferencia creada',
                                    content: {
                                        'application/json': {
                                            schema: { $ref: '#/components/schemas/Transfer' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '/api/transfers/{id}/accept': {
                        patch: {
                            summary: 'Aceptar solicitud de transferencia (REQUEST)',
                            tags: [ 'Transfers' ],
                            security: [ { bearerAuth: [] } ],
                            parameters: [
                                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
                            ],
                            responses: {
                                200: {
                                    description: 'Transferencia aceptada',
                                    content: {
                                        'application/json': {
                                            schema: { $ref: '#/components/schemas/Transfer' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '/api/transfers/{id}/ship': {
                        patch: {
                            summary: 'Despachar transferencia (descontar stock de origen)',
                            tags: [ 'Transfers' ],
                            security: [ { bearerAuth: [] } ],
                            parameters: [
                                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
                            ],
                            responses: {
                                200: {
                                    description: 'Transferencia despachada',
                                    content: {
                                        'application/json': {
                                            schema: { $ref: '#/components/schemas/Transfer' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '/api/transfers/{id}/receive': {
                        patch: {
                            summary: 'Recibir transferencia (sumar stock en destino)',
                            tags: [ 'Transfers' ],
                            security: [ { bearerAuth: [] } ],
                            parameters: [
                                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
                            ],
                            responses: {
                                200: {
                                    description: 'Transferencia recibida',
                                    content: {
                                        'application/json': {
                                            schema: { $ref: '#/components/schemas/Transfer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        },
        tags: [
            { name: 'Transfers', description: 'Transferencias entre sucursales' },
            { name: 'Cash', description: 'Movimientos de caja' },
            { name: 'Reports', description: 'Reportes PDF y Excel' }
        ]
    },
    apis: ['./src/api/controllers/*.ts'] // Ruta a los controladores con JSDoc
};

export const swaggerSpec = swaggerJsdoc(options);
