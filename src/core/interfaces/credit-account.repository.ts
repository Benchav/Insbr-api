import {
    CreditAccount,
    CreditPayment,
    CreateCreditAccountDto,
    CreateCreditPaymentDto,
    CreditAccountType,
    CreditAccountStatus
} from '../entities/credit-account.entity.js';

export interface ICreditAccountRepository {
    create(data: CreateCreditAccountDto): Promise<CreditAccount>;
    findById(id: string): Promise<CreditAccount | null>;
    findByBranch(branchId: string, filters?: {
        type?: CreditAccountType;
        status?: CreditAccountStatus;
    }): Promise<CreditAccount[]>;
    findBySupplier(supplierId: string): Promise<CreditAccount[]>;
    findByCustomer(customerId: string): Promise<CreditAccount[]>;
    update(id: string, data: Partial<CreditAccount>): Promise<CreditAccount>;
    delete(id: string): Promise<void>;
}

export interface ICreditPaymentRepository {
    create(data: CreateCreditPaymentDto): Promise<CreditPayment>;
    findById(id: string): Promise<CreditPayment | null>;
    findByCreditAccount(creditAccountId: string): Promise<CreditPayment[]>;
    delete(id: string): Promise<void>;
}
