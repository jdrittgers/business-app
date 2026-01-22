import { prisma } from '../prisma/client';
import { NotificationService } from './notification.service';
import { NotificationType, UserRole } from '@business-app/shared';

export class LoanReminderService {
  private notificationService: NotificationService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Start reminder job (run daily)
  start() {
    if (this.intervalId) {
      console.log('Loan reminder job already running');
      return;
    }

    // Run on start (with a 30-second delay to let other services initialize)
    setTimeout(() => this.runJob(), 30000);

    // Run daily (24 hours = 86400000 ms)
    const intervalMs = parseInt(process.env.LOAN_REMINDER_INTERVAL || '86400000');
    this.intervalId = setInterval(() => {
      this.runJob();
    }, intervalMs);

    console.log(`Loan reminder job started - running every ${intervalMs / 1000 / 60 / 60} hours`);
  }

  // Stop the job
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Loan reminder job stopped');
    }
  }

  // Execute the job
  private async runJob() {
    try {
      console.log(`[${new Date().toISOString()}] Running loan payment reminder job...`);

      await this.checkEquipmentLoanPayments();
      await this.checkLandLoanPayments();

      console.log(`[${new Date().toISOString()}] Loan reminder job completed`);
    } catch (error) {
      console.error('Error running loan reminder job:', error);
    }
  }

  // Check for upcoming equipment loan payments
  private async checkEquipmentLoanPayments() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find equipment loans with payment due within 7 days that haven't been reminded
    const loans = await prisma.equipmentLoan.findMany({
      where: {
        nextPaymentDate: {
          lte: sevenDaysFromNow,
          gte: new Date()
        },
        paymentReminderSent: false,
        isActive: true,
        deletedAt: null
      },
      include: {
        equipment: {
          include: {
            business: {
              include: {
                members: {
                  where: { role: { in: [UserRole.OWNER, UserRole.MANAGER] } },
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Found ${loans.length} equipment loans with upcoming payments`);

    for (const loan of loans) {
      const memberIds = loan.equipment.business.members.map(m => m.userId);
      const paymentAmount = loan.monthlyPayment || loan.annualPayment || 0;
      const paymentDate = loan.nextPaymentDate!;

      for (const userId of memberIds) {
        await this.notificationService.create({
          userId,
          businessId: loan.equipment.businessId,
          type: NotificationType.LOAN_PAYMENT_DUE,
          title: `Payment Due: ${loan.equipment.name}`,
          message: `${loan.lender} payment of $${Number(paymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due on ${paymentDate.toLocaleDateString()}`,
          link: '/loans/equipment',
          metadata: {
            loanId: loan.id,
            equipmentId: loan.equipmentId,
            equipmentName: loan.equipment.name,
            lender: loan.lender,
            amount: Number(paymentAmount),
            dueDate: paymentDate.toISOString()
          }
        });
      }

      // Mark reminder as sent
      await prisma.equipmentLoan.update({
        where: { id: loan.id },
        data: { paymentReminderSent: true }
      });
    }
  }

  // Check for upcoming land loan payments
  private async checkLandLoanPayments() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find land loans with payment due within 7 days that haven't been reminded
    const loans = await prisma.landLoan.findMany({
      where: {
        nextPaymentDate: {
          lte: sevenDaysFromNow,
          gte: new Date()
        },
        paymentReminderSent: false,
        isActive: true,
        deletedAt: null
      },
      include: {
        landParcel: {
          include: {
            business: {
              include: {
                members: {
                  where: { role: { in: [UserRole.OWNER, UserRole.MANAGER] } },
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Found ${loans.length} land loans with upcoming payments`);

    for (const loan of loans) {
      const memberIds = loan.landParcel.business.members.map(m => m.userId);
      const paymentAmount = loan.monthlyPayment || loan.annualPayment || 0;
      const paymentDate = loan.nextPaymentDate!;

      for (const userId of memberIds) {
        await this.notificationService.create({
          userId,
          businessId: loan.landParcel.businessId,
          type: NotificationType.LOAN_PAYMENT_DUE,
          title: `Land Payment Due: ${loan.landParcel.name}`,
          message: `${loan.lender} payment of $${Number(paymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} due on ${paymentDate.toLocaleDateString()}`,
          link: '/loans/land-parcels',
          metadata: {
            loanId: loan.id,
            landParcelId: loan.landParcelId,
            landParcelName: loan.landParcel.name,
            lender: loan.lender,
            amount: Number(paymentAmount),
            dueDate: paymentDate.toISOString()
          }
        });
      }

      // Mark reminder as sent
      await prisma.landLoan.update({
        where: { id: loan.id },
        data: { paymentReminderSent: true }
      });
    }
  }

  // Reset reminder flag (called when payment is recorded or next payment date changes)
  async resetReminder(loanId: string, type: 'equipment' | 'land') {
    if (type === 'equipment') {
      await prisma.equipmentLoan.update({
        where: { id: loanId },
        data: { paymentReminderSent: false }
      });
    } else {
      await prisma.landLoan.update({
        where: { id: loanId },
        data: { paymentReminderSent: false }
      });
    }
  }
}

export const loanReminderService = new LoanReminderService();
