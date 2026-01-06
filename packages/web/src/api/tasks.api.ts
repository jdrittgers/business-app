import apiClient from './client';
import { Task, CreateTaskRequest, UpdateTaskRequest, GetTasksQuery } from '@business-app/shared';

export const tasksApi = {
  getBusinessTasks: async (businessId: string, query?: GetTasksQuery): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>(`/api/businesses/${businessId}/tasks`, {
      params: query
    });
    return response.data;
  },

  createTask: async (businessId: string, taskData: CreateTaskRequest): Promise<Task> => {
    const response = await apiClient.post<Task>(`/api/businesses/${businessId}/tasks`, taskData);
    return response.data;
  },

  updateTask: async (taskId: string, taskData: UpdateTaskRequest): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/api/tasks/${taskId}`, taskData);
    return response.data;
  },

  claimTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/api/tasks/${taskId}/claim`);
    return response.data;
  },

  completeTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/api/tasks/${taskId}/complete`);
    return response.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/api/tasks/${taskId}`);
  }
};
