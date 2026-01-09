import apiClient from './client';

export interface TeamMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export const teamApi = {
  /**
   * Get all team members for a business (Owner only)
   */
  getTeamMembers: async (businessId: string): Promise<TeamMember[]> => {
    const response = await apiClient.get<TeamMember[]>(`/api/team/business/${businessId}`);
    return response.data;
  },

  /**
   * Remove a team member (Owner only)
   */
  removeMember: async (membershipId: string): Promise<void> => {
    await apiClient.delete(`/api/team/member/${membershipId}`);
  },

  /**
   * Update a team member's role (Owner only)
   */
  updateMemberRole: async (membershipId: string, role: 'MANAGER' | 'EMPLOYEE'): Promise<TeamMember> => {
    const response = await apiClient.patch<TeamMember>(`/api/team/member/${membershipId}/role`, { role });
    return response.data;
  }
};
