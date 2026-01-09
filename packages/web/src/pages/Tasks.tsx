import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { Task, TaskStatus, TaskPriority } from '@business-app/shared';
import TaskModal from '../components/tasks/TaskModal';

export default function Tasks() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { tasks, loadTasks, createTask, updateTask, deleteTask, claimTask, completeTask, selectedBusinessId, setSelectedBusinessId, error } = useTaskStore();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [filterAssigned, setFilterAssigned] = useState<string>('ALL');
  const [showClaimableOnly, setShowClaimableOnly] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(user.businessMemberships[0].businessId);
    }
  }, [user, selectedBusinessId, setSelectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId) {
      const status = filterStatus === 'ALL' ? undefined : filterStatus;
      const assignedTo = filterAssigned === 'ALL' ? undefined : filterAssigned;
      loadTasks(selectedBusinessId, status, assignedTo, showClaimableOnly);
    }
  }, [selectedBusinessId, filterStatus, filterAssigned, showClaimableOnly, loadTasks]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      await claimTask(taskId);
    } catch (error) {
      console.error('Failed to claim task:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleSaveTask = async (taskData: any) => {
    if (!selectedBusinessId) return;

    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
    } else {
      await createTask(selectedBusinessId, taskData);
    }
  };

  const handleDeleteTask = async () => {
    if (selectedTask) {
      await deleteTask(selectedTask.id);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const selectedBusiness = user.businessMemberships.find(
    m => m.businessId === selectedBusinessId
  );

  const filteredTasks = tasks;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Business App</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Calendar
                </button>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Tasks
                </button>
                {user.businessMemberships.some(m => m.business.name === 'Rittgers Farm') && (
                  <button
                    onClick={() => navigate('/grain-contracts')}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Grain Contracts
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  Create Task
                </button>

                {/* Business Selector */}
                <select
                  value={selectedBusinessId || ''}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {user.businessMemberships.map((membership) => (
                    <option key={membership.businessId} value={membership.businessId}>
                      {membership.business.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'ALL')}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={filterAssigned}
                onChange={(e) => setFilterAssigned(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Tasks</option>
                <option value="me">My Tasks</option>
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showClaimableOnly}
                  onChange={(e) => setShowClaimableOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Claimable Only</span>
              </label>
            </div>

            {/* Task List */}
            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tasks found</p>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>Created by: {task.creator?.firstName} {task.creator?.lastName}</span>
                          {task.assignee && (
                            <span>Assigned to: {task.assignee.firstName} {task.assignee.lastName}</span>
                          )}
                          {task.dueDate && (
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                          {task.isClaimable && !task.assignedTo && (
                            <span className="text-blue-600 font-medium">Open for Claiming</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {task.isClaimable && !task.assignedTo && task.status === 'OPEN' && (
                          <button
                            onClick={() => handleClaimTask(task.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Claim
                          </button>
                        )}

                        {task.assignedTo === user.id && task.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Complete
                          </button>
                        )}

                        {(task.createdBy === user.id || selectedBusiness?.role === 'OWNER') && (
                          <button
                            onClick={() => handleEditTask(task)}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Task Modal */}
      {selectedBusinessId && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={handleSaveTask}
          onDelete={selectedTask ? handleDeleteTask : undefined}
          task={selectedTask}
          businessId={selectedBusinessId}
        />
      )}
    </div>
  );
}
