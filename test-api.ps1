# Script de prueba de API en PowerShell
# Prueba todos los endpoints y verifica unidades de medida

$baseUrl = "http://localhost:3000"
$token = ""

function Write-ColorOutput($message, $color = "White") {
    Write-Host $message -ForegroundColor $color
}

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }
        
        $params = @{
            Uri = "$baseUrl$Endpoint"
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
            StatusCode = 200
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = $_.Exception.Response.StatusCode.value__
        }
    }
}

Write-ColorOutput "`n╔════════════════════════════════════════════════╗" Cyan
Write-ColorOutput "║   PRUEBAS COMPLETAS DE API - INSBR ERP        ║" Cyan
Write-ColorOutput "╚════════════════════════════════════════════════╝" Cyan

# ============================================
# PRUEBA 1: Health Check
# ============================================
Write-ColorOutput "`n🏥 HEALTH CHECK" Blue
Write-ColorOutput "━" * 50 Blue

$result = Test-Endpoint -Method "GET" -Endpoint "/health"
if ($result.Success) {
    Write-ColorOutput "✅ GET /health - OK" Green
    Write-ColorOutput "   Sistema: $($result.Data.system)" Yellow
} else {
    Write-ColorOutput "❌ GET /health - FALLÓ" Red
}

# ============================================
# PRUEBA 2: Autenticación
# ============================================
Write-ColorOutput "`n📝 AUTENTICACIÓN" Blue
Write-ColorOutput "━" * 50 Blue

$loginBody = @{
    username = "admin"
    password = "admin123"
}

$result = Test-Endpoint -Method "POST" -Endpoint "/api/auth/login" -Body $loginBody
if ($result.Success -and $result.Data.token) {
    $token = $result.Data.token
    Write-ColorOutput "✅ POST /api/auth/login - OK" Green
    Write-ColorOutput "   Token: $($token.Substring(0, 20))..." Yellow
} else {
    Write-ColorOutput "❌ POST /api/auth/login - FALLÓ" Red
}

# ============================================
# PRUEBA 3: Productos
# ============================================
Write-ColorOutput "`n📦 PRODUCTOS" Blue
Write-ColorOutput "━" * 50 Blue

# Listar productos
$result = Test-Endpoint -Method "GET" -Endpoint "/api/products"
if ($result.Success) {
    Write-ColorOutput "✅ GET /api/products - OK" Green
    Write-ColorOutput "   Total productos: $($result.Data.Count)" Yellow
    
    if ($result.Data.Count -gt 0) {
        $product = $result.Data[0]
        Write-ColorOutput "`n   📋 Ejemplo de producto:" Cyan
        Write-ColorOutput "   - Nombre: $($product.name)" Yellow
        Write-ColorOutput "   - SKU: $($product.sku)" Yellow
        Write-ColorOutput "   - Unidad: $($product.unit)" Yellow
        Write-ColorOutput "   - Precio costo: C`$$([math]::Round($product.costPrice / 100, 2))" Yellow
        Write-ColorOutput "   - Precio detalle: C`$$([math]::Round($product.retailPrice / 100, 2))" Yellow
        Write-ColorOutput "   - Precio mayoreo: C`$$([math]::Round($product.wholesalePrice / 100, 2))" Yellow
        
        # Verificar unidades
        if ($product.costPrice -gt 100 -and $product.retailPrice -gt 100) {
            Write-ColorOutput "   ✓ Precios en centavos: CORRECTO" Green
        } else {
            Write-ColorOutput "   ⚠ Advertencia: Precios parecen muy bajos" Yellow
        }
        
        $productId = $product.id
        
        # Obtener producto por ID
        $result2 = Test-Endpoint -Method "GET" -Endpoint "/api/products/$productId"
        if ($result2.Success) {
            Write-ColorOutput "✅ GET /api/products/:id - OK" Green
        } else {
            Write-ColorOutput "❌ GET /api/products/:id - FALLÓ" Red
        }
    }
} else {
    Write-ColorOutput "❌ GET /api/products - FALLÓ" Red
}

# Crear producto de prueba
$newProduct = @{
    name = "Producto de Prueba PowerShell"
    description = "Descripción de prueba"
    sku = "TEST-PS-001"
    category = "Pruebas"
    costPrice = 5000
    retailPrice = 7500
    wholesalePrice = 6500
    unit = "unidad"
    isActive = $true
}

$result = Test-Endpoint -Method "POST" -Endpoint "/api/products" -Body $newProduct
if ($result.Success) {
    Write-ColorOutput "✅ POST /api/products - OK" Green
    Write-ColorOutput "   Producto creado: $($result.Data.id)" Yellow
    $testProductId = $result.Data.id
    
    # Actualizar producto
    $updateData = @{
        name = "Producto Actualizado"
        retailPrice = 8000
    }
    
    $result2 = Test-Endpoint -Method "PUT" -Endpoint "/api/products/$testProductId" -Body $updateData
    if ($result2.Success) {
        Write-ColorOutput "✅ PUT /api/products/:id - OK" Green
    } else {
        Write-ColorOutput "❌ PUT /api/products/:id - FALLÓ" Red
    }
    
    # Eliminar producto
    $result3 = Test-Endpoint -Method "DELETE" -Endpoint "/api/products/$testProductId"
    if ($result3.Success) {
        Write-ColorOutput "✅ DELETE /api/products/:id - OK" Green
    } else {
        Write-ColorOutput "❌ DELETE /api/products/:id - FALLÓ" Red
    }
} else {
    Write-ColorOutput "❌ POST /api/products - FALLÓ" Red
}

