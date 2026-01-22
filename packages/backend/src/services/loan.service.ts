import { prisma } from '../prisma/client';
import {
  LandParcel,
  CreateLandParcelRequest,
  UpdateLandParcelRequest,
  LandLoan,
  CreateLandLoanRequest,
  UpdateLandLoanRequest,
  LandLoanPayment,
  CreateLandLoanPaymentRequest,
  OperatingLoan,
  CreateOperatingLoanRequest,
  UpdateOperatingLoanRequest,
  OperatingLoanTransaction,
  CreateOperatingLoanTransactionRequest,
  LoanTransactionType,
  PaymentFrequency,
  LoanInterestSummary,
  FarmInterestAllocation,
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentLoan,
  CreateEquipmentLoanRequest,
  UpdateEquipmentLoanRequest,
  EquipmentLoanPayment,
  CreateEquipmentLoanPaymentRequest,
  EquipmentType,
  EquipmentFinancingType
} from '@business-app/shared';

// ===== Land Parcel Service =====

export class LandParcelService {
  async getAll(businessId: string, query?: { isActive?: boolean }): Promise<LandParcel[]> {
    const parcels = await prisma.landParcel.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(query?.isActive !== undefined && { isActive: query.isActive })
      },
      include: {
        farms: {
          select: { id: true, name: true, year: true, acres: true, commodityType: true }
        },
        landLoans: {
          where: { deletedAt: null, isActive: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return parcels.map(p => this.mapParcel(p));
  }

  async getById(id: string, businessId: string): Promise<LandParcel | null> {
    const parcel = await prisma.landParcel.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        farms: {
          select: { id: true, name: true, year: true, acres: true, commodityType: true },
          orderBy: [{ year: 'desc' }, { name: 'asc' }]
        },
        landLoans: {
          where: { deletedAt: null },
          include: {
            payments: { orderBy: { paymentDate: 'desc' }, take: 10 }
          }
        }
      }
    });

    if (!parcel) return null;
    return this.mapParcel(parcel);
  }

  async create(businessId: string, data: CreateLandParcelRequest): Promise<LandParcel> {
    const parcel = await prisma.landParcel.create({
      data: {
        businessId,
        name: data.name,
        totalAcres: data.totalAcres,
        legalDescription: data.legalDescription,
        county: data.county,
        state: data.state,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        notes: data.notes
      },
      include: {
        farms: { select: { id: true, name: true, year: true, acres: true, commodityType: true } },
        landLoans: { where: { deletedAt: null } }
      }
    });

    return this.mapParcel(parcel);
  }

  async update(id: string, businessId: string, data: UpdateLandParcelRequest): Promise<LandParcel> {
    const parcel = await prisma.landParcel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.totalAcres !== undefined && { totalAcres: data.totalAcres }),
        ...(data.legalDescription !== undefined && { legalDescription: data.legalDescription }),
        ...(data.county !== undefined && { county: data.county }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        farms: { select: { id: true, name: true, year: true, acres: true, commodityType: true } },
        landLoans: { where: { deletedAt: null } }
      }
    });

    return this.mapParcel(parcel);
  }

  async delete(id: string, businessId: string): Promise<void> {
    await prisma.landParcel.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  private mapParcel(parcel: any): LandParcel {
    const loans = parcel.landLoans || [];
    const totalLoanBalance = loans.reduce((sum: number, l: any) =>
      sum + Number(l.remainingBalance || 0), 0);
    const annualInterestExpense = loans.reduce((sum: number, l: any) =>
      sum + this.calculateLoanAnnualInterest(l), 0);

    return {
      id: parcel.id,
      businessId: parcel.businessId,
      name: parcel.name,
      totalAcres: Number(parcel.totalAcres),
      legalDescription: parcel.legalDescription || undefined,
      county: parcel.county || undefined,
      state: parcel.state || undefined,
      purchaseDate: parcel.purchaseDate || undefined,
      purchasePrice: parcel.purchasePrice ? Number(parcel.purchasePrice) : undefined,
      notes: parcel.notes || undefined,
      isActive: parcel.isActive,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
      totalLoanBalance,
      annualInterestExpense,
      farms: parcel.farms?.map((f: any) => ({
        id: f.id,
        name: f.name,
        year: f.year,
        acres: Number(f.acres),
        commodityType: f.commodityType
      })),
      landLoans: loans.map((l: any) => this.mapLandLoan(l))
    };
  }

  private calculateLoanAnnualInterest(loan: any): number {
    if (loan.useSimpleMode) {
      // Simple mode: estimate 40% of annual payment is interest
      return Number(loan.annualPayment || 0) * 0.4;
    }
    // Full amortization: remaining balance × interest rate
    return Number(loan.remainingBalance || 0) * Number(loan.interestRate || 0);
  }

  private mapLandLoan(loan: any): LandLoan {
    return {
      id: loan.id,
      landParcelId: loan.landParcelId,
      lender: loan.lender,
      loanNumber: loan.loanNumber || undefined,
      useSimpleMode: loan.useSimpleMode,
      principal: loan.principal ? Number(loan.principal) : undefined,
      interestRate: loan.interestRate ? Number(loan.interestRate) : undefined,
      termMonths: loan.termMonths || undefined,
      startDate: loan.startDate || undefined,
      paymentFrequency: loan.paymentFrequency as PaymentFrequency || undefined,
      monthlyPayment: loan.monthlyPayment ? Number(loan.monthlyPayment) : undefined,
      remainingBalance: loan.remainingBalance ? Number(loan.remainingBalance) : undefined,
      annualPayment: loan.annualPayment ? Number(loan.annualPayment) : undefined,
      notes: loan.notes || undefined,
      isActive: loan.isActive,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      annualInterestExpense: this.calculateLoanAnnualInterest(loan),
      payments: loan.payments?.map((p: any) => ({
        id: p.id,
        landLoanId: p.landLoanId,
        paymentDate: p.paymentDate,
        totalAmount: Number(p.totalAmount),
        principalAmount: Number(p.principalAmount),
        interestAmount: Number(p.interestAmount),
        notes: p.notes || undefined,
        createdAt: p.createdAt
      }))
    };
  }
}

