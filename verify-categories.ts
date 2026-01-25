import 'dotenv/config';
import { CategoryRepositoryTurso } from './src/infrastructure/turso/repositories/category.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { CategoryService } from './src/application/services/category.service.js';


const categoryRepo = new CategoryRepositoryTurso();
const productRepo = new ProductRepositoryTurso();
const categoryService = new CategoryService(categoryRepo);

async function run() {
    console.log('--- Verificando Gestión de Categorías ---');

    // 1. Crear Categoría
    console.log('1. Creando Categoría de Prueba...');
    const newCat = await categoryService.createCategory({
        name: 'Categoría Test ' + Date.now(),
        description: 'Categoría generada automáticamente',
        isActive: true
    });
    console.log('   -> Creada:', newCat.id, newCat.name);

    // 2. Crear Producto asignado a la categoría
    console.log('2. Creando Producto con Categoría ID...');
    const product = await productRepo.create({
        name: 'Producto Test Cat ' + Date.now(),
        description: 'Desc',
        sku: 'SKU-' + Date.now(),
        category: 'Texto Legacy', // Debería ser ignorado o usado si no hay link
        categoryId: newCat.id,
        costPrice: 100,
        retailPrice: 200,
        wholesalePrice: 150,
        unit: 'u',
        isActive: true
    });
    console.log('   -> Producto creado:', product.id);

    // 3. Verificar que al buscar el producto traiga el nombre de la categoría
    console.log('3. Buscando producto para verificar JOIN...');
    const foundProd = await productRepo.findById(product.id);
    console.log('   -> Categoría en producto (debe ser el nombre nuevo):', foundProd?.category);
    console.log('   -> CategoryId en producto:', foundProd?.categoryId);

    if (foundProd?.category === newCat.name && foundProd?.categoryId === newCat.id) {
        console.log('✅ Verificación de JOIN Exitosa');
    } else {
        console.error('❌ Error: El nombre de la categoría no coincide o no se asignó correctamente.');
        console.log('Esperado:', newCat.name);
        console.log('Recibido:', foundProd?.category);
    }

    // 4. Listar Categorías
    console.log('4. Listando categorías...');
    const list = await categoryService.getAllCategories();
    console.log(`   -> Total categorías: ${list.length}`);
    const foundInList = list.find(c => c.id === newCat.id);
    if (foundInList) console.log('✅ Categoría encontrada en lista');
    else console.error('❌ Categoría nueva no aparece en lista');

    // Limpieza (Opcional, pero bueno para no ensuciar)
    // await categoryRepo.delete(newCat.id); // Fallará si hay products? No pusimos FK constraint check en app level, y SQLite a veces es permisivo si no se habilita PRAGMA foreign_keys.
    // Dejémoslo ahí.
}

run().catch(console.error);
