import { createContext, useContext } from "react";
// Keep the same context identity when Vite reloads this shared module.
export const NotificationContext = import.meta.hot?.data.context ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.context = NotificationContext;
export const useNotification = () => useContext(NotificationContext);
