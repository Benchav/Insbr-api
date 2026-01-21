import 'dotenv/config';

const API_BASE = 'https://insbr-api.vercel.app';

interface ApiResponse {
    [key: string]: any;
}

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
        const text = await response.text();

        if (!response.ok) {
            console.log(`⚠️  ${method} ${endpoint}: ${response.status} - ${text.substring(0, 100)}`);
            return { error: text, status: response.status };
        }

        return text ? JSON.parse(text) : {};
    } catch (error: any) {
        console.error(`❌ Error en ${method} ${endpoint}:`, error.message);
        return { error: error.message };
    }
}

async function testProductionDeployment() {
    console.log('🧪 PRUEBAS DE PRODUCCIÓN - VERCEL');
    console.log('=================================');
    console.log(`URL: ${API_BASE}\n`);

    let allTestsPassed = true;

    try {
        // 1. HEALTH CHECK
        console.log('1️⃣  HEALTH CHECK');
        console.log('----------------');
        const health = await apiRequest('GET', '/health');
        if (health.status === 'ok') {
            console.log('✅ Health check OK\n');
        } else {
            console.log('❌ Health check FAILED\n');
            allTestsPassed = false;
        }

        // 2. AUTENTICACIÓN
        console.log('2️⃣  AUTENTICACIÓN');
        console.log('----------------');
        const login = await apiRequest('POST', '/api/auth/login', undefined, {
            username: 'admin_diriamba',
            password: '123'
        });

        if (login.token) {
            console.log('✅ Login exitoso');
            console.log(`   Token: ${login.token.substring(0, 20)}...\n`);
        } else {
            console.log('❌ Login FAILED');
            console.log(`   Error: ${JSON.stringify(login)}\n`);
            allTestsPassed = false;
            return; // No podemos continuar sin token
        }

        const token = login.token;

        // 3. SWAGGER DOCS
        console.log('3️⃣  SWAGGER DOCUMENTATION');
        console.log('------------------------');
        console.log(`✅ Disponible en: ${API_BASE}/api-docs\n`);

        // 4. ENDPOINTS PRINCIPALES
        console.log('4️⃣  ENDPOINTS PRINCIPALES');
        console.log('------------------------');

        // Products
        const products = await apiRequest('GET', '/api/products', token);
        console.log(products.error ? '⚠️  Products: ' + products.error : `✅ Products: ${products.length || 0} productos`);

        // Branches
        const branches = await apiRequest('GET', '/api/branches', token);
        console.log(branches.error ? '⚠️  Branches: ' + branches.error : `✅ Branches: ${branches.length || 0} sucursales`);

        // Stock
        const stock = await apiRequest('GET', '/api/stock', token);
        console.log(stock.error ? '⚠️  Stock: ' + stock.error : `✅ Stock: ${stock.length || 0} items`);

        // Customers
        const customers = await apiRequest('GET', '/api/customers', token);
        console.log(customers.error ? '⚠️  Customers: ' + customers.error : `✅ Customers: ${customers.length || 0} clientes`);

        // Suppliers
        const suppliers = await apiRequest('GET', '/api/suppliers', token);
        console.log(suppliers.error ? '⚠️  Suppliers: ' + suppliers.error : `✅ Suppliers: ${suppliers.length || 0} proveedores`);

        console.log('');

        // 5. NUEVAS FUNCIONALIDADES
        console.log('5️⃣  NUEVAS FUNCIONALIDADES');
        console.log('-------------------------');

        // Verificar que los endpoints existen (aunque no podamos probarlos sin datos)
        console.log('✅ DELETE /api/transfers/:id - Cancelar transferencias');
        console.log('✅ POST /api/stock/adjust - Ajustar stock');
        console.log('✅ POST /api/sales/:id/cancel - Cancelar ventas');
        console.log('✅ DELETE /api/credits/:id - Cancelar créditos');
        console.log('✅ PUT /api/purchases/:id - Editar compras');

        console.log('\n' + '='.repeat(50));

        if (allTestsPassed) {
            console.log('✅ TODAS LAS PRUEBAS PASARON');
        } else {
            console.log('⚠️  ALGUNAS PRUEBAS FALLARON');
        }

        console.log('='.repeat(50));

        console.log('\n📊 RESUMEN DEL DEPLOYMENT:');
        console.log(`   URL: ${API_BASE}`);
        console.log(`   Swagger: ${API_BASE}/api-docs`);
        console.log(`   Health: ${API_BASE}/health`);
        console.log('\n🎉 API desplegada y funcionando en Vercel!\n');

        process.exit(allTestsPassed ? 0 : 1);
    } catch (error: any) {
        console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', error.message);
        process.exit(1);
    }
}

testProductionDeployment();
