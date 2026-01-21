import express, { Express } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Repositories - Turso
import { ProductRepositoryTurso } from './infrastructure/turso/repositories/product.repository.turso.js';
import { StockRepositoryTurso } from './infrastructure/turso/repositories/stock.repository.turso.js';
import { CustomerRepositoryTurso } from './infrastructure/turso/repositories/customer.repository.turso.js';
import { SupplierRepositoryTurso } from './infrastructure/turso/repositories/supplier.repository.turso.js';
import { CreditAccountRepositoryTurso, CreditPaymentRepositoryTurso } from './infrastructure/turso/repositories/credit-account.repository.turso.js';
import { SaleRepositoryTurso } from './infrastructure/turso/repositories/sale.repository.turso.js';
import { PurchaseRepositoryTurso } from './infrastructure/turso/repositories/purchase.repository.turso.js';
import { CashMovementRepositoryTurso } from './infrastructure/turso/repositories/cash-movement.repository.turso.js';
import { TransferRepositoryTurso } from './infrastructure/turso/repositories/transfer.repository.turso.js';
import { UserRepositoryTurso } from './infrastructure/turso/repositories/user.repository.turso.js';
import { BranchRepositoryTurso } from './infrastructure/turso/repositories/branch.repository.turso.js';

// Services
import { ProductService } from './application/services/product.service.js';
import { SaleService } from './application/services/sale.service.js';
import { PurchaseService } from './application/services/purchase.service.js';
import { CreditService } from './application/services/credit.service.js';
import { TransferService } from './application/services/transfer.service.js';
import { CashService } from './application/services/cash.service.js';
import { StockService } from './application/services/stock.service.js';
import { AuthService } from './application/services/auth.service.js';
import { CustomerService } from './application/services/customer.service.js';
import { SupplierService } from './application/services/supplier.service.js';
import { PdfService } from './infrastructure/reports/pdf.service.js';
import { ExcelService } from './infrastructure/reports/excel.service.js';

// Controllers & Middleware
import { createProductController } from './api/controllers/product.controller.js';
import { createSaleController } from './api/controllers/sale.controller.js';
import { createPurchaseController } from './api/controllers/purchase.controller.js';
import { createCreditController } from './api/controllers/credit.controller.js';
import { createTransferController } from './api/controllers/transfer.controller.js';
import { createReportController } from './api/controllers/report.controller.js';
import { createAuthController } from './api/controllers/auth.controller.js';
import { createCashController } from './api/controllers/cash.controller.js';
import { createStockController } from './api/controllers/stock.controller.js';
import { createCustomerController } from './api/controllers/customer.controller.js';
import { createSupplierController } from './api/controllers/supplier.controller.js';
import { authenticate, authorize } from './infrastructure/web/middlewares/auth.middleware.js';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 1. Inicializar Repositorios Turso
  const productRepository = new ProductRepositoryTurso();
  const stockRepository = new StockRepositoryTurso();
  const customerRepository = new CustomerRepositoryTurso();
  const supplierRepository = new SupplierRepositoryTurso();
  const creditAccountRepository = new CreditAccountRepositoryTurso();
  const creditPaymentRepository = new CreditPaymentRepositoryTurso();
  const saleRepository = new SaleRepositoryTurso();
  const purchaseRepository = new PurchaseRepositoryTurso();
  const cashMovementRepository = new CashMovementRepositoryTurso();
  const transferRepository = new TransferRepositoryTurso();
  const branchRepository = new BranchRepositoryTurso();
  const userRepository = new UserRepositoryTurso();

  // 2. Inicializar Servicios
  const productService = new ProductService(productRepository);

  const saleService = new SaleService(
    saleRepository,
    stockRepository,
    customerRepository,
    creditAccountRepository,
    cashMovementRepository,
    productRepository
  );

  const purchaseService = new PurchaseService(
    purchaseRepository,
    stockRepository,
    supplierRepository,
    creditAccountRepository,
    cashMovementRepository
  );

  const creditService = new CreditService(
    creditAccountRepository,
    creditPaymentRepository,
    cashMovementRepository,
    customerRepository
  );

  const transferService = new TransferService(
    transferRepository,
    stockRepository,
    branchRepository,
    productRepository
  );

  const cashService = new CashService(cashMovementRepository);
  const stockService = new StockService(stockRepository, productRepository);

  const customerService = new CustomerService(customerRepository);
  const supplierService = new SupplierService(supplierRepository);

  const authService = new AuthService(userRepository);
  const pdfService = new PdfService();
  const excelService = new ExcelService(productRepository);

  // 3. Rutas
  app.get('/health', (req, res) => res.json({ status: 'ok', system: 'ERP Insumos' }));

  // ========== RUTAS DE AUTENTICACIÓN ==========
  const authRouter = createAuthController(authService);
  app.use('/api/auth', authRouter);

  // ========== RUTAS PROTEGIDAS CON RBAC ==========

  // Productos - Todos pueden ver, solo ADMIN y GERENTE pueden modificar
  app.use('/api/products', authenticate, authorize(['ADMIN', 'GERENTE', 'CAJERO']), createProductController(productService));

  // Clientes - Todos pueden ver, solo ADMIN y GERENTE pueden modificar
  app.use('/api/customers', authenticate, authorize(['ADMIN', 'GERENTE', 'CAJERO']), createCustomerController(customerService));

  // Proveedores - Solo ADMIN y GERENTE
  app.use('/api/suppliers', authenticate, authorize(['ADMIN', 'GERENTE']), createSupplierController(supplierService));

  // Ventas - Todos pueden vender
  app.use('/api/sales', authenticate, authorize(['ADMIN', 'GERENTE', 'CAJERO']), createSaleController(saleService));

  // Reportes - Todos pueden ver tickets, solo ADMIN y GERENTE pueden generar reportes Excel
  app.use('/api/reports', authenticate, createReportController(saleService, pdfService, excelService, branchRepository, cashMovementRepository));

  // Compras - Solo ADMIN y GERENTE
  app.use('/api/purchases', authenticate, authorize(['ADMIN', 'GERENTE']), createPurchaseController(purchaseService));

  // Créditos - Todos pueden ver y registrar abonos
  app.use('/api/credits', authenticate, authorize(['ADMIN', 'GERENTE', 'CAJERO']), createCreditController(creditService));

  // Transferencias - Solo ADMIN y GERENTE
  app.use('/api/transfers', authenticate, authorize(['ADMIN', 'GERENTE']), createTransferController(transferService));

  // Caja - Todos pueden consultar, solo ADMIN y GERENTE pueden registrar movimientos manuales
  app.use('/api/cash', authenticate, authorize(['ADMIN', 'GERENTE', 'CAJERO']), createCashController(cashService));

  // Stock - Todos pueden consultar, solo ADMIN y GERENTE pueden ajustar
  app.use('/api/stock', authenticate, authorize(['ADMIN', 'GERENTE', 'CAJERO']), createStockController(stockService));

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return app;
}

// Export the app instance for Vercel serverless compatibility
const app = createApp();
export default app;