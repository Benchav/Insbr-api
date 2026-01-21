import 'dotenv/config';
import 'dotenv/config';
import { createApp } from '../../app.js';
// import { tursoClient } from './client.js'; // No se usa directamente en este script

async function testUserUpdate() {
    console.log('🧪 Probando actualización de usuarios (PUT /api/auth/users/:id)...\n');

    const app = createApp();
    const server = app.listen(3001); // Puerto diferente para prueba

    try {
        // 1. Login como ADMIN
        console.log('1️⃣  Login como ADMIN...');
        const loginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin_diriamba', // Asumimos que este usuario existe del seed
                password: '123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login falló: ${await loginRes.text()}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        const adminId = loginData.user.id;
        console.log('✅ Login exitoso. Token obtenido.\n');

        // 2. Crear un usuario temporal para probar edición
        console.log('2️⃣  Creando usuario temporal para pruebas...');
        const tempUsername = `testuser_${Date.now()}`;
        const registerRes = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: tempUsername,
                password: 'password123',
                name: 'Usuario Prueba Original',
                role: 'SELLER',
                branchId: 'BRANCH-DIR-001'
            })
        });

        if (!registerRes.ok) {
            throw new Error(`Registro falló: ${await registerRes.text()}`);
        }

        const registerData = await registerRes.json();
        const userId = registerData.user.id;
        console.log(`✅ Usuario creado: ${userId} (${tempUsername})\n`);

        // 3. Probar actualización completa (Nombre, Password, Rol)
        console.log('3️⃣  Probando actualización de usuario (Nombre, Password, Rol)...');
        const newPassword = 'newpassword456';
        const updateRes = await fetch(`http://localhost:3001/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Usuario Prueba Modificado',
                password: newPassword, // Cambiando contraseña
                role: 'ADMIN', // Cambiando rol
                isActive: false // Desactivando
            })
        });

        if (!updateRes.ok) {
            throw new Error(`Actualización falló: ${await updateRes.text()}`);
        }

        const updateData = await updateRes.json();
        console.log('✅ Respuesta de actualización:', JSON.stringify(updateData.user, null, 2));

        // Validaciones
        if (updateData.user.name !== 'Usuario Prueba Modificado') throw new Error('Nombre no actualizado');
        if (updateData.user.role !== 'ADMIN') throw new Error('Rol no actualizado');
        if (updateData.user.isActive !== false) throw new Error('Estado no actualizado');
        console.log('✅ Campos actualizados correctamente en respuesta.\n');

        // 4. Verificar login con NUEVA contraseña
        console.log('4️⃣  Verificando login con NUEVA contraseña...');
        const newLoginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: tempUsername,
                password: newPassword
            })
        });

        if (newLoginRes.status === 401) {
            // Es de esperar que falle porque isActive = false
            const errorText = await newLoginRes.json();
            if (errorText.error === 'Usuario inactivo') {
                console.log('✅ Login rechazado correctamente (Usuario inactivo). La contraseña fue validada antes del check de activo, o el check de activo pasó primero.');
                // Para estar seguros del password, reactivamos
            } else {
                throw new Error(`Error inesperado en login: ${JSON.stringify(errorText)}`);
            }
        }

        // Reactivamos usuario para probar password
        console.log('   Reactivando usuario para probar password...');
        await fetch(`http://localhost:3001/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isActive: true })
        });

        const retryLoginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: tempUsername,
                password: newPassword
            })
        });

        if (retryLoginRes.ok) {
            console.log('✅ Login exitoso con NUEVA contraseña.');
        } else {
            throw new Error(`Login con nueva contraseña falló: ${await retryLoginRes.text()}`);
        }

        // 5. Verificar que la contraseña VIEJA ya no funciona
        console.log('5️⃣  Verificando que contraseña VIEJA falla...');
        const oldLoginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: tempUsername,
                password: 'password123'
            })
        });

        if (oldLoginRes.status === 401) {
            console.log('✅ Login con contraseña vieja rechazado correctamente.\n');
        } else {
            throw new Error('Login con contraseña vieja debió fallar');
        }

        console.log('🎉 Todas las pruebas de actualización de usuario pasaron exitosamente!');

    } catch (error) {
        console.error('❌ Error en prueba:', error);
        process.exit(1);
    } finally {
        server.close();
        process.exit(0);
    }
}

testUserUpdate();
