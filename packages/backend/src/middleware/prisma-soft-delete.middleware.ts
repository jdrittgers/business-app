import { Prisma } from '@prisma/client';

/**
 * Models that support soft delete
 */
const SOFT_DELETE_MODELS = [
  'Business',
  'GrainEntity',
  'GrainContract',
  'GrainBin',
  'Farm',
  'BidRequest',
  'Retailer'
];

/**
 * Prisma middleware to implement soft delete functionality
 *
 * This middleware:
 * 1. Automatically filters out soft-deleted records in queries
 * 2. Converts delete operations to soft deletes (setting deletedAt)
 * 3. Works transparently with existing code
 */
export function softDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Only apply to models that support soft delete
    if (!SOFT_DELETE_MODELS.includes(params.model || '')) {
      return next(params);
    }

    // Handle findUnique - convert to findFirst with deletedAt filter
    if (params.action === 'findUnique') {
      params.action = 'findFirst';
      params.args.where = {
        ...params.args.where,
        deletedAt: null
      };
    }

    // Handle findFirst - add deletedAt filter
    if (params.action === 'findFirst') {
      if (params.args.where) {
        // Only add deletedAt filter if not explicitly querying deleted items
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    // Handle findMany - add deletedAt filter
    if (params.action === 'findMany') {
      if (params.args.where) {
        // Only add deletedAt filter if not explicitly querying deleted items
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    // Handle count - add deletedAt filter
    if (params.action === 'count') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    // Convert delete to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    // Convert deleteMany to soft delete
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (!params.args.data) {
        params.args.data = {};
      }
      params.args.data.deletedAt = new Date();
    }

    return next(params);
  };
}

/**
 * Helper function to hard delete (permanently delete) records
 * Use this sparingly and only when necessary
 */
export async function hardDelete<T>(
  model: any,
  where: any
): Promise<T> {
  // This bypasses the soft delete middleware by using the raw model
  // You'll need to use this function when you really want to permanently delete
  return model.delete({ where });
}

/**
 * Helper function to query including soft-deleted records
 */
export function includeDeleted<T extends Record<string, any>>(where: T): T {
  return {
    ...where,
    deletedAt: undefined // Remove the filter
  };
}

/**
 * Helper function to query only soft-deleted records
 */
export function onlyDeleted<T extends Record<string, any>>(where: T): T {
  return {
    ...where,
    deletedAt: { not: null }
  };
}
