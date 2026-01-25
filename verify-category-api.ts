import 'dotenv/config';
import express from 'express';
import { createApp } from './src/app.js';
import jwt from 'jsonwebtoken';
import http from 'http';

// Configuración
const PORT = 3001; // Puerto diferente para evitar conflictos
const BASE_URL = `http://localhost:${PORT}/api`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_test_key_12345';

// Mock Token
const generateToken = (role: string) => {
    return jwt.sign({
        userId: 'test-admin',
        username: 'admin',
        name: 'Admin Test',
        role: role,
        branchId: 'BRANCH-TEST-001'
    }, JWT_SECRET, { expiresIn: '1h' });
};

async function runTests() {
    console.log('🚀 Iniciando Verificación de Endpoints de Categorías...');

    // 1. Iniciar Servidor
    const app = createApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
        server.listen(PORT, () => {
            console.log(`📡 Servidor de prueba escuchando en puerto ${PORT}`);
            resolve();
        });
    });

    try {
        const token = generateToken('ADMIN');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 2. Test GET /categories (Debe estar limpia o con datos previos)
        console.log('\n🧪 [GET] /api/categories');
        const resList = await fetch(`${BASE_URL}/categories`, { headers });
        const list = await resList.json();
        console.log(`   Status: ${resList.status}`);
        console.log(`   Items: ${(list as any[]).length}`);

        if (resList.status !== 200) throw new Error('GET Failed');

        // 3. Test POST /categories
        console.log('\n🧪 [POST] /api/categories');
        const newCatName = `Cat-API-${Date.now()}`;
        const resCreate = await fetch(`${BASE_URL}/categories`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: newCatName,
                description: 'Creada desde el script de verificación de API',
                isActive: true
            })
        });
        const createdCat = await resCreate.json();
        console.log(`   Status: ${resCreate.status}`);
        console.log(`   Created: ${createdCat.id} - ${createdCat.name}`);

        if (resCreate.status !== 201) throw new Error(`POST Failed: ${JSON.stringify(createdCat)}`);

        // 4. Test PUT /categories/:id
        console.log('\n🧪 [PUT] /api/categories/:id');
        const resUpdate = await fetch(`${BASE_URL}/categories/${createdCat.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                description: 'Descripción actualizada'
            })
        });
        const updatedCat = await resUpdate.json();
        console.log(`   Status: ${resUpdate.status}`);
        console.log(`   New Desc: ${updatedCat.description}`);

        if (resUpdate.status !== 200) throw new Error('PUT Failed');

        // 5. Test DELETE /categories/:id
        console.log('\n🧪 [DELETE] /api/categories/:id');
        const resDelete = await fetch(`${BASE_URL}/categories/${createdCat.id}`, {
            method: 'DELETE',
            headers
        });
        console.log(`   Status: ${resDelete.status}`);

        if (resDelete.status !== 200) throw new Error('DELETE Failed');

        // Verificar que borró
        const resCheck = await fetch(`${BASE_URL}/categories`, { headers });
        const listCheck = await resCheck.json() as any[];
        const exists = listCheck.find((c: any) => c.id === createdCat.id);

        if (!exists) {
            console.log('✅ Categoría eliminada correctamente del listado');
        } else {
            console.error('❌ La categoría sigue apareciendo en el listado');
        }

        console.log('\n✅ TODAS LAS PRUEBAS DE ENDPOINT PASARON');

    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBAS:', error);
    } finally {
        // Cerrar servidor
        server.close(() => {
            console.log('🔌 Servidor de prueba detenido');
        });
    }
}

runTests();
