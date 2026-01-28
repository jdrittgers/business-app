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

export enum EquipmentType {
  TRACTOR = 'TRACTOR',
  COMBINE = 'COMBINE',
  PLANTER = 'PLANTER',
  SPRAYER = 'SPRAYER',
  GRAIN_CART = 'GRAIN_CART',
  SEMI_TRUCK = 'SEMI_TRUCK',
  TRAILER = 'TRAILER',
  TILLAGE = 'TILLAGE',
  OTHER = 'OTHER'
}

export enum EquipmentFinancingType {
  LOAN = 'LOAN',
  LEASE = 'LEASE'
}

// Entity Split Types (for shared ownership across entities)
export interface EntitySplit {
  id: string;
  grainEntityId: string;
  grainEntityName?: string;
  percentage: number; // 0-100
}

export interface CreateEntitySplitRequest {
  grainEntityId: string;
  percentage: number;
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
  entitySplits?: EntitySplit[];
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
  entitySplits?: CreateEntitySplitRequest[];
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
  entitySplits?: CreateEntitySplitRequest[];
}

// Land Loan Types
export interface LandLoan {
  id: string;
  landParcelId: string;
  lender: string;
  loanNumber?: string;
  // Entity/Farm linking (for attributing loan costs to specific entity/farm)
  grainEntityId?: string;
  grainEntityName?: string;
  farmId?: string;
  farmName?: string;
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
  // Payment scheduling
  nextPaymentDate?: Date;
  paymentReminderSent?: boolean;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  annualInterestExpense?: number;
  annualPrincipalExpense?: number;
  landParcel?: LandParcel;
  payments?: LandLoanPayment[];
  entitySplits?: EntitySplit[];
}

export interface CreateLandLoanRequest {
  lender: string;
  loanNumber?: string;
  // Entity/Farm linking
  grainEntityId?: string;
  farmId?: string;
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
  // Payment scheduling
  nextPaymentDate?: string;
  notes?: string;
  // Entity splits (optional - for splitting loan costs across entities)
  entitySplits?: CreateEntitySplitRequest[];
}

export interface UpdateLandLoanRequest {
  lender?: string;
  loanNumber?: string;
  // Entity/Farm linking
  grainEntityId?: string;
  farmId?: string;
  useSimpleMode?: boolean;
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  annualPayment?: number;
  nextPaymentDate?: string;
  notes?: string;
  isActive?: boolean;
  // Entity splits (optional - for splitting loan costs across entities)
  entitySplits?: CreateEntitySplitRequest[];
}

// Land Loan Payment Types
export interface LandLoanPayment {
  id: string;
  landLoanId: string;
  paymentDate: Date;
  totalAmount: number;
  principalAmount?: number;  // Optional - for when breakdown is unknown
  interestAmount?: number;   // Optional - for when breakdown is unknown
  notes?: string;
  createdAt: Date;
}

export interface CreateLandLoanPaymentRequest {
  paymentDate: string;
  totalAmount: number;
  principalAmount?: number;  // Optional - leave blank if unknown
  interestAmount?: number;   // Optional - leave blank if unknown
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

// Farm Loan Cost Allocation (for break-even)
export interface FarmInterestAllocation {
  farmId: string;
  // Land loan costs (full cost goes to associated farm)
  landLoanInterest: number;
  landLoanPrincipal: number;
  // Operating loan interest (allocated by farm acres)
  operatingLoanInterest: number;
  // Equipment loan costs (distributed across all acres if enabled)
  equipmentLoanInterest: number;
  equipmentLoanPrincipal: number;
  // Totals
  totalInterest: number;
  totalPrincipal: number;
  totalLoanCost: number;
}

// ===== Equipment Types =====

export interface Equipment {
  id: string;
  businessId: string;
  name: string;
  equipmentType: EquipmentType;
  year?: number;
  make?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  currentValue?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // John Deere Integration
  johnDeereMachineId?: string;
  currentEngineHours?: number;
  lastHoursSyncAt?: Date;
  // Computed/included fields
  totalLoanBalance?: number;
  annualInterestExpense?: number;
  annualPrincipalExpense?: number;
  equipmentLoans?: EquipmentLoan[];
  entitySplits?: EntitySplit[];
}

export interface CreateEquipmentRequest {
  name: string;
  equipmentType: EquipmentType;
  year?: number;
  make?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  notes?: string;
  entitySplits?: CreateEntitySplitRequest[];
}

export interface UpdateEquipmentRequest {
  name?: string;
  equipmentType?: EquipmentType;
  year?: number;
  make?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  notes?: string;
  isActive?: boolean;
  entitySplits?: CreateEntitySplitRequest[];
}

// Equipment Loan Types
export interface EquipmentLoan {
  id: string;
  equipmentId: string;
  lender: string;
  loanNumber?: string;
  financingType: EquipmentFinancingType;
  useSimpleMode: boolean;
  // Full amortization fields (for loans)
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: Date;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  // Simple mode / Lease fields
  annualPayment?: number;
  // Lease-specific fields
  leaseEndDate?: Date;
  residualValue?: number;
  // Down payment tracking
  downPayment?: number;
  downPaymentDate?: Date;
  // Annual expense tracking (can be manually overridden)
  annualInterestOverride?: number;
  annualPrincipalOverride?: number;
  // Payment scheduling
  nextPaymentDate?: Date;
  paymentReminderSent?: boolean;
  // Break-even distribution
  includeInBreakeven?: boolean;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  annualInterestExpense?: number;
  calculatedAnnualInterest?: number;
  calculatedAnnualPrincipal?: number;
  equipment?: Equipment;
  payments?: EquipmentLoanPayment[];
}

export interface CreateEquipmentLoanRequest {
  lender: string;
  loanNumber?: string;
  financingType: EquipmentFinancingType;
  useSimpleMode: boolean;
  // Full amortization (for loans)
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  // Simple mode / Lease
  annualPayment?: number;
  // Lease-specific
  leaseEndDate?: string;
  residualValue?: number;
  // Down payment
  downPayment?: number;
  downPaymentDate?: string;
  // Payment scheduling
  nextPaymentDate?: string;
  // Break-even
  includeInBreakeven?: boolean;
  notes?: string;
}

export interface UpdateEquipmentLoanRequest {
  lender?: string;
  loanNumber?: string;
  financingType?: EquipmentFinancingType;
  useSimpleMode?: boolean;
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  remainingBalance?: number;
  annualPayment?: number;
  leaseEndDate?: string;
  residualValue?: number;
  // Down payment
  downPayment?: number;
  downPaymentDate?: string;
  // Annual expense overrides
  annualInterestOverride?: number;
  annualPrincipalOverride?: number;
  // Payment scheduling
  nextPaymentDate?: string;
  // Break-even
  includeInBreakeven?: boolean;
  notes?: string;
  isActive?: boolean;
}

// Equipment Loan Payment Types
export interface EquipmentLoanPayment {
  id: string;
  equipmentLoanId: string;
  paymentDate: Date;
  totalAmount: number;
  principalAmount?: number;  // Optional - for when breakdown is unknown
  interestAmount?: number;   // Optional - for when breakdown is unknown
  notes?: string;
  createdAt: Date;
}

export interface CreateEquipmentLoanPaymentRequest {
  paymentDate: string;
  totalAmount: number;
  principalAmount?: number;  // Optional - leave blank if unknown
  interestAmount?: number;   // Optional - leave blank if unknown
  notes?: string;
}
