import apiClient from './client';

export interface CreateInvitationRequest {
  businessId: string;
  role: 'MANAGER' | 'EMPLOYEE';
  email?: string;
  expiresInDays?: number;
  maxUses?: number;
}

export interface InvitationResponse {
  id: string;
  code: string;
  role: 'MANAGER' | 'EMPLOYEE';
  email?: string;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdAt: Date;
}

export interface InvitationWithBusiness extends InvitationResponse {
  businessName: string;
}

export interface AcceptInvitationResponse {
  message: string;
  businessId: string;
  role: string;
}

export const invitationApi = {
  /**
   * Create a new invitation code (Owner only)
   */
  createInvitation: async (data: CreateInvitationRequest): Promise<InvitationResponse> => {
    const response = await apiClient.post<InvitationResponse>('/api/invitations', data);
    return response.data;
  },

  /**
   * Get all invitations for a business (Owner only)
   */
  getBusinessInvitations: async (businessId: string): Promise<InvitationResponse[]> => {
    const response = await apiClient.get<InvitationResponse[]>(`/api/invitations/business/${businessId}`);
    return response.data;
  },

  /**
   * Validate an invitation code
   */
  validateInvitationCode: async (code: string): Promise<InvitationWithBusiness> => {
    const response = await apiClient.get<InvitationWithBusiness>(`/api/invitations/validate/${code}`);
    return response.data;
  },

  /**
   * Accept an invitation and join a business
   */
  acceptInvitation: async (code: string): Promise<AcceptInvitationResponse> => {
    const response = await apiClient.post<AcceptInvitationResponse>('/api/invitations/accept', { code });
    return response.data;
  },

  /**
   * Deactivate an invitation (Owner only)
   */
  deactivateInvitation: async (invitationId: string): Promise<void> => {
    await apiClient.delete(`/api/invitations/${invitationId}`);
  }
};
