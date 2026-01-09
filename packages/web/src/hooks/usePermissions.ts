import { useAuthStore } from '../store/authStore';
import { UserRole } from '@business-app/shared';

export function usePermissions() {
  const { user } = useAuthStore();

  // Get the user's role in their current business (first membership)
  const userRole = user?.businessMemberships?.[0]?.role;

  // Employees can only edit calendar and tasks
  // Owners and Managers can edit everything
  const canEdit = (feature?: 'calendar' | 'tasks') => {
    if (!userRole) return false;

    // Owners and Managers can edit everything
    if (userRole === UserRole.OWNER || userRole === UserRole.MANAGER) {
      return true;
    }

    // Employees can only edit calendar and tasks
    if (userRole === UserRole.EMPLOYEE) {
      return feature === 'calendar' || feature === 'tasks';
    }

    return false;
  };

  // Check if user can view a feature (employees can view most things)
  const canView = (feature: string) => {
    if (!userRole) return false;

    // Everyone can view these features
    const viewableFeatures = [
      'dashboard',
      'calendar',
      'tasks',
      'grain-contracts',
      'grain-production',
      'grain-dashboard',
      'product-catalog',
      'farm-management',
      'input-bids'
    ];

    // Break-even and team management are owner/manager only
    const restrictedFeatures = ['breakeven', 'team'];

    if (restrictedFeatures.includes(feature)) {
      return userRole === UserRole.OWNER || userRole === UserRole.MANAGER;
    }

    return viewableFeatures.includes(feature);
  };

  const isOwner = userRole === UserRole.OWNER;
  const isManager = userRole === UserRole.MANAGER;
  const isEmployee = userRole === UserRole.EMPLOYEE;

  return {
    canEdit,
    canView,
    isOwner,
    isManager,
    isEmployee,
    userRole
  };
}
