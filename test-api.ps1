# Script de Pruebas Completo de API - ERP Insumos
# Prueba todos los endpoints usando la API REST

$API_BASE = "http://localhost:3000"
$ErrorActionPreference = "Stop"

Write-Host "🧪 INICIANDO PRUEBAS COMPLETAS DE API" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Helper function para hacer requests
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Token,
        [object]$Body
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $params = @{
        Uri = "$API_BASE$Endpoint"
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-WebRequest @params
        return $response.Content | ConvertFrom-Json
    } catch {
        Write-Host "❌ Error en $Method $Endpoint : $_" -ForegroundColor Red
        throw
    }
}

try {
    # 1. AUTENTICACIÓN
    Write-Host "🔐 1. AUTENTICACIÓN" -ForegroundColor Yellow
    Write-Host "-------------------"
    
    $adminLogin = Invoke-ApiRequest -Method POST -Endpoint "/api/auth/login" -Body @{
        username = "admin_diriamba"
        password = "123"
    }
    $adminToken = $adminLogin.token
    Write-Host "✅ Login Admin: $($adminLogin.user.name)" -ForegroundColor Green
    
    $sellerLogin = Invoke-ApiRequest -Method POST -Endpoint "/api/auth/login" -Body @{
        username = "cajero_diriamba"
        password = "123"
    }
    $sellerToken = $sellerLogin.token
    Write-Host "✅ Login Seller: $($sellerLogin.user.name)`n" -ForegroundColor Green

    # 2. PRODUCTOS
    Write-Host "📦 2. PRODUCTOS" -ForegroundColor Yellow
    Write-Host "---------------"
    
    $products = Invoke-ApiRequest -Method GET -Endpoint "/api/products" -Token $adminToken
    Write-Host "✅ Productos existentes: $($products.Count)"
    
    $newProduct = Invoke-ApiRequest -Method POST -Endpoint "/api/products" -Token $adminToken -Body @{
        name = "Levadura Instantánea"
        description = "Levadura para panadería de alta calidad"
        sku = "LEV-INST-001"
        category = "Levaduras"
        costPrice = 5000
        retailPrice = 7000
        wholesalePrice = 6000
        unit = "kg"
        isActive = $true
    }
    Write-Host "✅ Producto creado: $($newProduct.name) - SKU: $($newProduct.sku)"
    
    $products = Invoke-ApiRequest -Method GET -Endpoint "/api/products" -Token $adminToken
    Write-Host "✅ Total productos: $($products.Count)`n" -ForegroundColor Green

    # 3. CLIENTES
    Write-Host "👥 3. CLIENTES" -ForegroundColor Yellow
    Write-Host "--------------"
    
    $customer1 = Invoke-ApiRequest -Method POST -Endpoint "/api/customers" -Token $adminToken -Body @{
        name = "Panadería El Buen Pan"
        phone = "88888888"
        address = "Barrio San Juan, Diriamba"
        type = "RETAIL"
        creditLimit = 500000
    }
    Write-Host "✅ Cliente retail: $($customer1.name)"
    
    $customer2 = Invoke-ApiRequest -Method POST -Endpoint "/api/customers" -Token $sellerToken -Body @{
        name = "Distribuidora La Económica"
        contactName = "Juan Pérez"
        phone = "77777777"
        email = "economica@example.com"
        address = "Km 42 Carretera Sur"
        taxId = "J0310000012345"
        type = "WHOLESALE"
        creditLimit = 2000000
    }
    Write-Host "✅ Cliente mayorista: $($customer2.name)"
    
    $customers = Invoke-ApiRequest -Method GET -Endpoint "/api/customers" -Token $adminToken
    Write-Host "✅ Total clientes: $($customers.Count)`n" -ForegroundColor Green

    # 4. PROVEEDORES
    Write-Host "🏭 4. PROVEEDORES" -ForegroundColor Yellow
    Write-Host "-----------------"
    
    $supplier1 = Invoke-ApiRequest -Method POST -Endpoint "/api/suppliers" -Token $adminToken -Body @{
        name = "Molinos de Nicaragua S.A."
        contactName = "María González"
        phone = "22223333"
        email = "ventas@molinos.com.ni"
        address = "Managua, Nicaragua"
        taxId = "J0310000098765"
        creditDays = 30
        creditLimit = 5000000
    }
    Write-Host "✅ Proveedor: $($supplier1.name) - Crédito: $($supplier1.creditDays) días"
    
    $suppliers = Invoke-ApiRequest -Method GET -Endpoint "/api/suppliers" -Token $adminToken
    Write-Host "✅ Total proveedores: $($suppliers.Count)`n" -ForegroundColor Green

    # 5. STOCK
    Write-Host "📊 5. STOCK" -ForegroundColor Yellow
    Write-Host "-----------"
    
    $stock = Invoke-ApiRequest -Method GET -Endpoint "/api/stock" -Token $adminToken
    Write-Host "✅ Registros de stock: $($stock.Count)"
    
    if ($stock.Count -gt 0) {
        $stockAlerts = Invoke-ApiRequest -Method GET -Endpoint "/api/stock/alerts" -Token $adminToken
        Write-Host "✅ Alertas de stock bajo: $($stockAlerts.Count)`n" -ForegroundColor Green
    }

    # 6. VENTAS
    Write-Host "💰 6. VENTAS" -ForegroundColor Yellow
    Write-Host "------------"
    
    # Venta al contado
    $sale1 = Invoke-ApiRequest -Method POST -Endpoint "/api/sales" -Token $sellerToken -Body @{
        items = @(
            @{
                productId = $products[0].id
                productName = $products[0].name
                quantity = 5
                unitPrice = $products[0].retailPrice
                subtotal = 5 * $products[0].retailPrice
            },
            @{
                productId = $products[1].id
                productName = $products[1].name
                quantity = 3
                unitPrice = $products[1].retailPrice
                subtotal = 3 * $products[1].retailPrice
            }
        )
        subtotal = (5 * $products[0].retailPrice) + (3 * $products[1].retailPrice)
        tax = 0
        discount = 0
        total = (5 * $products[0].retailPrice) + (3 * $products[1].retailPrice)
        type = "CASH"
        paymentMethod = "CASH"
    }
    $saleTotal = [math]::Round($sale1.total/100, 2)
    Write-Host "✅ Venta al contado: $($sale1.id) - Total: $saleTotal córdobas"
    
    # Venta a crédito
    $sale2 = Invoke-ApiRequest -Method POST -Endpoint "/api/sales" -Token $sellerToken -Body @{
        customerId = $customer2.id
        items = @(
            @{
                productId = $products[0].id
                productName = $products[0].name
                quantity = 20
                unitPrice = $products[0].wholesalePrice
                subtotal = 20 * $products[0].wholesalePrice
            }
        )
        subtotal = 20 * $products[0].wholesalePrice
        tax = 0
        discount = 0
        total = 20 * $products[0].wholesalePrice
        type = "CREDIT"
    }
    $sale2Total = [math]::Round($sale2.total/100, 2)
    Write-Host "✅ Venta a crédito: $($sale2.id) - Total: $sale2Total córdobas"
    
    $sales = Invoke-ApiRequest -Method GET -Endpoint "/api/sales" -Token $sellerToken
    Write-Host "✅ Total ventas: $($sales.Count)`n" -ForegroundColor Green

    # 7. COMPRAS
    Write-Host "🛒 7. COMPRAS" -ForegroundColor Yellow
    Write-Host "-------------"
    
    $purchase1 = Invoke-ApiRequest -Method POST -Endpoint "/api/purchases" -Token $adminToken -Body @{
        supplierId = $supplier1.id
        items = @(
            @{
                productId = $products[0].id
                productName = $products[0].name
                quantity = 100
                unitCost = $products[0].costPrice
                subtotal = 100 * $products[0].costPrice
            },
            @{
                productId = $newProduct.id
                productName = $newProduct.name
                quantity = 50
                unitCost = $newProduct.costPrice
                subtotal = 50 * $newProduct.costPrice
            }
        )
        subtotal = (100 * $products[0].costPrice) + (50 * $newProduct.costPrice)
        tax = 0
        discount = 0
        total = (100 * $products[0].costPrice) + (50 * $newProduct.costPrice)
        type = "CREDIT"
        invoiceNumber = "FAC-001-2026"
    }
    $purchaseTotal = [math]::Round($purchase1.total/100, 2)
    Write-Host "✅ Compra a crédito: $($purchase1.id) - Total: $purchaseTotal córdobas"
    
    $purchases = Invoke-ApiRequest -Method GET -Endpoint "/api/purchases" -Token $adminToken
    Write-Host "✅ Total compras: $($purchases.Count)`n" -ForegroundColor Green

    # 8. CRÉDITOS
    Write-Host "💳 8. CRÉDITOS" -ForegroundColor Yellow
    Write-Host "--------------"
    
    $credits = Invoke-ApiRequest -Method GET -Endpoint "/api/credits/accounts" -Token $adminToken
    Write-Host "✅ Cuentas de crédito: $($credits.Count)"
    
    if ($credits.Count -gt 0) {
        # Registrar un pago
        $payment = Invoke-ApiRequest -Method POST -Endpoint "/api/credits/accounts/$($credits[0].id)/payments" -Token $adminToken -Body @{
            amount = 50000
            paymentMethod = "CASH"
            notes = "Abono a cuenta"
        }
        $paymentAmount = [math]::Round($payment.amount/100, 2)
        Write-Host "✅ Pago registrado: $paymentAmount córdobas"
        
        $payments = Invoke-ApiRequest -Method GET -Endpoint "/api/credits/accounts/$($credits[0].id)/payments" -Token $adminToken
        Write-Host "✅ Pagos de la cuenta: $($payments.Count)`n" -ForegroundColor Green
    }

    # 9. TRANSFERENCIAS
    Write-Host "🔄 9. TRANSFERENCIAS" -ForegroundColor Yellow
    Write-Host "--------------------"
    
    $transfer1 = Invoke-ApiRequest -Method POST -Endpoint "/api/transfers" -Token $adminToken -Body @{
        toBranchId = "BRANCH-JIN-001"
        items = @(
            @{
                productId = $products[0].id
                productName = $products[0].name
                quantity = 10
            }
        )
        notes = "Transferencia de prueba a Jinotepe"
    }
    Write-Host "✅ Transferencia creada: $($transfer1.id)"
    
    $transfers = Invoke-ApiRequest -Method GET -Endpoint "/api/transfers" -Token $adminToken
    Write-Host "✅ Total transferencias: $($transfers.Count)`n" -ForegroundColor Green

    # 10. CAJA
    Write-Host "💵 10. CAJA" -ForegroundColor Yellow
    Write-Host "-----------"
    
    $balance = Invoke-ApiRequest -Method GET -Endpoint "/api/cash/balance" -Token $adminToken
    $income = [math]::Round($balance.income/100, 2)
    $expenses = [math]::Round($balance.expenses/100, 2)
    $netBalance = [math]::Round($balance.netBalance/100, 2)
    
    Write-Host "✅ Balance del día:"
    Write-Host "   Ingresos: $income córdobas" -ForegroundColor Green
    Write-Host "   Egresos: $expenses córdobas" -ForegroundColor Red
    Write-Host "   Balance neto: $netBalance córdobas" -ForegroundColor Cyan
    
    $dailyRevenue = Invoke-ApiRequest -Method GET -Endpoint "/api/cash/daily-revenue" -Token $adminToken
    $revenue = [math]::Round($dailyRevenue.income/100, 2)
    Write-Host "✅ Ingreso total del día: $revenue córdobas`n" -ForegroundColor Green

    # RESUMEN FINAL
    Write-Host "`n" + "="*50 -ForegroundColor Cyan
    Write-Host "✅ PRUEBAS COMPLETADAS EXITOSAMENTE" -ForegroundColor Green
    Write-Host "="*50 -ForegroundColor Cyan
    
    Write-Host "`n📊 RESUMEN DE DATOS CREADOS:" -ForegroundColor Yellow
    Write-Host "   • Productos: $($products.Count)" -ForegroundColor White
    Write-Host "   • Clientes: $($customers.Count)" -ForegroundColor White
    Write-Host "   • Proveedores: $($suppliers.Count)" -ForegroundColor White
    Write-Host "   • Ventas: $($sales.Count)" -ForegroundColor White
    Write-Host "   • Compras: $($purchases.Count)" -ForegroundColor White
    Write-Host "   • Créditos: $($credits.Count)" -ForegroundColor White
    Write-Host "   • Transferencias: $($transfers.Count)" -ForegroundColor White
    Write-Host "   • Stock: $($stock.Count) registros" -ForegroundColor White
    
    Write-Host "`n🎉 Todos los endpoints funcionando correctamente con Turso!" -ForegroundColor Green
    Write-Host "🌐 Swagger UI: http://localhost:3000/api-docs`n" -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ ERROR DURANTE LAS PRUEBAS:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    exit 1
}
