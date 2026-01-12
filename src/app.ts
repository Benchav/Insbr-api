import express, { Express } from 'express';
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
import { storage } from './infrastructure/memory/storage.js';

// Services
import { ProductService } from './application/services/product.service.js';
import { SaleService } from './application/services/sale.service.js';
import { PurchaseService } from './application/services/purchase.service.js';
import { CreditService } from './application/services/credit.service.js';
import { TransferService } from './application/services/transfer.service.js';

// Controllers & Middleware
import { createProductController } from './api/controllers/product.controller.js';
import { createSaleController } from './api/controllers/sale.controller.js';
import { createTransferController } from './api/controllers/transfer.controller.js';
import { loginController } from './infrastructure/web/middlewares/auth.middleware.js';

// Mock de BranchRepo para TransferService
class BranchRepoMock {
  async findById(id: string) { return storage.branches.get(id) || null; }
}

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Inicializar Repositorios
  const productRepository = new ProductRepositoryImpl();
  const stockRepository = new StockRepositoryImpl();
  const customerRepository = new CustomerRepositoryImpl();
  const creditAccountRepository = new CreditAccountRepositoryImpl();
  const creditPaymentRepository = new CreditPaymentRepositoryImpl();
  const saleRepository = new SaleRepositoryImpl();
  const purchaseRepository = new PurchaseRepositoryImpl();
  const cashMovementRepository = new CashMovementRepositoryImpl();
  const transferRepository = new TransferRepositoryImpl();
  const branchRepository = new BranchRepoMock();

  // Inicializar Servicios
  const productService = new ProductService(productRepository);
  const saleService = new SaleService(
    saleRepository,
    stockRepository,
    customerRepository,
    creditAccountRepository,
    cashMovementRepository,
    productRepository
  );
  const transferService = new TransferService(
    transferRepository,
    stockRepository,
    branchRepository as any,
    productRepository
  );

  // Rutas
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/login', loginController);

  app.use('/api/products', createProductController(productService));
  app.use('/api/sales', createSaleController(saleService));
  app.use('/api/transfers', createTransferController(transferService));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return app;
}