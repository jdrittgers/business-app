import { Router } from 'express';
import { GrainContractController } from '../controllers/grain-contract.controller';
import { authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';

const router = Router();
const controller = new GrainContractController();

// All routes require authentication AND Rittgers Farm membership
router.use(authenticate);
router.use(requireGrainAccess);

// Grain entities
router.get('/businesses/:businessId/grain-entities', (req, res) => controller.getGrainEntities(req, res));

// Contracts
router.get('/businesses/:businessId/grain-contracts', (req, res) => controller.getContracts(req, res));
router.post('/grain-contracts', (req, res) => controller.createContract(req, res));
router.get('/grain-contracts/:contractId', (req, res) => controller.getContract(req, res));
router.patch('/grain-contracts/:contractId', (req, res) => controller.updateContract(req, res));
router.delete('/grain-contracts/:contractId', (req, res) => controller.deleteContract(req, res));

// Accumulator entries
router.post('/grain-contracts/:contractId/accumulator-entries', (req, res) => controller.addAccumulatorEntry(req, res));

export default router;
