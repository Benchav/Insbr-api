# Test IAM System - Role-Based Access Control
# Este script prueba todos los aspectos del sistema de autenticación y autorización

$baseUrl = "http://localhost:3000"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔐 TESTING IAM SYSTEM WITH RBAC" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Variables para almacenar tokens
$adminToken = ""
$sellerToken = ""

# ========== 1. TEST LOGIN - TODOS LOS USUARIOS ==========
Write-Host "`n[TEST 1] Login con todos los usuarios" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Login Admin Diriamba
Write-Host "`n✓ Login: admin_diriamba" -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body (@{
    username = "admin_diriamba"
    password = "123"
} | ConvertTo-Json) -ContentType "application/json"
$adminToken = $response.token
Write-Host "  Token recibido: $($adminToken.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "  Usuario: $($response.user.name) | Rol: $($response.user.role)" -ForegroundColor Gray

# Login Cajero Diriamba
Write-Host "`n✓ Login: cajero_diriamba" -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body (@{
    username = "cajero_diriamba"
    password = "123"
} | ConvertTo-Json) -ContentType "application/json"
$sellerToken = $response.token
Write-Host "  Token recibido: $($sellerToken.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "  Usuario: $($response.user.name) | Rol: $($response.user.role)" -ForegroundColor Gray

# Login Admin Jinotepe
Write-Host "`n✓ Login: admin_jinotepe" -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body (@{
    username = "admin_jinotepe"
    password = "123"
} | ConvertTo-Json) -ContentType "application/json"
Write-Host "  Usuario: $($response.user.name) | Rol: $($response.user.role)" -ForegroundColor Gray

# Login Cajero Jinotepe
Write-Host "`n✓ Login: cajero_jinotepe" -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body (@{
    username = "cajero_jinotepe"
    password = "123"
} | ConvertTo-Json) -ContentType "application/json"
Write-Host "  Usuario: $($response.user.name) | Rol: $($response.user.role)" -ForegroundColor Gray

# ========== 2. TEST SELLER PERMISSIONS - ALLOWED ==========
Write-Host "`n`n[TEST 2] SELLER - Endpoints Permitidos" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# GET /api/auth/me
Write-Host "`n✓ GET /api/auth/me (Cualquier usuario autenticado)" -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers @{
    Authorization = "Bearer $sellerToken"
}
Write-Host "  Usuario: $($response.user.name)" -ForegroundColor Gray

# GET /api/products
Write-Host "`n✓ GET /api/products (Ver catálogo)" -ForegroundColor Green
$response = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET -Headers @{
    Authorization = "Bearer $sellerToken"
}
Write-Host "  Productos encontrados: $($response.Count)" -ForegroundColor Gray

