import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/auth-context";

const labels = {
  pending: "Đang chờ",
  sending: "Đang gửi",
  sent: "Đã gửi",
  obsolete: "Vé đã thay đổi",
  succeeded: "Thành công",
  failed: "Thất bại",
  refund_required: "Cần đối soát hoàn tiền",
};
const time = (v) =>
  v
    ? new Date(v).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";
const message = (e) =>
  e.response?.data?.error?.message ||
  e.response?.data?.message ||
  "Chưa thực hiện được thao tác";

export default function IntegrationsPage({ admin = false }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const path = admin ? "/admin/integrations" : "/operator/email-jobs";
  const load = useCallback(async () => {
    try {
      const r = await api.get(path);
      setData(admin ? r.data : { emailJobs: r.data });
    } catch (e) {
      setNotice(message(e));
    }
  }, [path, admin]);
  useEffect(() => {
    let active = true;
    api
      .get(path)
      .then((r) => {
        if (active) setData(admin ? r.data : { emailJobs: r.data });
      })
      .catch((e) => {
        if (active) setNotice(message(e));
      });
    return () => {
      active = false;
    };
  }, [path, admin]);
  async function act(url, check = false) {
    setBusy(true);
    setNotice("");
    try {
      const r = await api.post(url, {});
      if (check) setData((old) => ({ ...old, ...r.data }));
      else {
        setNotice(r.data.message);
        await load();
      }
    } catch (e) {
      setNotice(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section style={{ padding: 20 }}>
      <h1>{admin ? "VNPAY và email" : "Theo dõi email vé"}</h1>
      <button type="button" disabled={busy} onClick={load}>
        Tải lại
      </button>
      {notice && <p role="status">{notice}</p>}
      {!data && <p>Đang tải…</p>}
      {admin && data && (
        <>
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              margin: "20px 0",
            }}
          >
            <article
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 20,
                flex: 1,
              }}
            >
              <h2>VNPAY · {data.vnpay.environment}</h2>
              <p>{data.vnpay.message}</p>
              <p>
                Return URL:{" "}
                <code style={{ overflowWrap: "anywhere" }}>
                  {data.vnpay.returnUrl || "Chưa có"}
                </code>
              </p>
              <p>
                IPN URL:{" "}
                <code style={{ overflowWrap: "anywhere" }}>
                  {data.vnpay.ipnUrl || "Chưa có"}
                </code>
              </p>
              {"ipnReachable" in data.vnpay && (
                <p>
                  IPN:{" "}
                  {data.vnpay.ipnReachable
                    ? "Truy cập được"
                    : "Chưa truy cập đúng API"}
                  . Trang trả về:{" "}
                  {data.vnpay.returnReachable
                    ? "Truy cập được"
                    : "Chưa truy cập được"}
                  .
                </p>
              )}
              <p>
                Đăng ký IPN URL này với VNPAY. Kiểm tra đường dẫn thành công
                chưa xác nhận một giao dịch đã thanh toán.
              </p>
            </article>
            <article
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 20,
                flex: 1,
              }}
            >
              <h2>Email</h2>
              <p>{data.smtp.message}</p>
              <p>Thư thử gửi đến tài khoản quản trị: {user.email}</p>
              <button
                disabled={busy || !data.smtp.configured}
                onClick={() => act("/admin/integrations/test-email")}
              >
                Gửi email thử đến tài khoản của tôi
              </button>
              <p>
                SMTP nhận thư chưa bảo đảm thư đã vào Hộp thư đến. Kiểm tra cả
                Spam.
              </p>
            </article>
          </div>
          <p>
            Database: {data.database?.connected ? "Đã kết nối" : "Chưa kết nối"}
            . {data.database?.message}
          </p>
          <button
            disabled={busy}
            onClick={() => act("/admin/integrations/check", true)}
          >
            {busy ? "Đang kiểm tra…" : "Kiểm tra SMTP và đường dẫn VNPAY"}
          </button>
          {data.checkedAt && <p>Kiểm tra lúc {time(data.checkedAt)}</p>}
          <h2>Giao dịch gần đây</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã vé</th>
                  <th>Cổng</th>
                  <th>Mã tham chiếu</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Tạo lúc</th>
                </tr>
              </thead>
              <tbody>
                {(data.payments || []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.booking.bookingCode}</td>
                    <td>{p.provider}</td>
                    <td>{p.orderId}</td>
                    <td>{p.amount.toLocaleString("vi-VN")} đ</td>
                    <td>{labels[p.status] || p.status}</td>
                    <td>{time(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.payments?.length && <p>Chưa có giao dịch được ghi nhận.</p>}
        </>
      )}
      <h2>Email vé gần đây</h2>
      <p>
        Chỉ gửi lại vé đã thanh toán còn hiệu lực, tới địa chỉ email trên đơn.
        Vé thay đổi sẽ dùng QR mới.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã vé</th>
              <th>Email</th>
              <th>Trạng thái</th>
              <th>Số lần thử</th>
              <th>Gửi lúc / Thử lại</th>
              <th>Thông báo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {(data?.emailJobs || []).map((j) => (
              <tr key={j.id}>
                <td>{j.booking.bookingCode}</td>
                <td>{j.booking.passengerEmail}</td>
                <td>{labels[j.status] || j.status}</td>
                <td>{j.attempts}</td>
                <td>{time(j.sentAt || j.nextAttemptAt)}</td>
                <td>{j.lastError || "—"}</td>
                <td>
                  <button
                    disabled={
                      busy ||
                      j.status === "sending" ||
                      j.version !== j.booking.qrVersion ||
                      j.booking.paymentStatus !== "paid" ||
                      j.booking.status === "cancelled"
                    }
                    onClick={() =>
                      act(
                        `${admin ? "/admin/integrations" : "/operator"}/bookings/${j.bookingId}/resend-email`,
                      )
                    }
                  >
                    Gửi lại
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && !data.emailJobs?.length && (
        <p>Chưa có email vé trong hàng đợi.</p>
      )}
    </section>
  );
}