// ===== Land Loan Service =====

export class LandLoanService {
  async getByParcel(parcelId: string): Promise<LandLoan[]> {
    const loans = await prisma.landLoan.findMany({
      where: { landParcelId: parcelId, deletedAt: null },
      include: {
        payments: { orderBy: { paymentDate: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return loans.map(l => this.mapLoan(l));
  }

  async getById(id: string): Promise<LandLoan | null> {
    const loan = await prisma.landLoan.findFirst({
      where: { id, deletedAt: null },
      include: {
        landParcel: true,
        payments: { orderBy: { paymentDate: 'desc' } }
      }
    });

    if (!loan) return null;
    return this.mapLoan(loan);
  }

  async create(parcelId: string, data: CreateLandLoanRequest): Promise<LandLoan> {
    const loan = await prisma.landLoan.create({
      data: {
        landParcelId: parcelId,
        lender: data.lender,
        loanNumber: data.loanNumber,
        useSimpleMode: data.useSimpleMode,
        principal: data.principal,
        interestRate: data.interestRate,
        termMonths: data.termMonths,
        startDate: data.startDate ? new Date(data.startDate) : null,
        paymentFrequency: data.paymentFrequency,
        monthlyPayment: data.monthlyPayment,
        remainingBalance: data.remainingBalance ?? data.principal,
        annualPayment: data.annualPayment,
        nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : null,
        notes: data.notes
      },
      include: { payments: true }
    });

    return this.mapLoan(loan);
  }

  async update(id: string, data: UpdateLandLoanRequest): Promise<LandLoan> {
    // If nextPaymentDate is being changed, reset the reminder flag
    const resetReminder = data.nextPaymentDate !== undefined;

    const loan = await prisma.landLoan.update({
      where: { id },
      data: {
        ...(data.lender !== undefined && { lender: data.lender }),
        ...(data.loanNumber !== undefined && { loanNumber: data.loanNumber }),
        ...(data.useSimpleMode !== undefined && { useSimpleMode: data.useSimpleMode }),
        ...(data.principal !== undefined && { principal: data.principal }),
        ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
        ...(data.termMonths !== undefined && { termMonths: data.termMonths }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.paymentFrequency !== undefined && { paymentFrequency: data.paymentFrequency }),
        ...(data.monthlyPayment !== undefined && { monthlyPayment: data.monthlyPayment }),
        ...(data.remainingBalance !== undefined && { remainingBalance: data.remainingBalance }),
        ...(data.annualPayment !== undefined && { annualPayment: data.annualPayment }),
        ...(data.nextPaymentDate !== undefined && { nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : null }),
        ...(resetReminder && { paymentReminderSent: false }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: { payments: true }
    });

    return this.mapLoan(loan);
  }

  async delete(id: string): Promise<void> {
    await prisma.landLoan.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async recordPayment(loanId: string, data: CreateLandLoanPaymentRequest): Promise<LandLoanPayment> {
    // Create payment and update remaining balance
    const [payment, _] = await prisma.$transaction([
      prisma.landLoanPayment.create({
        data: {
          landLoanId: loanId,
          paymentDate: new Date(data.paymentDate),
          totalAmount: data.totalAmount,
          principalAmount: data.principalAmount,
          interestAmount: data.interestAmount,
          notes: data.notes
        }
      }),
      prisma.landLoan.update({
        where: { id: loanId },
        data: {
          remainingBalance: {
            decrement: data.principalAmount
          }
        }
      })
    ]);

    return {
      id: payment.id,
      landLoanId: payment.landLoanId,
      paymentDate: payment.paymentDate,
      totalAmount: Number(payment.totalAmount),
      principalAmount: Number(payment.principalAmount),
      interestAmount: Number(payment.interestAmount),
      notes: payment.notes || undefined,
      createdAt: payment.createdAt
    };
  }

  private calculateAnnualInterest(loan: any): number {
    if (loan.useSimpleMode) {
      // Simple mode: estimate 40% of annual payment is interest
      return Number(loan.annualPayment || 0) * 0.4;
    }
    // Full amortization: remaining balance × interest rate
    return Number(loan.remainingBalance || 0) * Number(loan.interestRate || 0);
  }

  private calculateAnnualPrincipal(loan: any): number {
    if (loan.useSimpleMode) {
      // Simple mode: estimate 60% of annual payment is principal
      return Number(loan.annualPayment || 0) * 0.6;
    }
    // Full amortization: annual payment - annual interest
    const monthlyPayment = Number(loan.monthlyPayment || 0);
    const annualPayment = monthlyPayment * 12;
    const annualInterest = this.calculateAnnualInterest(loan);
    return Math.max(0, annualPayment - annualInterest);
  }

  private mapLoan(loan: any): LandLoan {
    const annualInterest = this.calculateAnnualInterest(loan);
    const annualPrincipal = this.calculateAnnualPrincipal(loan);

    return {
      id: loan.id,
      landParcelId: loan.landParcelId,
      lender: loan.lender,
      loanNumber: loan.loanNumber || undefined,
      useSimpleMode: loan.useSimpleMode,
      principal: loan.principal ? Number(loan.principal) : undefined,
      interestRate: loan.interestRate ? Number(loan.interestRate) : undefined,
      termMonths: loan.termMonths || undefined,
      startDate: loan.startDate || undefined,
      paymentFrequency: loan.paymentFrequency as PaymentFrequency || undefined,
      monthlyPayment: loan.monthlyPayment ? Number(loan.monthlyPayment) : undefined,
      remainingBalance: loan.remainingBalance ? Number(loan.remainingBalance) : undefined,
      annualPayment: loan.annualPayment ? Number(loan.annualPayment) : undefined,
      // New payment scheduling fields
      nextPaymentDate: loan.nextPaymentDate || undefined,
      paymentReminderSent: loan.paymentReminderSent,
      notes: loan.notes || undefined,
      isActive: loan.isActive,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      annualInterestExpense: annualInterest,
      annualPrincipalExpense: annualPrincipal,
      landParcel: loan.landParcel ? {
        id: loan.landParcel.id,
        businessId: loan.landParcel.businessId,
        name: loan.landParcel.name,
        totalAcres: Number(loan.landParcel.totalAcres),
        isActive: loan.landParcel.isActive,
        createdAt: loan.landParcel.createdAt,
        updatedAt: loan.landParcel.updatedAt
      } : undefined,
      payments: loan.payments?.map((p: any) => ({
        id: p.id,
        landLoanId: p.landLoanId,
        paymentDate: p.paymentDate,
        totalAmount: Number(p.totalAmount),
        principalAmount: Number(p.principalAmount),
        interestAmount: Number(p.interestAmount),
        notes: p.notes || undefined,
        createdAt: p.createdAt
      }))
    };
  }
}

// ===== Operating Loan Service =====

export class OperatingLoanService {
  async getAll(businessId: string, query?: { grainEntityId?: string; year?: number; isActive?: boolean }): Promise<OperatingLoan[]> {
    const loans = await prisma.operatingLoan.findMany({
      where: {
        grainEntity: { businessId },
        deletedAt: null,
        ...(query?.grainEntityId && { grainEntityId: query.grainEntityId }),
        ...(query?.year && { year: query.year }),
        ...(query?.isActive !== undefined && { isActive: query.isActive })
      },
      include: {
        grainEntity: { select: { name: true } },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 10
        }
      },
      orderBy: [{ year: 'desc' }, { grainEntity: { name: 'asc' } }]
    });

    return loans.map(l => this.mapLoan(l));
  }

  async getByEntity(grainEntityId: string, year?: number): Promise<OperatingLoan[]> {
    const loans = await prisma.operatingLoan.findMany({
      where: {
        grainEntityId,
        deletedAt: null,
        ...(year && { year })
      },
      include: {
        grainEntity: { select: { name: true } },
        transactions: { orderBy: { transactionDate: 'desc' } }
      },
      orderBy: { year: 'desc' }
    });

    return loans.map(l => this.mapLoan(l));
  }

  async getById(id: string): Promise<OperatingLoan | null> {
    const loan = await prisma.operatingLoan.findFirst({
      where: { id, deletedAt: null },
      include: {
        grainEntity: { select: { name: true } },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!loan) return null;
    return this.mapLoan(loan);
  }

  async create(grainEntityId: string, data: CreateOperatingLoanRequest): Promise<OperatingLoan> {
    const loan = await prisma.operatingLoan.create({
      data: {
        grainEntityId,
        lender: data.lender,
        loanNumber: data.loanNumber,
        creditLimit: data.creditLimit,
        interestRate: data.interestRate,
        currentBalance: data.currentBalance || 0,
        year: data.year,
        notes: data.notes
      },
      include: {
        grainEntity: { select: { name: true } },
        transactions: true
      }
    });

    return this.mapLoan(loan);
  }

  async update(id: string, data: UpdateOperatingLoanRequest): Promise<OperatingLoan> {
    const loan = await prisma.operatingLoan.update({
      where: { id },
      data: {
        ...(data.lender !== undefined && { lender: data.lender }),
        ...(data.loanNumber !== undefined && { loanNumber: data.loanNumber }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        grainEntity: { select: { name: true } },
        transactions: { orderBy: { transactionDate: 'desc' } }
      }
    });

    return this.mapLoan(loan);
  }

  async delete(id: string): Promise<void> {
    await prisma.operatingLoan.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async recordDraw(loanId: string, userId: string, amount: number, date: Date, description?: string): Promise<OperatingLoanTransaction> {
    const loan = await prisma.operatingLoan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('Loan not found');

    const newBalance = Number(loan.currentBalance) + amount;

    const [transaction, _] = await prisma.$transaction([
      prisma.operatingLoanTransaction.create({
        data: {
          operatingLoanId: loanId,
          type: LoanTransactionType.DRAW,
          amount,
          balanceAfter: newBalance,
          transactionDate: date,
          description,
          createdBy: userId
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } }
        }
      }),
      prisma.operatingLoan.update({
        where: { id: loanId },
        data: { currentBalance: newBalance }
      })
    ]);

    return this.mapTransaction(transaction);
  }

  async recordPayment(loanId: string, userId: string, amount: number, date: Date, description?: string): Promise<OperatingLoanTransaction> {
    const loan = await prisma.operatingLoan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('Loan not found');

    const newBalance = Math.max(0, Number(loan.currentBalance) - amount);

    const [transaction, _] = await prisma.$transaction([
      prisma.operatingLoanTransaction.create({
        data: {
          operatingLoanId: loanId,
          type: LoanTransactionType.PAYMENT,
          amount,
          balanceAfter: newBalance,
          transactionDate: date,
          description,
          createdBy: userId
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } }
        }
      }),
      prisma.operatingLoan.update({
        where: { id: loanId },
        data: { currentBalance: newBalance }
      })
    ]);

    return this.mapTransaction(transaction);
  }

  // Calculate YTD interest based on average balance
  calculateYTDInterest(loan: OperatingLoan): number {
    // Simplified: current balance × rate × (months elapsed / 12)
    const rate = loan.interestRate;
    const balance = loan.currentBalance;
    const now = new Date();
    const startOfYear = new Date(loan.year, 0, 1);
    const monthsElapsed = Math.max(1, (now.getMonth() - startOfYear.getMonth()) + 1);

    return balance * rate * (monthsElapsed / 12);
  }

  private mapLoan(loan: any): OperatingLoan {
    const mappedLoan: OperatingLoan = {
      id: loan.id,
      grainEntityId: loan.grainEntityId,
      grainEntityName: loan.grainEntity?.name,
      lender: loan.lender,
      loanNumber: loan.loanNumber || undefined,
      creditLimit: Number(loan.creditLimit),
      interestRate: Number(loan.interestRate),
      currentBalance: Number(loan.currentBalance),
      year: loan.year,
      notes: loan.notes || undefined,
      isActive: loan.isActive,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      availableCredit: Number(loan.creditLimit) - Number(loan.currentBalance),
      transactions: loan.transactions?.map((t: any) => this.mapTransaction(t))
    };

    mappedLoan.ytdInterestExpense = this.calculateYTDInterest(mappedLoan);
    return mappedLoan;
  }

  private mapTransaction(t: any): OperatingLoanTransaction {
    return {
      id: t.id,
      operatingLoanId: t.operatingLoanId,
      type: t.type as LoanTransactionType,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      transactionDate: t.transactionDate,
      description: t.description || undefined,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      user: t.user ? {
        id: t.user.id,
        firstName: t.user.firstName,
        lastName: t.user.lastName
      } : undefined
    };
  }
}

// ===== Loan Interest Service (for break-even integration) =====

export class LoanInterestService {
  private landParcelService = new LandParcelService();
  private operatingLoanService = new OperatingLoanService();

  private calculateLandLoanAnnualInterest(loan: any): number {
    if (loan.useSimpleMode) {
      return Number(loan.annualPayment || 0) * 0.4;
    }
    return Number(loan.remainingBalance || 0) * Number(loan.interestRate || 0);
  }

  private calculateLandLoanAnnualPrincipal(loan: any): number {
    if (loan.useSimpleMode) {
      return Number(loan.annualPayment || 0) * 0.6;
    }
    const monthlyPayment = Number(loan.monthlyPayment || 0);
    const annualPayment = monthlyPayment * 12;
    const annualInterest = this.calculateLandLoanAnnualInterest(loan);
    return Math.max(0, annualPayment - annualInterest);
  }

  async getFarmInterestAllocation(farmId: string, year: number): Promise<FarmInterestAllocation> {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        landParcel: {
          include: { landLoans: { where: { isActive: true, deletedAt: null } } }
        },
        grainEntity: {
          include: {
            operatingLoans: { where: { year, isActive: true, deletedAt: null } },
            business: { select: { id: true } }
          }
        }
      }
    });

    if (!farm) {
      return {
        farmId,
        landLoanInterest: 0,
        landLoanPrincipal: 0,
        operatingLoanInterest: 0,
        equipmentLoanInterest: 0,
        equipmentLoanPrincipal: 0,
        totalInterest: 0,
        totalPrincipal: 0,
        totalLoanCost: 0
      };
    }

    // Calculate land loan costs - farm absorbs 100% of associated parcel's loan costs
    let landLoanInterest = 0;
    let landLoanPrincipal = 0;
    if (farm.landParcel && farm.landParcel.landLoans.length > 0) {
      // Full cost goes to this farm (1:1 relationship)
      landLoanInterest = farm.landParcel.landLoans.reduce((sum, loan) => {
        return sum + this.calculateLandLoanAnnualInterest(loan);
      }, 0);
      landLoanPrincipal = farm.landParcel.landLoans.reduce((sum, loan) => {
        return sum + this.calculateLandLoanAnnualPrincipal(loan);
      }, 0);
    }

    // Calculate operating loan interest allocated to this farm by acreage
    let operatingLoanInterest = 0;
    if (farm.grainEntity.operatingLoans.length > 0) {
      // Get total acres for this entity in this year
      const entityFarms = await prisma.farm.findMany({
        where: { grainEntityId: farm.grainEntityId, year, deletedAt: null }
      });
      const totalEntityAcres = entityFarms.reduce((sum, f) => sum + Number(f.acres), 0);

      // Calculate total entity operating interest (YTD) - daily accrual
      const totalEntityInterest = farm.grainEntity.operatingLoans.reduce((sum, loan) => {
        const rate = Number(loan.interestRate);
        const balance = Number(loan.currentBalance);
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // Calculate days for interest accrual
        let daysToUse: number;
        if (year < currentYear) {
          // Past year: full 365 days
          daysToUse = 365;
        } else if (year > currentYear) {
          // Future year: project full 365 days for planning
          daysToUse = 365;
        } else {
          // Current year: days elapsed from Jan 1 to today
          const msPerDay = 1000 * 60 * 60 * 24;
          daysToUse = Math.floor((now.getTime() - startOfYear.getTime()) / msPerDay) + 1;
        }

        // Daily interest = balance * (annual rate / 365) * days
        return sum + balance * rate * (daysToUse / 365);
      }, 0);

      const farmAcres = Number(farm.acres);
      operatingLoanInterest = totalEntityAcres > 0 ? (totalEntityInterest * farmAcres / totalEntityAcres) : 0;
    }

    // Calculate equipment loan costs distributed by acreage (for loans marked includeInBreakeven)
    let equipmentLoanInterest = 0;
    let equipmentLoanPrincipal = 0;

    const businessId = farm.grainEntity.business?.id;
    if (businessId) {
      const equipmentLoanService = new EquipmentLoanService();
      const costPerAcre = await equipmentLoanService.getEquipmentCostPerAcre(businessId, year);
      const farmAcres = Number(farm.acres);

      equipmentLoanInterest = costPerAcre.interestPerAcre * farmAcres;
      equipmentLoanPrincipal = costPerAcre.principalPerAcre * farmAcres;
    }

    const totalInterest = landLoanInterest + operatingLoanInterest + equipmentLoanInterest;
    const totalPrincipal = landLoanPrincipal + equipmentLoanPrincipal;

    return {
      farmId,
      landLoanInterest,
      landLoanPrincipal,
      operatingLoanInterest,
      equipmentLoanInterest,
      equipmentLoanPrincipal,
      totalInterest,
      totalPrincipal,
      totalLoanCost: totalInterest + totalPrincipal
    };
  }

  async getInterestSummary(businessId: string, year: number): Promise<LoanInterestSummary> {
    // Get land parcels with loans
    const parcels = await prisma.landParcel.findMany({
      where: { businessId, deletedAt: null },
      include: {
        landLoans: { where: { isActive: true, deletedAt: null } }
      }
    });

    const landLoanInterest = parcels.map(p => {
      const annualInterest = p.landLoans.reduce((sum, loan) => {
        if (loan.useSimpleMode) {
          return sum + Number(loan.annualPayment || 0) * 0.4;
        }
        return sum + Number(loan.remainingBalance || 0) * Number(loan.interestRate || 0);
      }, 0);

      return {
        landParcelId: p.id,
        landParcelName: p.name,
        totalAcres: Number(p.totalAcres),
        annualInterest,
        interestPerAcre: Number(p.totalAcres) > 0 ? annualInterest / Number(p.totalAcres) : 0
      };
    });

    // Get operating loans
    const operatingLoans = await prisma.operatingLoan.findMany({
      where: {
        grainEntity: { businessId },
        year,
        isActive: true,
        deletedAt: null
      },
      include: { grainEntity: { select: { id: true, name: true } } }
    });

    // Group by entity - calculate daily interest accrual
    const entityMap = new Map<string, { id: string; name: string; ytdInterest: number }>();
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);

    for (const loan of operatingLoans) {
      const rate = Number(loan.interestRate);
      const balance = Number(loan.currentBalance);

      // Calculate days for interest accrual
      let daysToUse: number;
      if (year < currentYear) {
        // Past year: full 365 days
        daysToUse = 365;
      } else if (year > currentYear) {
        // Future year: project full 365 days for planning
        daysToUse = 365;
      } else {
        // Current year: days elapsed from Jan 1 to today
        const msPerDay = 1000 * 60 * 60 * 24;
        daysToUse = Math.floor((now.getTime() - startOfYear.getTime()) / msPerDay) + 1;
      }

      // Daily interest = balance * (annual rate / 365) * days
      const ytdInterest = balance * rate * (daysToUse / 365);

      const existing = entityMap.get(loan.grainEntityId);
      if (existing) {
        existing.ytdInterest += ytdInterest;
      } else {
        entityMap.set(loan.grainEntityId, {
          id: loan.grainEntityId,
          name: loan.grainEntity.name,
          ytdInterest
        });
      }
    }

    const operatingLoanInterestList = Array.from(entityMap.values()).map(e => ({
      grainEntityId: e.id,
      grainEntityName: e.name,
      ytdInterest: e.ytdInterest
    }));

    const totalLandLoanInterest = landLoanInterest.reduce((sum, l) => sum + l.annualInterest, 0);
    const totalOperatingLoanInterest = operatingLoanInterestList.reduce((sum, o) => sum + o.ytdInterest, 0);

    return {
      landLoanInterest,
      operatingLoanInterest: operatingLoanInterestList,
      totalLandLoanInterest,
      totalOperatingLoanInterest,
      totalInterestExpense: totalLandLoanInterest + totalOperatingLoanInterest
    };
  }
}

// ===== Equipment Service =====

export class EquipmentService {
  async getAll(businessId: string, query?: { isActive?: boolean; equipmentType?: EquipmentType }): Promise<Equipment[]> {
    const equipment = await prisma.equipment.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(query?.isActive !== undefined && { isActive: query.isActive }),
        ...(query?.equipmentType && { equipmentType: query.equipmentType })
      },
      include: {
        equipmentLoans: {
          where: { deletedAt: null, isActive: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return equipment.map(e => this.mapEquipment(e));
  }

  async getById(id: string, businessId: string): Promise<Equipment | null> {
    const equipment = await prisma.equipment.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        equipmentLoans: {
          where: { deletedAt: null },
          include: {
            payments: { orderBy: { paymentDate: 'desc' }, take: 10 }
          }
        }
      }
    });

    if (!equipment) return null;
    return this.mapEquipment(equipment);
  }

  async create(businessId: string, data: CreateEquipmentRequest): Promise<Equipment> {
    const equipment = await prisma.equipment.create({
      data: {
        businessId,
        name: data.name,
        equipmentType: data.equipmentType,
        year: data.year,
        make: data.make,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        currentValue: data.currentValue,
        notes: data.notes
      },
      include: {
        equipmentLoans: { where: { deletedAt: null } }
      }
    });

    return this.mapEquipment(equipment);
  }

  async update(id: string, businessId: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.equipmentType !== undefined && { equipmentType: data.equipmentType }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.make !== undefined && { make: data.make }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        equipmentLoans: { where: { deletedAt: null } }
      }
    });

