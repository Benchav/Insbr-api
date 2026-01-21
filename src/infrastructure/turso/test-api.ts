import 'dotenv/config';

const API_BASE = 'http://localhost:3000';

interface ApiResponse {
    [key: string]: any;
}

// Helper function para hacer requests
async function apiRequest(
    method: string,
    endpoint: string,
    token?: string,
    body?: any
): Promise<ApiResponse> {
    const headers: any = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options: any = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`${method} ${endpoint} failed: ${response.status} - ${error}`);
        }

        return response.json();
    } catch (error: any) {
        console.error(`❌ Error en ${method} ${endpoint}:`, error.message);
        throw error;
    }
}

async function runTests() {
    console.log('🧪 INICIANDO PRUEBAS COMPLETAS DE API');
    console.log('======================================\n');

    try {
        // 1. AUTENTICACIÓN
        console.log('🔐 1. AUTENTICACIÓN');
        console.log('-------------------');

        const adminLogin = await apiRequest('POST', '/api/auth/login', undefined, {
            username: 'admin_diriamba',
            password: '123'
        });
        const adminToken = adminLogin.token;
        console.log(`✅ Login Admin: ${adminLogin.user.name}`);

        const sellerLogin = await apiRequest('POST', '/api/auth/login', undefined, {
            username: 'cajero_diriamba',
            password: '123'
        });
        const sellerToken = sellerLogin.token;
        console.log(`✅ Login Seller: ${sellerLogin.user.name}\n`);

        // 2. PRODUCTOS
        console.log('📦 2. PRODUCTOS');
        console.log('---------------');

        let products = await apiRequest('GET', '/api/products', adminToken);
        console.log(`✅ Productos existentes: ${products.length}`);

        const newProduct = await apiRequest('POST', '/api/products', adminToken, {
            name: 'Levadura Instantánea Premium',
            description: 'Levadura de alta calidad para panadería profesional',
            sku: `LEV-PREM-${Date.now()}`,
            category: 'Levaduras',
            costPrice: 5500,
            retailPrice: 7500,
            wholesalePrice: 6500,
            unit: 'kg',
            isActive: true
        });
        console.log(`✅ Producto creado: ${newProduct.name} - SKU: ${newProduct.sku}`);

        products = await apiRequest('GET', '/api/products', adminToken);
        console.log(`✅ Total productos: ${products.length}\n`);

        // 3. CLIENTES
        console.log('👥 3. CLIENTES');
        console.log('--------------');

        const customer1 = await apiRequest('POST', '/api/customers', adminToken, {
            name: 'Panadería El Buen Pan',
            phone: '88888888',
            address: 'Barrio San Juan, Diriamba',
            type: 'RETAIL',
            creditLimit: 500000
        });
        console.log(`✅ Cliente retail: ${customer1.name}`);

        const customer2 = await apiRequest('POST', '/api/customers', sellerToken, {
            name: 'Distribuidora La Económica',
            contactName: 'Juan Pérez',
            phone: '77777777',
            email: 'economica@example.com',
            address: 'Km 42 Carretera Sur, Managua',
            taxId: 'J0310000012345',
            type: 'WHOLESALE',
            creditLimit: 2000000
        });
        console.log(`✅ Cliente mayorista: ${customer2.name}`);

        const customers = await apiRequest('GET', '/api/customers', adminToken);
        console.log(`✅ Total clientes: ${customers.length}\n`);

        // 4. PROVEEDORES
        console.log('🏭 4. PROVEEDORES');
        console.log('-----------------');

        const supplier1 = await apiRequest('POST', '/api/suppliers', adminToken, {
            name: 'Molinos de Nicaragua S.A.',
            contactName: 'María González',
            phone: '22223333',
            email: 'ventas@molinos.com.ni',
            address: 'Zona Industrial, Managua',
            taxId: 'J0310000098765',
            creditDays: 30,
            creditLimit: 5000000
        });
        console.log(`✅ Proveedor: ${supplier1.name} - Crédito: ${supplier1.creditDays} días`);

        const suppliers = await apiRequest('GET', '/api/suppliers', adminToken);
        console.log(`✅ Total proveedores: ${suppliers.length}\n`);

        // 5. STOCK
        console.log('📊 5. STOCK');
        console.log('-----------');

        const stock = await apiRequest('GET', '/api/stock', adminToken);
        console.log(`✅ Registros de stock: ${stock.length}`);

        if (stock.length > 0) {
            const stockAlerts = await apiRequest('GET', '/api/stock/alerts', adminToken);
            console.log(`✅ Alertas de stock bajo: ${stockAlerts.length}\n`);
        }

        // 6. VENTAS
        console.log('💰 6. VENTAS');
        console.log('------------');

        // Venta al contado
        const sale1 = await apiRequest('POST', '/api/sales', sellerToken, {
            items: [
                {
                    productId: products[0].id,
                    productName: products[0].name,
                    quantity: 5,
                    unitPrice: products[0].retailPrice,
                    subtotal: 5 * products[0].retailPrice
                },
                {
                    productId: products[1].id,
                    productName: products[1].name,
                    quantity: 3,
                    unitPrice: products[1].retailPrice,
                    subtotal: 3 * products[1].retailPrice
                }
            ],
            subtotal: (5 * products[0].retailPrice) + (3 * products[1].retailPrice),
            tax: 0,
            discount: 0,
            total: (5 * products[0].retailPrice) + (3 * products[1].retailPrice),
            type: 'CASH',
            paymentMethod: 'CASH'
        });
        console.log(`✅ Venta al contado: ${sale1.id} - Total: C$${(sale1.total / 100).toFixed(2)}`);

        // Venta a crédito
        const sale2 = await apiRequest('POST', '/api/sales', sellerToken, {
            customerId: customer2.id,
            items: [
                {
                    productId: products[0].id,
                    productName: products[0].name,
                    quantity: 20,
                    unitPrice: products[0].wholesalePrice,
                    subtotal: 20 * products[0].wholesalePrice
                }
            ],
            subtotal: 20 * products[0].wholesalePrice,
            tax: 0,
            discount: 0,
            total: 20 * products[0].wholesalePrice,
            type: 'CREDIT'
        });
        console.log(`✅ Venta a crédito: ${sale2.id} - Total: C$${(sale2.total / 100).toFixed(2)}`);

        const sales = await apiRequest('GET', '/api/sales', sellerToken);
        console.log(`✅ Total ventas: ${sales.length}\n`);

        // 7. COMPRAS
        console.log('🛒 7. COMPRAS');
        console.log('-------------');

        const purchase1 = await apiRequest('POST', '/api/purchases', adminToken, {
            supplierId: supplier1.id,
            items: [
                {
                    productId: products[0].id,
                    productName: products[0].name,
                    quantity: 100,
                    unitCost: products[0].costPrice,
                    subtotal: 100 * products[0].costPrice
                },
                {
                    productId: newProduct.id,
                    productName: newProduct.name,
                    quantity: 50,
                    unitCost: newProduct.costPrice,
                    subtotal: 50 * newProduct.costPrice
                }
            ],
            subtotal: (100 * products[0].costPrice) + (50 * newProduct.costPrice),
            tax: 0,
            discount: 0,
            total: (100 * products[0].costPrice) + (50 * newProduct.costPrice),
            type: 'CREDIT',
            invoiceNumber: 'FAC-001-2026'
        });
        console.log(`✅ Compra a crédito: ${purchase1.id} - Total: C$${(purchase1.total / 100).toFixed(2)}`);

        const purchases = await apiRequest('GET', '/api/purchases', adminToken);
        console.log(`✅ Total compras: ${purchases.length}\n`);

        // 8. CRÉDITOS
        console.log('💳 8. CRÉDITOS');
        console.log('--------------');

        const credits = await apiRequest('GET', '/api/credits/accounts', adminToken);
        console.log(`✅ Cuentas de crédito: ${credits.length}`);

        if (credits.length > 0) {
            const payment = await apiRequest('POST', `/api/credits/accounts/${credits[0].id}/payments`, adminToken, {
                amount: 50000,
                paymentMethod: 'CASH',
                notes: 'Abono a cuenta'
            });
            console.log(`✅ Pago registrado: C$${(payment.amount / 100).toFixed(2)}`);

            const payments = await apiRequest('GET', `/api/credits/accounts/${credits[0].id}/payments`, adminToken);
            console.log(`✅ Pagos de la cuenta: ${payments.length}\n`);
        }

        // 9. TRANSFERENCIAS
        console.log('🔄 9. TRANSFERENCIAS');
        console.log('--------------------');

        const transfer1 = await apiRequest('POST', '/api/transfers', adminToken, {
            toBranchId: 'BRANCH-JIN-001',
            items: [
                {
                    productId: products[0].id,
                    productName: products[0].name,
                    quantity: 10
                }
            ],
            notes: 'Transferencia de prueba a Jinotepe'
        });
        console.log(`✅ Transferencia creada: ${transfer1.id}`);

        const transfers = await apiRequest('GET', '/api/transfers', adminToken);
        console.log(`✅ Total transferencias: ${transfers.length}\n`);

        // 10. CAJA
        console.log('💵 10. CAJA');
        console.log('-----------');

        const balance = await apiRequest('GET', '/api/cash/balance', adminToken);
        console.log('✅ Balance del día:');
        console.log(`   Ingresos: C$${(balance.income / 100).toFixed(2)}`);
        console.log(`   Egresos: C$${(balance.expenses / 100).toFixed(2)}`);
        console.log(`   Balance neto: C$${(balance.netBalance / 100).toFixed(2)}`);

        const dailyRevenue = await apiRequest('GET', '/api/cash/daily-revenue', adminToken);
        console.log(`✅ Ingreso total del día: C$${(dailyRevenue.income / 100).toFixed(2)}\n`);

        // RESUMEN FINAL
        console.log('\n' + '='.repeat(50));
        console.log('✅ PRUEBAS COMPLETADAS EXITOSAMENTE');
        console.log('='.repeat(50));

        console.log('\n📊 RESUMEN DE DATOS CREADOS:');
        console.log(`   • Productos: ${products.length}`);
        console.log(`   • Clientes: ${customers.length}`);
        console.log(`   • Proveedores: ${suppliers.length}`);
        console.log(`   • Ventas: ${sales.length}`);
        console.log(`   • Compras: ${purchases.length}`);
        console.log(`   • Créditos: ${credits.length}`);
        console.log(`   • Transferencias: ${transfers.length}`);
        console.log(`   • Stock: ${stock.length} registros`);

        console.log('\n🎉 Todos los endpoints funcionando correctamente con Turso!');
        console.log('🌐 Swagger UI: http://localhost:3000/api-docs\n');

    } catch (error: any) {
        console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', error.message);
        process.exit(1);
    }
}

// Ejecutar pruebas
runTests()
    .then(() => {
        console.log('✅ Script de pruebas finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
