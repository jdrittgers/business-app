import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';
import {
  landParcelService,
  landLoanService,
  operatingLoanService,
  loanInterestService,
  equipmentService,
  equipmentLoanService
} from '../services/loan.service';

const router = Router();

// Apply auth and grain access middleware to all routes
router.use(authenticate);
router.use(requireGrainAccess);

// ===== Land Parcels =====

// Get all land parcels for a business
router.get('/businesses/:businessId/land-parcels', async (req: AuthRequest, res: Response) => {
  try {
    const isActive = req.query.isActive === 'true' ? true :
                     req.query.isActive === 'false' ? false : undefined;
    const parcels = await landParcelService.getAll(req.params.businessId, { isActive });
    res.json(parcels);
  } catch (error: any) {
    console.error('Error getting land parcels:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific land parcel
router.get('/businesses/:businessId/land-parcels/:id', async (req: AuthRequest, res: Response) => {
  try {
    const parcel = await landParcelService.getById(req.params.id, req.params.businessId);
    if (!parcel) {
      res.status(404).json({ error: 'Land parcel not found' });
      return;
    }
    res.json(parcel);
  } catch (error: any) {
    console.error('Error getting land parcel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new land parcel
router.post('/businesses/:businessId/land-parcels', async (req: AuthRequest, res: Response) => {
  try {
    const parcel = await landParcelService.create(req.params.businessId, req.body);
    res.status(201).json(parcel);
  } catch (error: any) {
    console.error('Error creating land parcel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a land parcel
router.put('/businesses/:businessId/land-parcels/:id', async (req: AuthRequest, res: Response) => {
  try {
    const parcel = await landParcelService.update(req.params.id, req.params.businessId, req.body);
    res.json(parcel);
  } catch (error: any) {
    console.error('Error updating land parcel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (soft) a land parcel
router.delete('/businesses/:businessId/land-parcels/:id', async (req: AuthRequest, res: Response) => {
  try {
    await landParcelService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting land parcel:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Land Loans =====

// Get all loans for a land parcel
router.get('/land-parcels/:parcelId/loans', async (req: AuthRequest, res: Response) => {
  try {
    const loans = await landLoanService.getByParcel(req.params.parcelId);
    res.json(loans);
  } catch (error: any) {
    console.error('Error getting land loans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific land loan
router.get('/land-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await landLoanService.getById(req.params.id);
    if (!loan) {
      res.status(404).json({ error: 'Land loan not found' });
      return;
    }
    res.json(loan);
  } catch (error: any) {
    console.error('Error getting land loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new land loan for a parcel
router.post('/land-parcels/:parcelId/loans', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await landLoanService.create(req.params.parcelId, req.body);
    res.status(201).json(loan);
  } catch (error: any) {
    console.error('Error creating land loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a land loan
router.put('/land-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await landLoanService.update(req.params.id, req.body);
    res.json(loan);
  } catch (error: any) {
    console.error('Error updating land loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (soft) a land loan
router.delete('/land-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    await landLoanService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting land loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record a payment on a land loan
router.post('/land-loans/:id/payments', async (req: AuthRequest, res: Response) => {
  try {
    const payment = await landLoanService.recordPayment(req.params.id, req.body);
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Error recording land loan payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Operating Loans =====

// Get all operating loans for a business
router.get('/businesses/:businessId/operating-loans', async (req: AuthRequest, res: Response) => {
  try {
    const { grainEntityId, year, isActive } = req.query;
    const loans = await operatingLoanService.getAll(req.params.businessId, {
      grainEntityId: grainEntityId as string | undefined,
      year: year ? parseInt(year as string) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    res.json(loans);
  } catch (error: any) {
    console.error('Error getting operating loans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get operating loans for a grain entity
router.get('/grain-entities/:entityId/operating-loans', async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.query;
    const loans = await operatingLoanService.getByEntity(
      req.params.entityId,
      year ? parseInt(year as string) : undefined
    );
    res.json(loans);
  } catch (error: any) {
    console.error('Error getting operating loans for entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific operating loan
router.get('/operating-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await operatingLoanService.getById(req.params.id);
    if (!loan) {
      res.status(404).json({ error: 'Operating loan not found' });
      return;
    }
    res.json(loan);
  } catch (error: any) {
    console.error('Error getting operating loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new operating loan for an entity
router.post('/grain-entities/:entityId/operating-loans', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await operatingLoanService.create(req.params.entityId, req.body);
    res.status(201).json(loan);
  } catch (error: any) {
    console.error('Error creating operating loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an operating loan
router.put('/operating-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await operatingLoanService.update(req.params.id, req.body);
    res.json(loan);
  } catch (error: any) {
    console.error('Error updating operating loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (soft) an operating loan
router.delete('/operating-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    await operatingLoanService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting operating loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record a draw on an operating loan
router.post('/operating-loans/:id/draw', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, transactionDate, description } = req.body;
    const transaction = await operatingLoanService.recordDraw(
      req.params.id,
      req.user!.userId,
      amount,
      transactionDate ? new Date(transactionDate) : new Date(),
      description
    );
    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Error recording operating loan draw:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record a payment on an operating loan
router.post('/operating-loans/:id/payment', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, transactionDate, description } = req.body;
    const transaction = await operatingLoanService.recordPayment(
      req.params.id,
      req.user!.userId,
      amount,
      transactionDate ? new Date(transactionDate) : new Date(),
      description
    );
    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Error recording operating loan payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Equipment =====

// Get all equipment for a business
router.get('/businesses/:businessId/equipment', async (req: AuthRequest, res: Response) => {
  try {
    const isActive = req.query.isActive === 'true' ? true :
                     req.query.isActive === 'false' ? false : undefined;
    const equipment = await equipmentService.getAll(req.params.businessId, { isActive });
    res.json(equipment);
  } catch (error: any) {
    console.error('Error getting equipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific equipment item
router.get('/businesses/:businessId/equipment/:id', async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await equipmentService.getById(req.params.id, req.params.businessId);
    if (!equipment) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    res.json(equipment);
  } catch (error: any) {
    console.error('Error getting equipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new equipment
router.post('/businesses/:businessId/equipment', async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await equipmentService.create(req.params.businessId, req.body);
    res.status(201).json(equipment);
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update equipment
router.put('/businesses/:businessId/equipment/:id', async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await equipmentService.update(req.params.id, req.params.businessId, req.body);
    res.json(equipment);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (soft) equipment
router.delete('/businesses/:businessId/equipment/:id', async (req: AuthRequest, res: Response) => {
  try {
    await equipmentService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Equipment Loans =====

// Get all loans for an equipment item
router.get('/equipment/:equipmentId/loans', async (req: AuthRequest, res: Response) => {
  try {
    const loans = await equipmentLoanService.getByEquipment(req.params.equipmentId);
    res.json(loans);
  } catch (error: any) {
    console.error('Error getting equipment loans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific equipment loan
router.get('/equipment-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await equipmentLoanService.getById(req.params.id);
    if (!loan) {
      res.status(404).json({ error: 'Equipment loan not found' });
      return;
    }
    res.json(loan);
  } catch (error: any) {
    console.error('Error getting equipment loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new loan for an equipment item
router.post('/equipment/:equipmentId/loans', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await equipmentLoanService.create(req.params.equipmentId, req.body);
    res.status(201).json(loan);
  } catch (error: any) {
    console.error('Error creating equipment loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an equipment loan
router.put('/equipment-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    const loan = await equipmentLoanService.update(req.params.id, req.body);
    res.json(loan);
  } catch (error: any) {
    console.error('Error updating equipment loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (soft) an equipment loan
router.delete('/equipment-loans/:id', async (req: AuthRequest, res: Response) => {
  try {
    await equipmentLoanService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting equipment loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record a payment on an equipment loan
router.post('/equipment-loans/:id/payments', async (req: AuthRequest, res: Response) => {
  try {
    const payment = await equipmentLoanService.recordPayment(req.params.id, req.body);
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Error recording equipment loan payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Interest Summary =====

// Get interest summary for a business
router.get('/businesses/:businessId/loans/interest-summary', async (req: AuthRequest, res: Response) => {
  try {
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : new Date().getFullYear();
    const summary = await loanInterestService.getInterestSummary(req.params.businessId, year);
    res.json(summary);
  } catch (error: any) {
    console.error('Error getting interest summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get interest allocation for a specific farm
router.get('/businesses/:businessId/farms/:farmId/interest', async (req: AuthRequest, res: Response) => {
  try {
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : new Date().getFullYear();
    const allocation = await loanInterestService.getFarmInterestAllocation(req.params.farmId, year);
    res.json(allocation);
  } catch (error: any) {
    console.error('Error getting farm interest allocation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
