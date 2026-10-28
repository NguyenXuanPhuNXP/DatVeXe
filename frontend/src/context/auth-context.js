import { createContext, useContext } from "react";
// Keep the same context identity when Vite reloads this shared module.
export const AuthContext = import.meta.hot?.data.context ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.context = AuthContext;
export function isAdminUser(user) {
  return Boolean(
    user?.roles?.some((role) => String(role).toLowerCase() === "admin"),
  );
}

export function isCustomerUser(user) {
  return Boolean(user && !user.companyMembership && user.roles?.length &&
    user.roles.every(role => String(role).toUpperCase() === 'USER'));
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function userHome(user) {
  if (isAdminUser(user)) return "/admin";
  const m = user?.companyMembership;
  if (m?.isActive && ['owner', 'manager', 'staff'].includes(m.role))
    return m.role === "owner" ? "/company/bookings" : "/staff/bookings";
  return !user || isCustomerUser(user) ? "/" : "/access-denied";
}
