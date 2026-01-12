import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Repositories
import { ProductRepositoryImpl } from './infrastructure/memory/repositories/product.repository.impl.js';
import { StockRepositoryImpl } from './infrastructure/memory/repositories/stock.repository.impl.js';
import { CustomerRepositoryImpl } from './infrastructure/memory/repositories/customer.repository.impl.js';
import { CreditAccountRepositoryImpl, CreditPaymentRepositoryImpl } from './infrastructure/memory/repositories/credit-account.repository.impl.js';
import { SaleRepositoryImpl } from './infrastructure/memory/repositories/sale.repository.impl.js';
import { PurchaseRepositoryImpl } from './infrastructure/memory/repositories/purchase.repository.impl.js';
import { CashMovementRepositoryImpl } from './infrastructure/memory/repositories/cash-movement.repository.impl.js';
import { TransferRepositoryImpl } from './infrastructure/memory/repositories/transfer.repository.impl.js';

// Services
import { ProductService } from './application/services/product.service.js';
import { SaleService } from './application/services/sale.service.js';
import { PurchaseService } from './application/services/purchase.service.js';
import { CreditService } from './application/services/credit.service.js';
import { TransferService } from './application/services/transfer.service.js';

// Controllers
import { createProductController } from './api/controllers/product.controller.js';

export function createApp(): Express {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Initialize repositories
  const productRepository = new ProductRepositoryImpl();
  const stockRepository = new StockRepositoryImpl();
  const customerRepository = new CustomerRepositoryImpl();
  const creditAccountRepository = new CreditAccountRepositoryImpl();
  const creditPaymentRepository = new CreditPaymentRepositoryImpl();
  const saleRepository = new SaleRepositoryImpl();
  const purchaseRepository = new PurchaseRepositoryImpl();
  const cashMovementRepository = new CashMovementRepositoryImpl();
  const transferRepository = new TransferRepositoryImpl();

  // Initialize services
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
    {} as any, // supplierRepository - to be implemented
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
    {} as any, // branchRepository - to be implemented
    productRepository
  );

  // API Routes
  app.use('/api/products', createProductController(productService));

  // TODO: Add more controllers
  // app.use('/api/sales', createSaleController(saleService));
  // app.use('/api/purchases', createPurchaseController(purchaseService));
  // app.use('/api/credit', createCreditController(creditService));
  // app.use('/api/transfers', createTransferController(transferService));

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ERP Insumos API Docs'
  }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ERP Insumos API'
    });
  });

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'ERP Insumos API - Sucursales Diriamba y Jinotepe',
      version: '1.0.0',
      documentation: '/api-docs',
      health: '/health'
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}