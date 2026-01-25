import 'dotenv/config';
import { CategoryRepositoryTurso } from './src/infrastructure/turso/repositories/category.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { StockRepositoryTurso } from './src/infrastructure/turso/repositories/stock.repository.turso.js';
import { BranchRepositoryTurso } from './src/infrastructure/turso/repositories/branch.repository.turso.js';

const categoryRepo = new CategoryRepositoryTurso();
const productRepo = new ProductRepositoryTurso();
const stockRepo = new StockRepositoryTurso();
const branchRepo = new BranchRepositoryTurso();

async function verifyRealData() {
    console.log('🔍 VERIFICANDO RELACIONES CON DATOS REALES (TURSO)...');
    console.log('----------------------------------------------------');

    // 1. Verificar Categorías
    console.log('\n📂 1. Buscando Categorías...');
    const categories = await categoryRepo.findAll();
    console.log(`   -> Total categorías encontradas: ${categories.length}`);
    if (categories.length > 0) {
        console.log(`   -> Ejemplo: ID: ${categories[0].id} | Nombre: ${categories[0].name}`);
    } else {
        console.warn('   ⚠️ No hay categorías. La verificación de relaciones no será completa.');
    }

    // 2. Verificar Productos y su vinculación
    console.log('\n📦 2. Verificando Productos...');
    const products = await productRepo.findAll();
    console.log(`   -> Total productos: ${products.length}`);

    const productsWithCategory = products.filter(p => p.categoryId);
    console.log(`   -> Productos con categoryId asignado: ${productsWithCategory.length}`);

    if (productsWithCategory.length > 0) {
        const prod = productsWithCategory[0];
        console.log(`   -> Ejemplo Producto: [${prod.name}] tiene categoryId: ${prod.categoryId}`);

        // Verificar validez (Integridad Referencial)
        const catExists = categories.find(c => c.id === prod.categoryId);
        if (catExists) {
            console.log(`   ✅ VALIDADO: El categoryId corresponde a la categoría '${catExists.name}'`);
        } else {
            console.error(`   ❌ ERROR: El categoryId ${prod.categoryId} NO existe en la tabla de categorías.`);
        }
    } else {
        console.warn('   ⚠️ Ningún producto tiene categoryId asignado. ¿Se corrió la migración?');
    }

    // 3. Verificar Inventario (Stock) y JOIN
    console.log('\n📊 3. Verificando Inventario (Stock + JOIN Categoría)...');

    // Buscar una sucursal para consultar
    const branches = await branchRepo.findAll();
    if (branches.length === 0) {
        console.warn('   ⚠️ No hay sucursales para verificar stock.');
        return;
    }
    const branchId = branches[0].id;
    console.log(`   -> Usando Sucursal: ${branches[0].name} (${branchId})`);

    // Probar filtro por Categoría (si hay categorias)
    if (categories.length > 0) {
        const testCategory = categories[0];
        console.log(`   -> Probando filtro de stock para categoría: '${testCategory.name}' (${testCategory.id})`);

        const filteredStock = await stockRepo.findByBranch(branchId, testCategory.id);
        console.log(`   -> Resultados devueltos del JOIN: ${filteredStock.length}`);

        // Verificar que realmente sean de esa categoría
        let allCorrect = true;
        for (const item of filteredStock) {
            const prod = products.find(p => p.id === item.productId);
            if (prod && prod.categoryId !== testCategory.id) {
                console.error(`   ❌ ERROR EN FILTRO: Producto ${prod.name} es de categoría ${prod.categoryId}, no ${testCategory.id}`);
                allCorrect = false;
            }
        }

        if (allCorrect && filteredStock.length > 0) {
            console.log('   ✅ FILTRO FUNCIONA: Todos los items devueltos pertenecen a la categoría correcta.');
        } else if (filteredStock.length === 0) {
            console.log('   ℹ️ (La consulta funcionó pero no trajo resultados para esta categoría en esta sucursal)');
        }
    }

    console.log('\n✅ VERIFICACIÓN DE CONEXIÓN Y DATOS TERMINADA');
}

verifyRealData().catch(console.error);