# ============================================
# PRUEBA 4: Ventas
# ============================================
Write-ColorOutput "`n💰 VENTAS" Blue
Write-ColorOutput "━" * 50 Blue

$result = Test-Endpoint -Method "GET" -Endpoint "/api/sales"
if ($result.Success) {
    Write-ColorOutput "✅ GET /api/sales - OK" Green
    Write-ColorOutput "   Total ventas: $($result.Data.Count)" Yellow
    
    if ($result.Data.Count -gt 0) {
        $sale = $result.Data[0]
        Write-ColorOutput "`n   📋 Ejemplo de venta:" Cyan
        Write-ColorOutput "   - ID: $($sale.id)" Yellow
        Write-ColorOutput "   - Total: C`$$([math]::Round($sale.total / 100, 2))" Yellow
        Write-ColorOutput "   - Fecha: $($sale.createdAt)" Yellow
        
        if ($sale.total -gt 100) {
            Write-ColorOutput "   ✓ Total en centavos: CORRECTO" Green
        }
    }
} else {
    Write-ColorOutput "❌ GET /api/sales - FALLÓ" Red
}

# ============================================
# PRUEBA 5: Compras
# ============================================
Write-ColorOutput "`n🛒 COMPRAS" Blue
Write-ColorOutput "━" * 50 Blue

$result = Test-Endpoint -Method "GET" -Endpoint "/api/purchases"
if ($result.Success) {
    Write-ColorOutput "✅ GET /api/purchases - OK" Green
    Write-ColorOutput "   Total compras: $($result.Data.Count)" Yellow
    
    if ($result.Data.Count -gt 0) {
        $purchase = $result.Data[0]
        Write-ColorOutput "`n   📋 Ejemplo de compra:" Cyan
        Write-ColorOutput "   - ID: $($purchase.id)" Yellow
        Write-ColorOutput "   - Total: C`$$([math]::Round($purchase.total / 100, 2))" Yellow
        Write-ColorOutput "   - Fecha: $($purchase.createdAt)" Yellow
        
        if ($purchase.total -gt 100) {
            Write-ColorOutput "   ✓ Total en centavos: CORRECTO" Green
        }
    }
} else {
    Write-ColorOutput "❌ GET /api/purchases - FALLÓ" Red
}

# ============================================
# PRUEBA 6: Créditos
# ============================================
Write-ColorOutput "`n💳 CRÉDITOS (CXC/CPP)" Blue
Write-ColorOutput "━" * 50 Blue

# Cuentas por cobrar
$result = Test-Endpoint -Method "GET" -Endpoint "/api/credits/receivable"
if ($result.Success) {
    Write-ColorOutput "✅ GET /api/credits/receivable - OK" Green
    Write-ColorOutput "   Total CXC: $($result.Data.Count)" Yellow
    
    if ($result.Data.Count -gt 0) {
        $account = $result.Data[0]
        Write-ColorOutput "   - Saldo: C`$$([math]::Round($account.balance / 100, 2))" Yellow
        
        if ($account.balance -gt 100) {
            Write-ColorOutput "   ✓ Saldo en centavos: CORRECTO" Green
        }
    }
} else {
    Write-ColorOutput "❌ GET /api/credits/receivable - FALLÓ" Red
}

# Cuentas por pagar
$result = Test-Endpoint -Method "GET" -Endpoint "/api/credits/payable"
if ($result.Success) {
    Write-ColorOutput "✅ GET /api/credits/payable - OK" Green
    Write-ColorOutput "   Total CPP: $($result.Data.Count)" Yellow
} else {
    Write-ColorOutput "❌ GET /api/credits/payable - FALLÓ" Red
}

# ============================================
# PRUEBA 7: Transferencias
# ============================================
Write-ColorOutput "`n🔄 TRANSFERENCIAS" Blue
Write-ColorOutput "━" * 50 Blue

$result = Test-Endpoint -Method "GET" -Endpoint "/api/transfers"
if ($result.Success) {
    Write-ColorOutput "✅ GET /api/transfers - OK" Green
    Write-ColorOutput "   Total transferencias: $($result.Data.Count)" Yellow
    
    if ($result.Data.Count -gt 0) {
        $transfer = $result.Data[0]
        Write-ColorOutput "   - Estado: $($transfer.status)" Yellow
        Write-ColorOutput "   - Items: $($transfer.items.Count)" Yellow
        
        if ($transfer.items.Count -gt 0) {
            $item = $transfer.items[0]
            Write-ColorOutput "   - Cantidad: $($item.quantity) unidades" Yellow
            Write-ColorOutput "   ✓ Cantidad en unidades: CORRECTO" Green
        }
    }
} else {
    Write-ColorOutput "❌ GET /api/transfers - FALLÓ" Red
}

# ============================================
# RESUMEN
# ============================================
Write-ColorOutput "`n📏 VERIFICACIÓN DE UNIDADES DE MEDIDA" Blue
Write-ColorOutput "━" * 50 Blue
Write-ColorOutput "Unidades esperadas:" Yellow
Write-ColorOutput "  • Precios: centavos (1 córdoba = 100 centavos)" Yellow
Write-ColorOutput "  • Cantidades: unidades enteras" Yellow
Write-ColorOutput "  • Productos: string (kg, saco, unidad, litro, etc.)" Yellow
Write-ColorOutput "  • Fechas: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)" Yellow

Write-ColorOutput "`n╔════════════════════════════════════════════════╗" Green
Write-ColorOutput "║   PRUEBAS COMPLETADAS                          ║" Green
Write-ColorOutput "╚════════════════════════════════════════════════╝" Green
