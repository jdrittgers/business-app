export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Task {
  id: string;
  businessId: string;
  createdBy: string;
  assignedTo?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  isClaimable: boolean;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | Date;
  assignedTo?: string;
  isClaimable?: boolean;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | Date;
  assignedTo?: string;
  isClaimable?: boolean;
}

export interface GetTasksQuery {
  status?: TaskStatus;
  assignedTo?: string;
  isClaimable?: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateTaskCommentRequest {
  content: string;
}