    return this.mapEquipment(equipment);
  }

  async delete(id: string, businessId: string): Promise<void> {
    await prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  private mapEquipment(equipment: any): Equipment {
    const loans = equipment.equipmentLoans || [];
    const totalLoanBalance = loans.reduce((sum: number, l: any) =>
      sum + Number(l.remainingBalance || 0), 0);
    const annualInterestExpense = loans.reduce((sum: number, l: any) =>
      sum + this.calculateLoanAnnualInterest(l), 0);
    const annualPrincipalExpense = loans.reduce((sum: number, l: any) =>
      sum + this.calculateLoanAnnualPrincipal(l), 0);

    return {
      id: equipment.id,
      businessId: equipment.businessId,
      name: equipment.name,
      equipmentType: equipment.equipmentType as EquipmentType,
      year: equipment.year || undefined,
      make: equipment.make || undefined,
      model: equipment.model || undefined,
      serialNumber: equipment.serialNumber || undefined,
      purchaseDate: equipment.purchaseDate || undefined,
      purchasePrice: equipment.purchasePrice ? Number(equipment.purchasePrice) : undefined,
      currentValue: equipment.currentValue ? Number(equipment.currentValue) : undefined,
      notes: equipment.notes || undefined,
      isActive: equipment.isActive,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
      totalLoanBalance,
      annualInterestExpense,
      annualPrincipalExpense,
      equipmentLoans: loans.map((l: any) => this.mapEquipmentLoan(l))
    };
  }

  private calculateLoanAnnualInterest(loan: any): number {
    // Use override if provided
    if (loan.annualInterestOverride) {
      return Number(loan.annualInterestOverride);
    }
    if (loan.useSimpleMode || loan.financingType === 'LEASE') {
      // Simple mode or lease: estimate 40% of annual payment is interest
      return Number(loan.annualPayment || 0) * 0.4;
    }
    // Full amortization: remaining balance × interest rate
    return Number(loan.remainingBalance || 0) * Number(loan.interestRate || 0);
  }

  private calculateLoanAnnualPrincipal(loan: any): number {
    // Use override if provided
    if (loan.annualPrincipalOverride) {
      return Number(loan.annualPrincipalOverride);
    }
    if (loan.useSimpleMode || loan.financingType === 'LEASE') {
      // Simple mode or lease: estimate 60% of annual payment is principal
      return Number(loan.annualPayment || 0) * 0.6;
    }
    // Full amortization: annual payment - annual interest
    const monthlyPayment = Number(loan.monthlyPayment || 0);
    const annualPayment = monthlyPayment * 12;
    const annualInterest = this.calculateLoanAnnualInterest(loan);
    return Math.max(0, annualPayment - annualInterest);
  }

  private mapEquipmentLoan(loan: any): EquipmentLoan {
    const calculatedAnnualInterest = this.calculateLoanAnnualInterest(loan);
    const calculatedAnnualPrincipal = this.calculateLoanAnnualPrincipal(loan);

    return {
      id: loan.id,
      equipmentId: loan.equipmentId,
      lender: loan.lender,
      loanNumber: loan.loanNumber || undefined,
      financingType: loan.financingType as EquipmentFinancingType,
      useSimpleMode: loan.useSimpleMode,
      principal: loan.principal ? Number(loan.principal) : undefined,
      interestRate: loan.interestRate ? Number(loan.interestRate) : undefined,
      termMonths: loan.termMonths || undefined,
      startDate: loan.startDate || undefined,
      paymentFrequency: loan.paymentFrequency as PaymentFrequency || undefined,
      monthlyPayment: loan.monthlyPayment ? Number(loan.monthlyPayment) : undefined,
      remainingBalance: loan.remainingBalance ? Number(loan.remainingBalance) : undefined,
      annualPayment: loan.annualPayment ? Number(loan.annualPayment) : undefined,
      leaseEndDate: loan.leaseEndDate || undefined,
      residualValue: loan.residualValue ? Number(loan.residualValue) : undefined,
      // New fields
      downPayment: loan.downPayment ? Number(loan.downPayment) : undefined,
      downPaymentDate: loan.downPaymentDate || undefined,
      annualInterestOverride: loan.annualInterestOverride ? Number(loan.annualInterestOverride) : undefined,
      annualPrincipalOverride: loan.annualPrincipalOverride ? Number(loan.annualPrincipalOverride) : undefined,
      nextPaymentDate: loan.nextPaymentDate || undefined,
      paymentReminderSent: loan.paymentReminderSent,
      includeInBreakeven: loan.includeInBreakeven,
      notes: loan.notes || undefined,
      isActive: loan.isActive,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      // Computed fields
      annualInterestExpense: calculatedAnnualInterest,
      calculatedAnnualInterest,
      calculatedAnnualPrincipal,
      payments: loan.payments?.map((p: any) => ({
        id: p.id,
        equipmentLoanId: p.equipmentLoanId,
        paymentDate: p.paymentDate,
        totalAmount: Number(p.totalAmount),
        principalAmount: Number(p.principalAmount),
        interestAmount: Number(p.interestAmount),
        notes: p.notes || undefined,
        createdAt: p.createdAt
      }))
    };
  }
}

