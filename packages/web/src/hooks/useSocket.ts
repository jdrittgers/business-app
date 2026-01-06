import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCalendarStore } from '../store/calendarStore';
import { useTaskStore } from '../store/taskStore';
import { initializeSocket, disconnectSocket, getSocket } from '../config/socket';

export const useSocket = () => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      // Get token from cookie/storage
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('accessToken='))
        ?.split('=')[1];

      if (token) {
        const socket = initializeSocket(token);

        // Initialize store listeners after socket connects
        socket.once('connect', () => {
          useCalendarStore.getState().initializeSocketListeners();
          useTaskStore.getState().initializeSocketListeners();
          console.log('✅ All socket listeners initialized');
        });

        // If already connected, initialize immediately
        if (socket.connected) {
          useCalendarStore.getState().initializeSocketListeners();
          useTaskStore.getState().initializeSocketListeners();
          console.log('✅ All socket listeners initialized (already connected)');
        }

        return () => {
          // Don't disconnect on unmount - keep connection alive
          // Only disconnect on logout (handled in authStore)
        };
      }
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  return getSocket();
};
