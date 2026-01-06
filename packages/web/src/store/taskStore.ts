import { create } from 'zustand';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStatus } from '@business-app/shared';
import { tasksApi } from '../api/tasks.api';
import { getSocket } from '../config/socket';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  selectedBusinessId: string | null;
  loadTasks: (businessId: string, status?: TaskStatus, assignedTo?: string, isClaimable?: boolean) => Promise<void>;
  createTask: (businessId: string, taskData: CreateTaskRequest) => Promise<Task>;
  updateTask: (taskId: string, taskData: UpdateTaskRequest) => Promise<Task>;
  claimTask: (taskId: string) => Promise<Task>;
  completeTask: (taskId: string) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  setSelectedBusinessId: (businessId: string | null) => void;
  clearError: () => void;
  initializeSocketListeners: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,
  selectedBusinessId: null,

  loadTasks: async (businessId: string, status?: TaskStatus, assignedTo?: string, isClaimable?: boolean) => {
    try {
      set({ isLoading: true, error: null });
      const tasks = await tasksApi.getBusinessTasks(businessId, {
        status,
        assignedTo,
        isClaimable
      });
      set({ tasks, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load tasks',
        isLoading: false
      });
    }
  },

  createTask: async (businessId: string, taskData: CreateTaskRequest) => {
    try {
      set({ error: null });
      const newTask = await tasksApi.createTask(businessId, taskData);

      // Add to local state
      set(state => ({
        tasks: [...state.tasks, newTask]
      }));

      return newTask;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create task';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updateTask: async (taskId: string, taskData: UpdateTaskRequest) => {
    try {
      set({ error: null });
      const updatedTask = await tasksApi.updateTask(taskId, taskData);

      // Update in local state
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      }));

      return updatedTask;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update task';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  claimTask: async (taskId: string) => {
    try {
      set({ error: null });
      const updatedTask = await tasksApi.claimTask(taskId);

      // Update in local state
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      }));

      return updatedTask;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to claim task';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  completeTask: async (taskId: string) => {
    try {
      set({ error: null });
      const updatedTask = await tasksApi.completeTask(taskId);

      // Update in local state
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      }));

      return updatedTask;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to complete task';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      set({ error: null });
      await tasksApi.deleteTask(taskId);

      // Remove from local state
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== taskId)
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete task';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  setSelectedBusinessId: (businessId: string | null) => {
    set({ selectedBusinessId: businessId });
  },

  clearError: () => set({ error: null }),

  initializeSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for task created
    socket.on('task:created', (task: Task) => {
      console.log('✅ Received task created:', task);
      set(state => {
        // Only add if not already in state (avoid duplicates from own actions)
        const exists = state.tasks.some(t => t.id === task.id);
        if (exists) return state;

        return {
          tasks: [...state.tasks, task]
        };
      });
    });

    // Listen for task updated
    socket.on('task:updated', (task: Task) => {
      console.log('✅ Received task updated:', task);
      set(state => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t)
      }));
    });

    // Listen for task claimed
    socket.on('task:claimed', (task: Task) => {
      console.log('✅ Received task claimed:', task);
      set(state => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t)
      }));
    });

    // Listen for task completed
    socket.on('task:completed', (task: Task) => {
      console.log('✅ Received task completed:', task);
      set(state => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t)
      }));
    });

    // Listen for task deleted
    socket.on('task:deleted', (data: { taskId: string }) => {
      console.log('✅ Received task deleted:', data);
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== data.taskId)
      }));
    });

    // Listen for task assignment notifications
    socket.on('notification:task-assigned', (data: { message: string; task: Task }) => {
      console.log('🔔 You were assigned a task:', data.message);
      // Could show a notification toast here
    });

    // Listen for general notifications
    socket.on('notification', (data: { type: string; message: string; data?: any }) => {
      console.log('🔔 Notification:', data.message);
      // Could show a notification toast here
    });
  }
}));

// Initialize socket listeners when socket connects
if (typeof window !== 'undefined') {
  const socket = getSocket();
  if (socket) {
    useTaskStore.getState().initializeSocketListeners();
  }
}