// ===== Equipment Loan Service =====

export class EquipmentLoanService {
  async getByEquipment(equipmentId: string): Promise<EquipmentLoan[]> {
    const loans = await prisma.equipmentLoan.findMany({
      where: { equipmentId, deletedAt: null },
      include: {
        payments: { orderBy: { paymentDate: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return loans.map(l => this.mapLoan(l));
  }

  async getById(id: string): Promise<EquipmentLoan | null> {
    const loan = await prisma.equipmentLoan.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipment: true,
        payments: { orderBy: { paymentDate: 'desc' } }
      }
    });

    if (!loan) return null;
    return this.mapLoan(loan);
  }

  async create(equipmentId: string, data: CreateEquipmentLoanRequest): Promise<EquipmentLoan> {
    // Auto-populate startDate from equipment's purchaseDate if not provided
    let startDate = data.startDate ? new Date(data.startDate) : null;
    if (!startDate) {
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        select: { purchaseDate: true }
      });
      if (equipment?.purchaseDate) {
        startDate = equipment.purchaseDate;
      }
    }

    // Calculate next payment date based on start date and frequency
    let nextPaymentDate = data.nextPaymentDate ? new Date(data.nextPaymentDate) : null;
    if (!nextPaymentDate && startDate && data.paymentFrequency) {
      nextPaymentDate = this.calculateNextPaymentDate(startDate, data.paymentFrequency);
    }

    const loan = await prisma.equipmentLoan.create({
      data: {
        equipmentId,
        lender: data.lender,
        loanNumber: data.loanNumber,
        financingType: data.financingType,
        useSimpleMode: data.useSimpleMode,
        principal: data.principal,
        interestRate: data.interestRate,
        termMonths: data.termMonths,
        startDate,
        paymentFrequency: data.paymentFrequency,
        monthlyPayment: data.monthlyPayment,
        remainingBalance: data.remainingBalance ?? data.principal,
        annualPayment: data.annualPayment,
        leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate) : null,
        residualValue: data.residualValue,
        downPayment: data.downPayment,
        downPaymentDate: data.downPaymentDate ? new Date(data.downPaymentDate) : null,
        nextPaymentDate,
        includeInBreakeven: data.includeInBreakeven ?? false,
        notes: data.notes
      },
      include: { payments: true }
    });

