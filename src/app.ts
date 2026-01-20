import express, { Express } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Repositories
import { ProductRepositoryImpl } from './infrastructure/memory/repositories/product.repository.impl.js';
import { StockRepositoryImpl } from './infrastructure/memory/repositories/stock.repository.impl.js';
import { CustomerRepositoryImpl } from './infrastructure/memory/repositories/customer.repository.impl.js';
import { SupplierRepositoryImpl } from './infrastructure/memory/repositories/supplier.repository.impl.js';
import { CreditAccountRepositoryImpl, CreditPaymentRepositoryImpl } from './infrastructure/memory/repositories/credit-account.repository.impl.js';
import { SaleRepositoryImpl } from './infrastructure/memory/repositories/sale.repository.impl.js';
import { PurchaseRepositoryImpl } from './infrastructure/memory/repositories/purchase.repository.impl.js';
import { CashMovementRepositoryImpl } from './infrastructure/memory/repositories/cash-movement.repository.impl.js';
import { TransferRepositoryImpl } from './infrastructure/memory/repositories/transfer.repository.impl.js';
import { UserRepositoryImpl } from './infrastructure/memory/repositories/user.repository.impl.js';
import { BranchRepositoryImpl } from './infrastructure/memory/repositories/branch.repository.impl.js';

// Services
import { ProductService } from './application/services/product.service.js';
import { SaleService } from './application/services/sale.service.js';
import { PurchaseService } from './application/services/purchase.service.js';
import { CreditService } from './application/services/credit.service.js';
import { TransferService } from './application/services/transfer.service.js';
import { CashService } from './application/services/cash.service.js';
import { StockService } from './application/services/stock.service.js';
import { AuthService } from './application/services/auth.service.js';
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
import { authenticate, authorize } from './infrastructure/web/middlewares/auth.middleware.js';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 1. Inicializar Repositorios
  const productRepository = new ProductRepositoryImpl();
  const stockRepository = new StockRepositoryImpl();
  const customerRepository = new CustomerRepositoryImpl();
  const supplierRepository = new SupplierRepositoryImpl();
  const creditAccountRepository = new CreditAccountRepositoryImpl();
  const creditPaymentRepository = new CreditPaymentRepositoryImpl();
  const saleRepository = new SaleRepositoryImpl();
  const purchaseRepository = new PurchaseRepositoryImpl();
  const cashMovementRepository = new CashMovementRepositoryImpl();
  const transferRepository = new TransferRepositoryImpl();
  const branchRepository = new BranchRepositoryImpl();
  const userRepository = new UserRepositoryImpl();

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
  const authService = new AuthService(userRepository);
  const pdfService = new PdfService();
  const excelService = new ExcelService(productRepository);

  // 3. Rutas
  app.get('/health', (req, res) => res.json({ status: 'ok', system: 'ERP Insumos' }));

  // ========== RUTAS DE AUTENTICACIÓN ==========
  const authRouter = createAuthController(authService);
  app.use('/api/auth', authRouter);

  // ========== RUTAS PROTEGIDAS CON RBAC ==========

  // Productos - ADMIN y SELLER pueden ver el catálogo
  app.use('/api/products', authenticate, authorize(['ADMIN', 'SELLER']), createProductController(productService));

  // Ventas - ADMIN y SELLER pueden vender
  app.use('/api/sales', authenticate, authorize(['ADMIN', 'SELLER']), createSaleController(saleService));

  // Reportes - Autenticación requerida, autorización granular dentro del controlador
  // SELLER puede: imprimir tickets PDF
  // ADMIN puede: todo (tickets + descargar Excel)
  app.use('/api/reports', authenticate, createReportController(saleService, pdfService, excelService, branchRepository, cashMovementRepository));

  // Compras - Solo ADMIN
  app.use('/api/purchases', authenticate, authorize(['ADMIN']), createPurchaseController(purchaseService));

  // Créditos - Solo ADMIN
  app.use('/api/credits', authenticate, authorize(['ADMIN']), createCreditController(creditService));

  // Transferencias - Solo ADMIN
  app.use('/api/transfers', authenticate, authorize(['ADMIN']), createTransferController(transferService));

  // Caja - ADMIN y SELLER pueden consultar, solo ADMIN puede registrar movimientos manuales
  app.use('/api/cash', authenticate, authorize(['ADMIN', 'SELLER']), createCashController(cashService));

  // Stock - ADMIN y SELLER pueden consultar, solo ADMIN puede ajustar
  app.use('/api/stock', authenticate, authorize(['ADMIN', 'SELLER']), createStockController(stockService));

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return app;
}