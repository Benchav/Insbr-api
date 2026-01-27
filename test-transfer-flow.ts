/**
 * Prueba de flujo completo de transferencia de productos entre sucursales
 * - Crea una transferencia
 * - Acepta la transferencia
 * - Despacha la transferencia
 * - Recibe la transferencia
 * - Valida el estado y los productos
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_USER = { username: 'admin', password: 'Admin@2026!Insbr' };

async function fetchJson(method, endpoint, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE_URL + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function main() {
  // 1. Login admin
  const login = await fetchJson('POST', '/api/auth/login', null, ADMIN_USER);
  if (!login.data?.token) throw new Error('Login falló');
  const token = login.data.token;
  console.log('Login OK');

  // 2. Obtener sucursales y productos
  const branches = await fetchJson('GET', '/api/branches', token);
  if (!branches.data || branches.data.length < 2) throw new Error('Se requieren al menos 2 sucursales');
  const [fromBranch, toBranch] = branches.data;
  const products = await fetchJson('GET', '/api/products', token);
  if (!products.data || products.data.length === 0) throw new Error('No hay productos');
  const product = products.data[0];

  // 3. Crear transferencia
  const transferReq = {
    fromBranchId: fromBranch.id,
    toBranchId: toBranch.id,
    items: [{ productId: product.id, quantity: 1 }],
    notes: 'Prueba automática',
  };
  const created = await fetchJson('POST', '/api/transfers', token, transferReq);
  if (created.status !== 201) throw new Error('No se pudo crear transferencia: ' + JSON.stringify(created.data));
  const transfer = created.data;
  console.log('Transferencia creada:', transfer.id);

  // 4. Aceptar transferencia (solo si tipo REQUEST)
  if (transfer.status === 'REQUESTED') {
    const accepted = await fetchJson('PATCH', `/api/transfers/${transfer.id}/accept`, token);
    if (accepted.status !== 200) throw new Error('No se pudo aceptar transferencia');
    console.log('Transferencia aceptada');
  }

  // 5. Despachar transferencia
  const shipped = await fetchJson('PATCH', `/api/transfers/${transfer.id}/ship`, token);
  if (shipped.status !== 200) throw new Error('No se pudo despachar transferencia');
  console.log('Transferencia despachada');

  // 6. Login usuario destino (gerente_jinotepe)
  const destinoUser = { username: 'gerente_jinotepe', password: 'Gerente@Jin2026!' };
  const loginDestino = await fetchJson('POST', '/api/auth/login', null, destinoUser);
  if (!loginDestino.data?.token) throw new Error('Login destino falló');
  const tokenDestino = loginDestino.data.token;
  console.log('Login destino OK');

  // 7. Recibir transferencia con usuario destino
  const received = await fetchJson('PATCH', `/api/transfers/${transfer.id}/receive`, tokenDestino);
  if (received.status !== 200) throw new Error('No se pudo recibir transferencia');
  console.log('Transferencia recibida');

  // 8. Esperar 1 segundo antes de validar estado final
  await new Promise(res => setTimeout(res, 1000));
  // Consultar con admin
  console.log('ID consultado:', transfer.id);
  const finalAdmin = await fetchJson('GET', `/api/transfers/${transfer.id}`, token);
  console.log('Respuesta final transferencia (admin):', finalAdmin);
  // Listar todas las transferencias
  const allTransfers = await fetchJson('GET', '/api/transfers', token);
  const allIds = allTransfers.data?.map(t => t.id);
  console.log('Listado de transferencias:', allIds);
  if (allIds && !allIds.includes(transfer.id)) {
    console.error('El id consultado no está en el listado.');
  } else {
    console.log('El id consultado SÍ está en el listado.');
  }
  if (!finalAdmin.data) throw new Error('Respuesta vacía');
  if (finalAdmin.data.status !== 'COMPLETED') throw new Error('Estado final incorrecto');
  if (!finalAdmin.data.items || finalAdmin.data.items[0].productId !== product.id) throw new Error('Producto no coincide');
  console.log('Flujo de transferencia de productos: OK');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
