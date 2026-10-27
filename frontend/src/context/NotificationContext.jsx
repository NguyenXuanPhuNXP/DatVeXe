import { useCallback, useEffect, useRef, useState } from "react";
import { bookingService } from "../services/api";
import { useAuth } from "./auth-context";
import { NotificationContext } from "./notification-context";

function read(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable. */
  }
}
function summary(b) {
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    passengerName: b.passengerName,
    passengerPhone: b.passengerPhone,
    status: b.status,
    paymentStatus: b.paymentStatus,
    totalPrice: b.totalPrice,
    seatCode: b.seatCode,
    tripDate: b.tripDate,
    origin: b.trip?.route?.origin,
    destination: b.trip?.route?.destination,
    company: b.trip?.company?.name,
    departureTime: b.trip?.departureTime,
    createdAt: b.createdAt,
  };
}
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  return (
    <AccountNotifications key={user?.id || "guest"} userId={user?.id}>
      {children}
    </AccountNotifications>
  );
}
function AccountNotifications({ children, userId }) {
  const account = userId ? `user_${userId}` : "guest";
  const notifKey = `datvexe_notifications_${account}`;
  const bookingKey = `datvexe_my_saved_bookings_${account}`;
  const [notifications, setNotifications] = useState(() => read(notifKey));
  const [savedBookings, setSavedBookings] = useState(() => read(bookingKey));
  const [activeToast, setActiveToast] = useState(null);
  const current = useRef(savedBookings);
  const timeout = useRef(null);
  useEffect(() => {
    current.current = savedBookings;
    save(bookingKey, savedBookings);
  }, [bookingKey, savedBookings]);
  useEffect(() => save(notifKey, notifications), [notifKey, notifications]);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const addNotification = useCallback((notif) => {
    const item = {
      ...notif,
      id: crypto.randomUUID(),
      isRead: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [item, ...prev].slice(0, 50));
    setActiveToast(item);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setActiveToast(null), 5000);
  }, []);
  const addSavedBooking = useCallback((b) => {
    if (!b?.bookingCode) return;
    setSavedBookings((prev) => {
      const item = summary(b);
      return [item, ...prev.filter((x) => x.bookingCode !== b.bookingCode)];
    });
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    bookingService
      .getMyBookings()
      .then((res) => {
        if (active && Array.isArray(res.data))
          setSavedBookings(res.data.map(summary));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);
  useEffect(() => {
    let active = true;
    let running = false;
    async function poll() {
      if (running || !current.current.length) return;
      running = true;
      try {
        const { data } = await bookingService.statusCheck(
          current.current.map((b) => b.bookingCode),
        );
        if (!active || !Array.isArray(data)) return;
        const before = current.current;
        const changed = data.filter((r) =>
          before.some(
            (l) => l.bookingCode === r.bookingCode && l.status !== r.status,
          ),
        );
        for (const r of changed) {
          const title = {
            confirmed: "Vé đã được duyệt",
            cancelled: "Vé đã bị hủy",
            completed: "Chuyến đi hoàn thành",
          }[r.status];
          if (title)
            addNotification({
              title,
              message: `Đơn vé ${r.bookingCode} đã cập nhật trạng thái.`,
              type: r.status === "cancelled" ? "danger" : "info",
              link: `/lookup?code=${r.bookingCode}`,
              bookingCode: r.bookingCode,
            });
        }
        setSavedBookings((prev) =>
          prev.map((l) => {
            const r = data.find((x) => x.bookingCode === l.bookingCode);
            return r
              ? { ...l, status: r.status, paymentStatus: r.paymentStatus }
              : l;
          }),
        );
      } catch {
        /* Keep local data when offline. */
      } finally {
        running = false;
      }
    }
    const interval = setInterval(poll, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [addNotification]);
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        savedBookings,
        activeToast,
        addNotification,
        addSavedBooking,
        unreadCount: notifications.filter((n) => !n.isRead).length,
        markAsRead: (id) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          ),
        markAllAsRead: () =>
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))),
        clearAll: () => setNotifications([]),
        dismissToast: () => setActiveToast(null),
      }}
    >
      {children}
      {activeToast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 2000,
            background: "white",
            padding: 20,
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            boxShadow: "0 8px 24px #0002",
            maxWidth: 360,
          }}
        >
          <strong>{activeToast.title}</strong>
          <p>{activeToast.message}</p>
          {activeToast.link && <a href={activeToast.link}>Xem vé</a>}
          <button
            aria-label="Đóng thông báo"
            onClick={() => setActiveToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
