import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GrainContractService } from '../services/grain-contract.service';
import {
  CreateGrainContractRequest,
  UpdateGrainContractRequest,
  CreateAccumulatorEntryRequest,
  GetGrainContractsQuery
} from '@business-app/shared';
import { getUserBusinessId } from '../utils/assert-business-access';

const grainContractService = new GrainContractService();

export class GrainContractController {
  // Get grain entities
  async getGrainEntities(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const entities = await grainContractService.getGrainEntities(businessId);
      res.json(entities);
    } catch (error) {
      console.error('Get grain entities error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create grain entity
  async createGrainEntity(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('📝 Create grain entity request received');
      console.log('User:', req.user?.userId);
      console.log('BusinessId from params:', req.params.businessId);
      console.log('Name from body:', req.body.name);

      if (!req.user) {
        console.error('❌ No user in request');
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const { name } = req.body;

      if (!businessId) {
        console.error('❌ No businessId provided');
        res.status(400).json({ error: 'Business ID is required' });
        return;
      }

      if (!name || name.trim() === '') {
        console.error('❌ No name provided');
        res.status(400).json({ error: 'Entity name is required' });
        return;
      }

      console.log(`✅ Creating entity "${name}" for business ${businessId}`);
      const entity = await grainContractService.createGrainEntity(businessId, name.trim());
      console.log('✅ Entity created successfully:', entity.id);
      res.status(201).json(entity);
    } catch (error) {
      console.error('❌ Create grain entity error:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get contracts
  async getContracts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const query: GetGrainContractsQuery = {
        grainEntityId: req.query.grainEntityId as string,
        cropYear: req.query.cropYear as any,
        contractType: req.query.contractType as any,
        commodityType: req.query.commodityType as any,
        isActive: req.query.isActive as string
      };

      const contracts = await grainContractService.getContracts(businessId, query);
      res.json(contracts);
    } catch (error) {
      console.error('Get contracts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single contract
  async getContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { contractId } = req.params;
      const businessId = req.params.businessId || await getUserBusinessId(req.user.userId);
      const contract = await grainContractService.getContract(contractId, businessId);
      res.json(contract);
    } catch (error) {
      if (error instanceof Error && error.message === 'Contract not found') {
        res.status(404).json({ error: 'Contract not found' });
        return;
      }
      console.error('Get contract error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create contract
  async createContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateGrainContractRequest = req.body;

      if (!data.grainEntityId || !data.buyer || !data.totalBushels) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const contract = await grainContractService.createContract(req.user.userId, data);
      res.status(201).json(contract);
    } catch (error) {
      console.error('Create contract error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update contract
  async updateContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { contractId } = req.params;
      const data: UpdateGrainContractRequest = req.body;
      const businessId = req.params.businessId || await getUserBusinessId(req.user.userId);

      const contract = await grainContractService.updateContract(contractId, data, businessId);
      res.json(contract);
    } catch (error) {
      console.error('Update contract error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete contract
  async deleteContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { contractId } = req.params;
      const businessId = req.params.businessId || await getUserBusinessId(req.user.userId);
      await grainContractService.deleteContract(contractId, businessId);
      res.json({ message: 'Contract deleted successfully' });
    } catch (error) {
      console.error('Delete contract error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Add accumulator entry
  async addAccumulatorEntry(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { contractId } = req.params;
      const data: CreateAccumulatorEntryRequest = req.body;

      if (!data.date || !data.bushelsMarketed || !data.marketPrice) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const businessId = req.params.businessId || await getUserBusinessId(req.user.userId);
      const entry = await grainContractService.addAccumulatorEntry(contractId, data, businessId);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof Error && error.message === 'Accumulator contract not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      console.error('Add accumulator entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
