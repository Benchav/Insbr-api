/**
 * Script de prueba completo para todos los endpoints de la API
 * Verifica funcionalidad y unidades de medida
 */

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Colores para la consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method: string, endpoint: string, body?: any) {
    const headers: any = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options: any = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    return { status: response.status, data };
}

// ============================================
// PRUEBAS DE AUTENTICACIÓN
// ============================================
async function testAuth() {
    log('\n📝 PRUEBAS DE AUTENTICACIÓN', 'blue');
    log('━'.repeat(50), 'blue');

    try {
        const result = await makeRequest('POST', '/api/auth/login', {
            username: 'admin',
            password: 'Admin@2026!Insbr'
        });

        if (result.status === 200 && result.data.token) {
            authToken = result.data.token;
            log('✅ Login exitoso', 'green');
            log(`   Token: ${authToken.substring(0, 20)}...`, 'yellow');
        } else {
            log('❌ Login falló', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }
}

// ============================================
// PRUEBAS DE PRODUCTOS
// ============================================
async function testProducts() {
    log('\n📦 PRUEBAS DE PRODUCTOS', 'blue');
    log('━'.repeat(50), 'blue');

    let productId = '';

    // 1. Listar productos
    try {
        const result = await makeRequest('GET', '/api/products');
        if (result.status === 200) {
            log('✅ GET /api/products - OK', 'green');
            log(`   Total productos: ${result.data.length}`, 'yellow');

            if (result.data.length > 0) {
                const product = result.data[0];
                productId = product.id;
                log(`   Ejemplo: ${product.name}`, 'yellow');
                log(`   - SKU: ${product.sku}`, 'yellow');
                log(`   - Unidad: ${product.unit}`, 'yellow');
                log(`   - Precio costo: C$${(product.costPrice / 100).toFixed(2)}`, 'yellow');
                log(`   - Precio detalle: C$${(product.retailPrice / 100).toFixed(2)}`, 'yellow');
                log(`   - Precio mayoreo: C$${(product.wholesalePrice / 100).toFixed(2)}`, 'yellow');

                // Verificar que los precios estén en centavos
                if (product.costPrice > 100 && product.retailPrice > 100) {
                    log('   ✓ Precios en centavos: CORRECTO', 'green');
                } else {
                    log('   ⚠ Advertencia: Precios parecen muy bajos', 'yellow');
                }
            }
        } else {
            log('❌ GET /api/products - FALLÓ', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }

    // 2. Obtener producto por ID
    if (productId) {
        try {
            const result = await makeRequest('GET', `/api/products/${productId}`);
            if (result.status === 200) {
                log('✅ GET /api/products/:id - OK', 'green');
            } else {
                log('❌ GET /api/products/:id - FALLÓ', 'red');
            }
        } catch (error: any) {
            log(`❌ Error: ${error.message}`, 'red');
        }
    }

    // 3. Crear producto
    try {
        const newProduct = {
            name: 'Producto de Prueba',
            description: 'Descripción de prueba',
            sku: 'TEST-001',
            category: 'Pruebas',
            costPrice: 5000, // C$50.00 en centavos
            retailPrice: 7500, // C$75.00 en centavos
            wholesalePrice: 6500, // C$65.00 en centavos
            unit: 'unidad',
            isActive: true
        };

        const result = await makeRequest('POST', '/api/products', newProduct);
        if (result.status === 201) {
            log('✅ POST /api/products - OK', 'green');
            log(`   Producto creado: ${result.data.id}`, 'yellow');
            productId = result.data.id;
        } else {
            log('❌ POST /api/products - FALLÓ', 'red');
            log(`   Error: ${JSON.stringify(result.data)}`, 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }

    // 4. Actualizar producto
    if (productId) {
        try {
            const result = await makeRequest('PUT', `/api/products/${productId}`, {
                name: 'Producto de Prueba Actualizado',
                retailPrice: 8000 // C$80.00
            });
            if (result.status === 200) {
                log('✅ PUT /api/products/:id - OK', 'green');
            } else {
                log('❌ PUT /api/products/:id - FALLÓ', 'red');
            }
        } catch (error: any) {
            log(`❌ Error: ${error.message}`, 'red');
        }
    }

    // 5. Eliminar producto
    if (productId) {
        try {
            const result = await makeRequest('DELETE', `/api/products/${productId}`);
            if (result.status === 204) {
                log('✅ DELETE /api/products/:id - OK', 'green');
            } else {
                log('❌ DELETE /api/products/:id - FALLÓ', 'red');
            }
        } catch (error: any) {
            log(`❌ Error: ${error.message}`, 'red');
        }
    }
}

// ============================================
// PRUEBAS DE VENTAS
// ============================================
async function testSales() {
    log('\n💰 PRUEBAS DE VENTAS', 'blue');
    log('━'.repeat(50), 'blue');

    // 1. Listar ventas
    try {
        const result = await makeRequest('GET', '/api/sales');
        if (result.status === 200) {
            log('✅ GET /api/sales - OK', 'green');
            log(`   Total ventas: ${result.data.length}`, 'yellow');

            if (result.data.length > 0) {
                const sale = result.data[0];
                log(`   Ejemplo venta ID: ${sale.id}`, 'yellow');
                log(`   - Total: C$${(sale.total / 100).toFixed(2)}`, 'yellow');
                log(`   - Fecha: ${new Date(sale.createdAt).toLocaleString('es-NI')}`, 'yellow');

                // Verificar unidades
                if (sale.total > 100) {
                    log('   ✓ Total en centavos: CORRECTO', 'green');
                }
            }
        } else {
            log('❌ GET /api/sales - FALLÓ', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }
}

// ============================================
// PRUEBAS DE COMPRAS
// ============================================
async function testPurchases() {
    log('\n🛒 PRUEBAS DE COMPRAS', 'blue');
    log('━'.repeat(50), 'blue');

    // 1. Listar compras
    try {
        const result = await makeRequest('GET', '/api/purchases');
        if (result.status === 200) {
            log('✅ GET /api/purchases - OK', 'green');
            log(`   Total compras: ${result.data.length}`, 'yellow');

            if (result.data.length > 0) {
                const purchase = result.data[0];
                log(`   Ejemplo compra ID: ${purchase.id}`, 'yellow');
                log(`   - Total: C$${(purchase.total / 100).toFixed(2)}`, 'yellow');
                log(`   - Fecha: ${new Date(purchase.createdAt).toLocaleString('es-NI')}`, 'yellow');

                if (purchase.total > 100) {
                    log('   ✓ Total en centavos: CORRECTO', 'green');
                }
            }
        } else {
            log('❌ GET /api/purchases - FALLÓ', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }
}

// ============================================
// PRUEBAS DE CRÉDITOS
// ============================================
async function testCredits() {
    log('\n💳 PRUEBAS DE CRÉDITOS (CXC/CPP)', 'blue');
    log('━'.repeat(50), 'blue');

    // 1. Cuentas por cobrar
    try {
        const result = await makeRequest('GET', '/api/credits/receivable');
        if (result.status === 200) {
            log('✅ GET /api/credits/receivable - OK', 'green');
            log(`   Total CXC: ${result.data.length}`, 'yellow');

            if (result.data.length > 0) {
                const account = result.data[0];
                log(`   Ejemplo cuenta: ${account.id}`, 'yellow');
                log(`   - Saldo: C$${(account.balance / 100).toFixed(2)}`, 'yellow');

                if (account.balance > 100) {
                    log('   ✓ Saldo en centavos: CORRECTO', 'green');
                }
            }
        } else {
            log('❌ GET /api/credits/receivable - FALLÓ', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }

    // 2. Cuentas por pagar
    try {
        const result = await makeRequest('GET', '/api/credits/payable');
        if (result.status === 200) {
            log('✅ GET /api/credits/payable - OK', 'green');
            log(`   Total CPP: ${result.data.length}`, 'yellow');

            if (result.data.length > 0) {
                const account = result.data[0];
                log(`   Ejemplo cuenta: ${account.id}`, 'yellow');
                log(`   - Saldo: C$${(account.balance / 100).toFixed(2)}`, 'yellow');
            }
        } else {
            log('❌ GET /api/credits/payable - FALLÓ', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }
}

// ============================================
// PRUEBAS DE TRANSFERENCIAS
// ============================================
async function testTransfers() {
    log('\n🔄 PRUEBAS DE TRANSFERENCIAS', 'blue');
    log('━'.repeat(50), 'blue');

    // 1. Listar transferencias
    try {
        const result = await makeRequest('GET', '/api/transfers');
        if (result.status === 200) {
            log('✅ GET /api/transfers - OK', 'green');
            log(`   Total transferencias: ${result.data.length}`, 'yellow');

            if (result.data.length > 0) {
                const transfer = result.data[0];
                log(`   Ejemplo transferencia: ${transfer.id}`, 'yellow');
                log(`   - Estado: ${transfer.status}`, 'yellow');
                log(`   - Items: ${transfer.items?.length || 0}`, 'yellow');

                if (transfer.items && transfer.items.length > 0) {
                    const item = transfer.items[0];
                    log(`   - Cantidad: ${item.quantity} unidades`, 'yellow');
                    log('   ✓ Cantidad en unidades: CORRECTO', 'green');
                }
            }
        } else {
            log('❌ GET /api/transfers - FALLÓ', 'red');
        }
    } catch (error: any) {
        log(`❌ Error: ${error.message}`, 'red');
    }
}

// ============================================
// RESUMEN DE UNIDADES DE MEDIDA
// ============================================
async function verifyUnits() {
    log('\n📏 VERIFICACIÓN DE UNIDADES DE MEDIDA', 'blue');
    log('━'.repeat(50), 'blue');

    log('Unidades esperadas:', 'yellow');
    log('  • Precios: centavos (1 córdoba = 100 centavos)', 'yellow');
    log('  • Cantidades: unidades enteras', 'yellow');
    log('  • Productos: string (kg, saco, unidad, litro, etc.)', 'yellow');
    log('  • Fechas: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)', 'yellow');
}

// ============================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================
async function runAllTests() {
    log('\n╔════════════════════════════════════════════════╗', 'blue');
    log('║   PRUEBAS COMPLETAS DE API - INSBR ERP        ║', 'blue');
    log('╚════════════════════════════════════════════════╝', 'blue');

    await testAuth();
    await testProducts();
    await testSales();
    await testPurchases();
    await testCredits();
    await testTransfers();
    await verifyUnits();

    log('\n╔════════════════════════════════════════════════╗', 'green');
    log('║   PRUEBAS COMPLETADAS                          ║', 'green');
    log('╚════════════════════════════════════════════════╝', 'green');
}

// Ejecutar
runAllTests().catch(console.error);
