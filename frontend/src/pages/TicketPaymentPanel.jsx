import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { bookingService } from "../services/api";
import { useAuth } from "../context/auth-context";

export function TicketPaymentPanel({ booking, onRefresh, showContinuePayment = false }) {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const paid =
    booking.paymentStatus === "paid" && booking.status !== "cancelled";
  const deadline = new Date(
    booking.expiresAt || new Date(booking.createdAt).getTime() + 300000,
  ).getTime();
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (paid || booking.status === "cancelled") return;
    const timer = setInterval(onRefresh, 3000);
    return () => clearInterval(timer);
  }, [paid, booking.status, onRefresh]);
  useEffect(() => {
    let active = true;
    if (!paid) return;
    api
      .get(`/ticketing/bookings/${booking.id}/tickets`, {
        params: { phone: booking.passengerPhone },
      })
      .then((r) => {
        if (active) {
          setAssets({
            ...r.data,
            bookingId: booking.id,
            version: booking.qrVersion,
          });
          setError("");
        }
      })
      .catch((e) => {
        if (active)
          setError(e.response?.data?.message || "Chưa tải được QR vé");
      });
    return () => {
      active = false;
    };
  }, [paid, booking.id, booking.qrVersion, booking.passengerPhone]);
  async function vnpay() {
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(
        "vnpayBooking",
        JSON.stringify({
          id: booking.id,
          code: booking.bookingCode,
          phone: booking.passengerPhone,
        }),
      );
      const { data } = await api.post(
        `/ticketing/bookings/${booking.id}/vnpay`,
        { phone: booking.passengerPhone },
      );
      window.location.assign(data.payUrl);
    } catch (e) {
      setError(e.response?.data?.message || "Chưa mở được VNPAY");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    try {
      await api.post(`/ticketing/bookings/${booking.id}/resend-email`, {
        phone: booking.passengerPhone,
      });
      setError("Đã yêu cầu gửi lại vé về email trên đơn.");
    } catch (e) {
      setError(e.response?.data?.message || "Chưa gửi lại được email");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="ticket-payment-panel"
      style={{
        padding: 20,
        border: "1px solid #d7e0ed",
        borderRadius: 12,
        margin: "20px 0",
        background: "#f8fafc",
      }}
    >
      {error && <p role="status">{error}</p>}
      {paid ? (
        <>
          <h3>Vé điện tử đã thanh toán</h3>
          <p>
            QR riêng cho từng ghế. Xuất trình QR khi lên xe; QR cũ sẽ mất hiệu
            lực sau khi đổi vé.
          </p>
          <p>
            {booking.emailJobs?.[0]?.status === "sent"
              ? "Vé đã gửi về email của bạn."
              : "Vé đang chờ gửi email. Bạn có thể tải QR dưới đây để sử dụng ngay."}
          </p>
          <button type="button" onClick={resend} disabled={busy}>
            Gửi lại vé qua email
          </button>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {(assets?.bookingId === booking.id &&
            assets?.version === booking.qrVersion
              ? assets.tickets
              : []
            ).map((t) => (
              <article
                key={t.id}
                style={{
                  background: "white",
                  padding: 16,
                  borderRadius: 8,
                  maxWidth: 380,
                  textAlign: "center",
                }}
              >
                <h4>Ghế {t.seatCode}</h4>
                <p>{t.ticketCode}</p>
                <img
                  src={t.qrImage}
                  width="320"
                  height="320"
                  alt={`QR vé ghế ${t.seatCode}`}
                />
                <br />
                <a href={t.qrImage} download={`${t.ticketCode}.png`}>
                  Tải QR vé
                </a>
                {t.checkedInAt && <p>Đã lên xe</p>}
              </article>
            ))}
          </div>
        </>
      ) : booking.status === "cancelled" ? (
        <>
          <h3>Đơn đã hủy</h3>
          <p>
            Ghế đã được giải phóng. Nếu VNPAY ghi nhận tiền sau thời hạn, nhà xe
            sẽ đối soát khoản tiền cần hoàn.
          </p>
          {booking.paymentAttempts?.length > 0 && (
            <p role="alert">
              VNPAY đã ghi nhận khoản tiền cần đối soát và hoàn lại. Vui lòng
              liên hệ nhà xe, cung cấp mã đặt vé.
            </p>
          )}
        </>
      ) : (
        <>
          <h3>
            Giữ ghế còn {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, "0")}
          </h3>
          <p>
            Thanh toán trong 5 phút từ lúc tạo đơn. Hết hạn, đơn tự hủy và ghế
            được mở lại cho khách khác.
          </p>
          {showContinuePayment && user?.id === booking.userId && seconds > 0 && booking.paymentStatus === 'unpaid' && booking.status === 'pending' && (
            <Link className="btn-primary" style={{ display: 'inline-block', margin: '8px 12px 8px 0' }} to={`/booking/payment?bookingId=${encodeURIComponent(booking.id)}`}>
              Tiếp tục thanh toán
            </Link>
          )}
          <button
            type="button"
            disabled={busy || seconds === 0}
            onClick={vnpay}
          >
            {busy ? "Đang kết nối…" : "Thanh toán bằng VNPAY"}
          </button>
          <p>
            Nếu thanh toán tại quầy/chuyển khoản, nhân viên phải xác nhận khoản
            thu trước khi hết hạn.
          </p>
        </>
      )}
    </section>
  );
}
export default function VnpayReturnPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("vnpayBooking") || "null",
      );
      if (!saved) {
        setError(
          "Vui lòng tra cứu vé bằng mã đặt vé và điện thoại để kiểm tra thanh toán.",
        );
        return;
      }
      const { data } = await bookingService.getById(saved.id, saved.phone);
      setResult(data);
      setError("");
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Chưa nhận được kết quả. Vui lòng tra cứu vé.",
      );
    }
  }, []);
  useEffect(() => {
    let active = true;
    let attempts = 0;
    Promise.resolve().then(() => {
      if (active) refresh();
    });
    const timer = setInterval(() => {
      if (active && attempts++ < 20) refresh();
      else clearInterval(timer);
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <div className="container" style={{ padding: "40px 16px" }}>
      <h1>Kết quả thanh toán VNPAY</h1>
      <p>
        Trạng thái được lấy từ hệ thống sau khi xác minh thông báo của VNPAY.
      </p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p>
            Mã đặt vé: <strong>{result.bookingCode}</strong>
          </p>
          <TicketPaymentPanel booking={result} onRefresh={refresh} />
          <Link to={`/lookup?code=${result.bookingCode}`}>
            Xem chi tiết đặt vé
          </Link>
        </>
      )}
      <p>
        <Link to="/lookup">Tra cứu vé</Link>
      </p>
    </div>
  );
}
