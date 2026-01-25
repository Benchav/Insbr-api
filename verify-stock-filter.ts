import 'dotenv/config';
import { CategoryRepositoryTurso } from './src/infrastructure/turso/repositories/category.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { StockRepositoryTurso } from './src/infrastructure/turso/repositories/stock.repository.turso.js';
import { BranchRepositoryTurso } from './src/infrastructure/turso/repositories/branch.repository.turso.js';
import { CategoryService } from './src/application/services/category.service.js';
import { StockService } from './src/application/services/stock.service.js';
import { Branch } from './src/core/entities/branch.entity.js';

const categoryRepo = new CategoryRepositoryTurso();
const productRepo = new ProductRepositoryTurso();
const stockRepo = new StockRepositoryTurso();
const branchRepo = new BranchRepositoryTurso(); // Add Branch Repo
const categoryService = new CategoryService(categoryRepo);
const stockService = new StockService(stockRepo, productRepo);


async function run() {
    console.log('--- Verificando Filtrado de Inventario por Categoría ---');

    // 1. Crear Categorías
    console.log('1. Creando Categorías A y B...');
    const catA = await categoryService.createCategory({ name: 'Cat A - ' + Date.now(), description: 'A', isActive: true });
    const catB = await categoryService.createCategory({ name: 'Cat B - ' + Date.now(), description: 'B', isActive: true });

    // 2. Crear Productos en esas categorías
    console.log('2. Creando Productos...');
    const prodA = await productRepo.create({
        name: 'Prod A', description: 'Desc A', sku: 'SKU-A-' + Date.now(),
        category: 'Legacy', categoryId: catA.id,
        costPrice: 100, retailPrice: 200, wholesalePrice: 150, unit: 'u', isActive: true
    });
    const prodB = await productRepo.create({
        name: 'Prod B', description: 'Desc B', sku: 'SKU-B-' + Date.now(),
        category: 'Legacy', categoryId: catB.id,
        costPrice: 100, retailPrice: 200, wholesalePrice: 150, unit: 'u', isActive: true
    });

    // 3. Crear Branch y Stock
    let branchId = '';
    const branchCode = `TF-${Date.now().toString().substring(8)}`; // Unique code

    console.log(`3. Creando sucursal de prueba...`);
    const newBranch = await branchRepo.create({
        name: 'Sucursal Test Filter',
        address: 'Calle Falsa 123',
        phone: '555-5555',
        code: branchCode,
        isActive: true
    });
    branchId = newBranch.id;
    console.log(`   -> Sucursal creada con ID: ${branchId}`);

    console.log(`   Añadiendo Stock en sucursal ${branchId}...`);
    await stockRepo.create({ productId: prodA.id, branchId, quantity: 10, minStock: 5, maxStock: 100 });
    await stockRepo.create({ productId: prodB.id, branchId, quantity: 20, minStock: 5, maxStock: 100 });

    // 4. Test sin filtro
    console.log('4. Probando sin filtro...');
    const allStock = await stockService.getStockByBranch(branchId);
    console.log(`   -> Total: ${allStock.length} (Esperado: >= 2)`);

    // 5. Test filtro Cat A
    console.log('5. Probando filtro Categoría A...');
    const stockA = await stockService.getStockByBranch(branchId, catA.id);
    console.log(`   -> Total Cat A: ${stockA.length}`);
    const foundA = stockA.find(s => s.productId === prodA.id);
    const foundInA_B = stockA.find(s => s.productId === prodB.id);

    if (stockA.length === 1 && foundA && !foundInA_B) {
        console.log('✅ Filtro A funciona correctamente (solo trajo productos de A)');
    } else {
        console.error('❌ Falló filtro A');
        console.log('Items encontrados:', stockA.map(s => s.product.name));
    }

    // 6. Test filtro Cat B
    console.log('6. Probando filtro Categoría B...');
    const stockB = await stockService.getStockByBranch(branchId, catB.id);
    console.log(`   -> Total Cat B: ${stockB.length}`);
    if (stockB.length === 1 && stockB[0].productId === prodB.id) {
        console.log('✅ Filtro B funciona correctamente');
    } else {
        console.error('❌ Falló filtro B');
    }

    // 7. Verificar nombres dinámicos
    console.log('7. Verificando nombres dinámicos...');
    // Cambiar nombre categoría A
    await categoryRepo.update(catA.id, { name: 'Cat A MODIFIED' });
    const stockAMod = await stockService.getStockByBranch(branchId, catA.id);
    console.log('   -> Nombre en Stock:', stockAMod[0].product.category);

    if (stockAMod[0].product.category === 'Cat A MODIFIED') {
        console.log('✅ El nombre de la categoría se actualizó dinámicamente en el inventario');
    } else {
        console.error('❌ El nombre no se actualizó. Recibido:', stockAMod[0].product.category);
    }
}

run().catch(console.error);