    return this.mapLoan(loan);
  }

  private calculateNextPaymentDate(startDate: Date, frequency: PaymentFrequency): Date {
    const now = new Date();
    let nextDate = new Date(startDate);

    // Get the interval in months
    const intervalMonths = {
      [PaymentFrequency.MONTHLY]: 1,
      [PaymentFrequency.QUARTERLY]: 3,
      [PaymentFrequency.SEMI_ANNUAL]: 6,
      [PaymentFrequency.ANNUAL]: 12
    }[frequency] || 1;

    // Keep adding intervals until we're past today
    while (nextDate <= now) {
      nextDate.setMonth(nextDate.getMonth() + intervalMonths);
    }

    return nextDate;
  }

  async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoan> {
    // If nextPaymentDate is being changed, reset the reminder flag
    const resetReminder = data.nextPaymentDate !== undefined;

    const loan = await prisma.equipmentLoan.update({
      where: { id },
      data: {
        ...(data.lender !== undefined && { lender: data.lender }),
        ...(data.loanNumber !== undefined && { loanNumber: data.loanNumber }),
        ...(data.financingType !== undefined && { financingType: data.financingType }),
        ...(data.useSimpleMode !== undefined && { useSimpleMode: data.useSimpleMode }),
        ...(data.principal !== undefined && { principal: data.principal }),
        ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
        ...(data.termMonths !== undefined && { termMonths: data.termMonths }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.paymentFrequency !== undefined && { paymentFrequency: data.paymentFrequency }),
        ...(data.monthlyPayment !== undefined && { monthlyPayment: data.monthlyPayment }),
        ...(data.remainingBalance !== undefined && { remainingBalance: data.remainingBalance }),
        ...(data.annualPayment !== undefined && { annualPayment: data.annualPayment }),
        ...(data.leaseEndDate !== undefined && { leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate) : null }),
        ...(data.residualValue !== undefined && { residualValue: data.residualValue }),
        // New fields
        ...(data.downPayment !== undefined && { downPayment: data.downPayment }),
        ...(data.downPaymentDate !== undefined && { downPaymentDate: data.downPaymentDate ? new Date(data.downPaymentDate) : null }),
        ...(data.annualInterestOverride !== undefined && { annualInterestOverride: data.annualInterestOverride }),
        ...(data.annualPrincipalOverride !== undefined && { annualPrincipalOverride: data.annualPrincipalOverride }),
        ...(data.nextPaymentDate !== undefined && { nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : null }),
        ...(data.includeInBreakeven !== undefined && { includeInBreakeven: data.includeInBreakeven }),
        ...(resetReminder && { paymentReminderSent: false }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: { payments: true }
    });

    return this.mapLoan(loan);
  }

  async delete(id: string): Promise<void> {
    await prisma.equipmentLoan.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async recordPayment(loanId: string, data: CreateEquipmentLoanPaymentRequest): Promise<EquipmentLoanPayment> {
    // Create payment and update remaining balance
    const [payment, _] = await prisma.$transaction([
      prisma.equipmentLoanPayment.create({
        data: {
          equipmentLoanId: loanId,
          paymentDate: new Date(data.paymentDate),
          totalAmount: data.totalAmount,
          principalAmount: data.principalAmount,
          interestAmount: data.interestAmount,
          notes: data.notes
        }
      }),
      prisma.equipmentLoan.update({
        where: { id: loanId },
        data: {
          remainingBalance: {
            decrement: data.principalAmount
          }
        }
      })
    ]);

    return {
      id: payment.id,
      equipmentLoanId: payment.equipmentLoanId,
      paymentDate: payment.paymentDate,
      totalAmount: Number(payment.totalAmount),
      principalAmount: Number(payment.principalAmount),
      interestAmount: Number(payment.interestAmount),
      notes: payment.notes || undefined,
      createdAt: payment.createdAt
    };
  }

  private calculateAnnualInterest(loan: any): number {
    // Use override if provided
    if (loan.annualInterestOverride) {
      return Number(loan.annualInterestOverride);
    }
    if (loan.useSimpleMode || loan.financingType === 'LEASE') {
      return Number(loan.annualPayment || 0) * 0.4;
    }
    return Number(loan.remainingBalance || 0) * Number(loan.interestRate || 0);
  }

  private calculateAnnualPrincipal(loan: any): number {
    // Use override if provided
    if (loan.annualPrincipalOverride) {
      return Number(loan.annualPrincipalOverride);
    }
    if (loan.useSimpleMode || loan.financingType === 'LEASE') {
      return Number(loan.annualPayment || 0) * 0.6;
    }
    const monthlyPayment = Number(loan.monthlyPayment || 0);
    const annualPayment = monthlyPayment * 12;
    const annualInterest = this.calculateAnnualInterest(loan);
    return Math.max(0, annualPayment - annualInterest);
  }

  private mapLoan(loan: any): EquipmentLoan {
    const calculatedAnnualInterest = this.calculateAnnualInterest(loan);
    const calculatedAnnualPrincipal = this.calculateAnnualPrincipal(loan);

    return {
      id: loan.id,
      equipmentId: loan.equipmentId,
      lender: loan.lender,
      loanNumber: loan.loanNumber || undefined,
      financingType: loan.financingType as EquipmentFinancingType,
      useSimpleMode: loan.useSimpleMode,
      principal: loan.principal ? Number(loan.principal) : undefined,
      interestRate: loan.interestRate ? Number(loan.interestRate) : undefined,
      termMonths: loan.termMonths || undefined,
      startDate: loan.startDate || undefined,
      paymentFrequency: loan.paymentFrequency as PaymentFrequency || undefined,
      monthlyPayment: loan.monthlyPayment ? Number(loan.monthlyPayment) : undefined,
      remainingBalance: loan.remainingBalance ? Number(loan.remainingBalance) : undefined,
      annualPayment: loan.annualPayment ? Number(loan.annualPayment) : undefined,
      leaseEndDate: loan.leaseEndDate || undefined,
      residualValue: loan.residualValue ? Number(loan.residualValue) : undefined,
      // New fields
      downPayment: loan.downPayment ? Number(loan.downPayment) : undefined,
      downPaymentDate: loan.downPaymentDate || undefined,
      annualInterestOverride: loan.annualInterestOverride ? Number(loan.annualInterestOverride) : undefined,
      annualPrincipalOverride: loan.annualPrincipalOverride ? Number(loan.annualPrincipalOverride) : undefined,
      nextPaymentDate: loan.nextPaymentDate || undefined,
      paymentReminderSent: loan.paymentReminderSent,
      includeInBreakeven: loan.includeInBreakeven,
      notes: loan.notes || undefined,
      isActive: loan.isActive,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      // Computed fields
      annualInterestExpense: calculatedAnnualInterest,
      calculatedAnnualInterest,
      calculatedAnnualPrincipal,
      equipment: loan.equipment ? {
        id: loan.equipment.id,
        businessId: loan.equipment.businessId,
        name: loan.equipment.name,
        equipmentType: loan.equipment.equipmentType as EquipmentType,
        isActive: loan.equipment.isActive,
        createdAt: loan.equipment.createdAt,
        updatedAt: loan.equipment.updatedAt
      } : undefined,
      payments: loan.payments?.map((p: any) => ({
        id: p.id,
        equipmentLoanId: p.equipmentLoanId,
        paymentDate: p.paymentDate,
        totalAmount: Number(p.totalAmount),
        principalAmount: Number(p.principalAmount),
        interestAmount: Number(p.interestAmount),
        notes: p.notes || undefined,
        createdAt: p.createdAt
      }))
    };
  }

  // Get total equipment loan cost per acre for break-even calculations
  async getEquipmentCostPerAcre(businessId: string, year: number): Promise<{ interestPerAcre: number; principalPerAcre: number; totalPerAcre: number }> {
    // Get all equipment with loans that are marked for break-even
    const equipment = await prisma.equipment.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      include: {
        equipmentLoans: {
          where: { deletedAt: null, isActive: true, includeInBreakeven: true }
        }
      }
    });

    let totalAnnualInterest = 0;
    let totalAnnualPrincipal = 0;

    for (const eq of equipment) {
      for (const loan of eq.equipmentLoans) {
        totalAnnualInterest += this.calculateAnnualInterest(loan);
        totalAnnualPrincipal += this.calculateAnnualPrincipal(loan);
      }
    }

    // Get total acres across all farms for this year
    const farms = await prisma.farm.findMany({
      where: {
        grainEntity: { businessId },
        year,
        deletedAt: null
      },
      select: { acres: true }
    });

    const totalAcres = farms.reduce((sum, f) => sum + Number(f.acres || 0), 0);

    return {
      interestPerAcre: totalAcres > 0 ? totalAnnualInterest / totalAcres : 0,
      principalPerAcre: totalAcres > 0 ? totalAnnualPrincipal / totalAcres : 0,
      totalPerAcre: totalAcres > 0 ? (totalAnnualInterest + totalAnnualPrincipal) / totalAcres : 0
    };
  }
}

// Export singleton instances
export const landParcelService = new LandParcelService();
export const landLoanService = new LandLoanService();
export const operatingLoanService = new OperatingLoanService();
export const loanInterestService = new LoanInterestService();
export const equipmentService = new EquipmentService();
export const equipmentLoanService = new EquipmentLoanService();
