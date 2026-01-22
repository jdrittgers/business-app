// Loan Tracking Types

// Enums
export enum PaymentFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL'
}

export enum LoanTransactionType {
  DRAW = 'DRAW',
  PAYMENT = 'PAYMENT',
  INTEREST_ACCRUAL = 'INTEREST_ACCRUAL',
  ADJUSTMENT = 'ADJUSTMENT'
}

// Land Parcel Types
export interface LandParcel {
  id: string;
  businessId: string;
  name: string;
  totalAcres: number;
  legalDescription?: string;
  county?: string;
  state?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed/included fields
  totalLoanBalance?: number;
  annualInterestExpense?: number;
  farms?: Array<{ id: string; name: string; year: number; acres: number; commodityType: string }>;
  landLoans?: LandLoan[];
}

export interface CreateLandParcelRequest {
  name: string;
  totalAcres: number;
  legalDescription?: string;
  county?: string;
  state?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
}

export interface UpdateLandParcelRequest {
  name?: string;
  totalAcres?: number;
  legalDescription?: string;
  county?: string;
  state?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
  isActive?: boolean;
}

// Land Loan Types
export interface LandLoan {
  id: string;
  landParcelId: string;
  lender: string;
  loanNumber?: string;
  useSimpleMode: boolean;
  // Full amortization fields
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: Date;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  // Simple mode field
  annualPayment?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  annualInterestExpense?: number;
  landParcel?: LandParcel;
  payments?: LandLoanPayment[];
}

export interface CreateLandLoanRequest {
  lender: string;
  loanNumber?: string;
  useSimpleMode: boolean;
  // Full amortization (required if useSimpleMode = false)
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  // Simple mode (required if useSimpleMode = true)
  annualPayment?: number;
  notes?: string;
}

export interface UpdateLandLoanRequest {
  lender?: string;
  loanNumber?: string;
  useSimpleMode?: boolean;
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  annualPayment?: number;
  notes?: string;
  isActive?: boolean;
}

// Land Loan Payment Types
export interface LandLoanPayment {
  id: string;
  landLoanId: string;
  paymentDate: Date;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  notes?: string;
  createdAt: Date;
}

export interface CreateLandLoanPaymentRequest {
  paymentDate: string;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  notes?: string;
}

// Operating Loan Types
export interface OperatingLoan {
  id: string;
  grainEntityId: string;
  grainEntityName?: string;
  lender: string;
  loanNumber?: string;
  creditLimit: number;
  interestRate: number;
  currentBalance: number;
  year: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  availableCredit?: number;
  ytdInterestExpense?: number;
  transactions?: OperatingLoanTransaction[];
}

export interface CreateOperatingLoanRequest {
  lender: string;
  loanNumber?: string;
  creditLimit: number;
  interestRate: number;
  currentBalance?: number;
  year: number;
  notes?: string;
}

export interface UpdateOperatingLoanRequest {
  lender?: string;
  loanNumber?: string;
  creditLimit?: number;
  interestRate?: number;
  notes?: string;
  isActive?: boolean;
}

// Operating Loan Transaction Types
export interface OperatingLoanTransaction {
  id: string;
  operatingLoanId: string;
  type: LoanTransactionType;
  amount: number;
  balanceAfter: number;
  transactionDate: Date;
  description?: string;
  createdBy: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateOperatingLoanTransactionRequest {
  type: LoanTransactionType;
  amount: number;
  transactionDate: string;
  description?: string;
}

// Query Types
export interface GetLandParcelsQuery {
  isActive?: boolean;
}

export interface GetOperatingLoansQuery {
  grainEntityId?: string;
  year?: number;
  isActive?: boolean;
}

// Loan Summary Types (for break-even integration)
export interface LoanInterestSummary {
  // Land loan interest by parcel
  landLoanInterest: Array<{
    landParcelId: string;
    landParcelName: string;
    totalAcres: number;
    annualInterest: number;
    interestPerAcre: number;
  }>;
  // Operating loan interest by entity
  operatingLoanInterest: Array<{
    grainEntityId: string;
    grainEntityName: string;
    ytdInterest: number;
  }>;
  // Totals
  totalLandLoanInterest: number;
  totalOperatingLoanInterest: number;
  totalInterestExpense: number;
}

// Farm Interest Allocation (for break-even)
export interface FarmInterestAllocation {
  farmId: string;
  landLoanInterest: number;
  operatingLoanInterest: number;
  totalInterest: number;
}