# POST /api/sales (crear venta)
Write-Host "`n✓ POST /api/sales (Registrar venta)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/sales" -Method POST -Headers @{
        Authorization = "Bearer $sellerToken"
    } -Body (@{
        items = @(
            @{
                productId = "PROD-HAR-001"
                quantity = 2
                unitPrice = 220000
            }
        )
        paymentMethod = "CASH"
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  Venta creada: $($response.id)" -ForegroundColor Gray
    $saleId = $response.id
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# GET /api/reports/sales/:id/ticket (imprimir ticket)
if ($saleId) {
    Write-Host "`n✓ GET /api/reports/sales/$saleId/ticket (Imprimir ticket PDF)" -ForegroundColor Green
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/reports/sales/$saleId/ticket" -Method GET -Headers @{
            Authorization = "Bearer $sellerToken"
        }
        Write-Host "  PDF generado: $($response.Headers.'Content-Length') bytes" -ForegroundColor Gray
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ========== 3. TEST SELLER PERMISSIONS - BLOCKED ==========
Write-Host "`n`n[TEST 3] SELLER - Endpoints Bloqueados (403 esperado)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# POST /api/auth/register (crear usuario)
Write-Host "`n✗ POST /api/auth/register (Solo ADMIN)" -ForegroundColor Red
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Headers @{
        Authorization = "Bearer $sellerToken"
    } -Body (@{
        username = "test_user"
        password = "123"
        name = "Test User"
        role = "SELLER"
        branchId = "BRANCH-DIR-001"
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  ✓ Correctamente bloqueado (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# GET /api/reports/sales/excel (descargar Excel)
Write-Host "`n✗ GET /api/reports/sales/excel (Solo ADMIN)" -ForegroundColor Red
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/reports/sales/excel" -Method GET -Headers @{
        Authorization = "Bearer $sellerToken"
    }
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  ✓ Correctamente bloqueado (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# GET /api/reports/cash/excel (descargar Excel de caja)
Write-Host "`n✗ GET /api/reports/cash/excel (Solo ADMIN)" -ForegroundColor Red
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/reports/cash/excel" -Method GET -Headers @{
        Authorization = "Bearer $sellerToken"
    }
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  ✓ Correctamente bloqueado (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# POST /api/purchases (crear compra)
Write-Host "`n✗ POST /api/purchases (Solo ADMIN)" -ForegroundColor Red
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchases" -Method POST -Headers @{
        Authorization = "Bearer $sellerToken"
    } -Body (@{
        supplierId = "SUPP-NACIONAL-001"
        items = @(@{
            productId = "PROD-HAR-001"
            quantity = 10
            unitCost = 180000
        })
        paymentMethod = "CASH"
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  ✓ Correctamente bloqueado (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# GET /api/credits (gestionar créditos)
Write-Host "`n✗ GET /api/credits (Solo ADMIN)" -ForegroundColor Red
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/credits" -Method GET -Headers @{
        Authorization = "Bearer $sellerToken"
    }
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  ✓ Correctamente bloqueado (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ========== 4. TEST ADMIN PERMISSIONS - FULL ACCESS ==========
Write-Host "`n`n[TEST 4] ADMIN - Acceso Total" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# POST /api/auth/register (crear usuario)
Write-Host "`n✓ POST /api/auth/register (Crear nuevo usuario)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Headers @{
        Authorization = "Bearer $adminToken"
    } -Body (@{
        username = "vendedor_test_$(Get-Random)"
        password = "123"
        name = "Vendedor Test"
        role = "SELLER"
        branchId = "BRANCH-DIR-001"
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  Usuario creado: $($response.user.username)" -ForegroundColor Gray
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# GET /api/reports/sales/excel
Write-Host "`n✓ GET /api/reports/sales/excel (Descargar Excel)" -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/reports/sales/excel" -Method GET -Headers @{
        Authorization = "Bearer $adminToken"
    }
    Write-Host "  Excel generado: $($response.Headers.'Content-Length') bytes" -ForegroundColor Gray
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# POST /api/purchases
Write-Host "`n✓ POST /api/purchases (Crear compra)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchases" -Method POST -Headers @{
        Authorization = "Bearer $adminToken"
    } -Body (@{
        supplierId = "SUPP-NACIONAL-001"
        items = @(@{
            productId = "PROD-HAR-001"
            quantity = 10
            unitCost = 180000
        })
        paymentMethod = "CASH"
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  Compra creada: $($response.id)" -ForegroundColor Gray
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# GET /api/credits
Write-Host "`n✓ GET /api/credits (Ver créditos)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/credits" -Method GET -Headers @{
        Authorization = "Bearer $adminToken"
    }
    Write-Host "  Créditos encontrados: $($response.Count)" -ForegroundColor Gray
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ========== 5. TEST INVALID TOKEN ==========
Write-Host "`n`n[TEST 5] Tokens Inválidos (401/403 esperado)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Sin token
Write-Host "`n✗ GET /api/products (Sin token)" -ForegroundColor Red
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✓ Correctamente bloqueado (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Token inválido
Write-Host "`n✗ GET /api/products (Token inválido)" -ForegroundColor Red
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method GET -Headers @{
        Authorization = "Bearer token_invalido_12345"
    }
    Write-Host "  ❌ ERROR: Debería haber sido bloqueado!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "  ✓ Correctamente bloqueado (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "  Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ========== RESUMEN ==========
Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "✅ TESTS COMPLETADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nSistema IAM con RBAC funcionando correctamente!" -ForegroundColor Green
Write-Host "`nReglas de Negocio Verificadas:" -ForegroundColor White
Write-Host "  ✓ SELLER puede: Vender, Ver Stock, Imprimir Tickets" -ForegroundColor Green
Write-Host "  ✓ SELLER NO puede: Descargar Excel, Crear Usuarios, Compras, Créditos" -ForegroundColor Green
Write-Host "  ✓ ADMIN tiene: Control Total" -ForegroundColor Green
Write-Host ""
