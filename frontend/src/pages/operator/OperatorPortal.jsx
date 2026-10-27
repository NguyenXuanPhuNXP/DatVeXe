import {
  CounterSalePage,
  ExchangePage,
  QrInfoPage,
  QrBoardPage,
  PaymentIssuesPage,
} from "./CounterPages";
import { useCallback, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import api from "../../services/api";
import { AuthLoading } from "../../components/auth/RouteGuards";
import "../../styles/operator.css";

const labels = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  unpaid: "Chưa thu",
  paid: "Đã thu",
  refunded: "Đã ghi nhận hoàn tiền",
  owner: "Chủ nhà xe",
  manager: "Quản lý",
  staff: "Nhân viên thường",
};
const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : "Định kỳ";
const errorText = (e) =>
  e.response?.data?.error?.message ||
  "Không thể thực hiện thao tác. Vui lòng thử lại.";
function useData(path, params) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params || {});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(path, { params: JSON.parse(key) });
      setData(res.data);
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [path, key]);
  useEffect(() => {
    let active = true;
    api
      .get(path, { params: JSON.parse(key) })
      .then((res) => {
        if (active) {
          setData(res.data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  return { data, error, loading, load, setError };
}
function Notice({ error, loading }) {
  return (
    <>
      {error && (
        <p className="op-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang tải dữ liệu…</p>}
    </>
  );
}
function Editor({ title, fields, initial, onSave, onClose }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="op-backdrop">
      <section
        className="op-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2>{title}</h2>
        <form onSubmit={submit}>
          <Notice error={error} />
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.options ? (
                <select
                  required
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                >
                  <option value="">Chọn…</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={!f.optional}
                  type={f.type || "text"}
                  min={f.min}
                  max={f.max}
                  maxLength={f.maxLength}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [f.key]:
                        f.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
          <div className="op-actions">
            <button disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button>
            <button type="button" disabled={busy} onClick={onClose}>
              Đóng
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
const busFields = [
  { key: "name", label: "Tên / biển số xe", maxLength: 100 },
  { key: "type", label: "Loại xe", maxLength: 50 },
  { key: "totalSeats", label: "Số ghế", type: "number", min: 1, max: 297 },
];
export function BusesPage() {
  const state = useData("/operator/buses");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  async function remove(b) {
    if (!confirm(`Xóa xe ${b.name}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/operator/buses/${b.id}`);
      await state.load();
    } catch (e) {
      state.setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Quản lý xe</h1>
      <p>Đội xe của nhà xe. Không thể đổi số ghế khi còn vé đang hoạt động.</p>
      <button onClick={() => setEdit({ name: "", type: "", totalSeats: 40 })}>
        Thêm xe
      </button>
      <Notice {...state} />
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Xe</th>
              <th>Loại xe</th>
              <th>Số ghế</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.type}</td>
                <td>{b.totalSeats}</td>
                <td>
                  <button onClick={() => setEdit(b)}>Sửa</button>
                  <button disabled={busy} onClick={() => remove(b)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!state.loading && !state.data.length && <p>Chưa có xe.</p>}
      {edit && (
        <Editor
          title={edit.id ? "Sửa xe" : "Thêm xe"}
          fields={busFields}
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            const body = Object.fromEntries(
              busFields.map((f) => [f.key, v[f.key]]),
            );
            await (edit.id
              ? api.put(`/operator/buses/${edit.id}`, body)
              : api.post("/operator/buses", body));
            await state.load();
          }}
        />
      )}
    </>
  );
}
export function EmployeesPage() {
  const { user } = useAuth();
  const owner = user.companyMembership.role === "owner";
  const state = useData("/operator/employees");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const fields = [
    { key: "fullName", label: "Họ tên", maxLength: 120 },
    ...(!edit?.id
      ? [
          { key: "email", label: "Email đăng nhập", type: "email" },
          { key: "password", label: "Mật khẩu (8–72 ký tự)", type: "password" },
        ]
      : []),
    ...(owner
      ? [
          {
            key: "role",
            label: "Vai trò",
            options: [
              { value: "manager", label: "Quản lý" },
              { value: "staff", label: "Nhân viên thường" },
            ],
          },
        ]
      : []),
  ];
  async function toggle(m) {
    setBusy(true);
    try {
      await api.patch(`/operator/employees/${m.id}`, { isActive: !m.isActive });
      await state.load();
    } catch (e) {
      state.setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Quản lý nhân viên</h1>
      <p>
        {owner
          ? "Cấp quyền quản lý hoặc nhân viên thường trong nhà xe."
          : "Bạn có thể thêm, sửa tên và khóa quyền làm việc của nhân viên thường."}
      </p>
      <button
        onClick={() =>
          setEdit({ fullName: "", email: "", password: "", role: "staff" })
        }
      >
        Thêm nhân viên
      </button>
      <Notice {...state} />
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Quyền làm việc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((m) => (
              <tr key={m.id}>
                <td>{m.user.fullName}</td>
                <td>{m.user.email}</td>
                <td>{labels[m.role]}</td>
                <td>{m.isActive ? "Đang hoạt động" : "Đã khóa"}</td>
                <td>
                  <button
                    onClick={() => setEdit({ ...m, fullName: m.user.fullName })}
                  >
                    Sửa
                  </button>
                  <button disabled={busy} onClick={() => toggle(m)}>
                    {m.isActive ? "Khóa" : "Mở khóa"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!state.loading && !state.data.length && <p>Chưa có nhân viên.</p>}
      {edit && (
        <Editor
          title={edit.id ? "Sửa nhân viên" : "Thêm nhân viên"}
          fields={fields}
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            const body = Object.fromEntries(
              fields.map((f) => [f.key, v[f.key]]),
            );
            await (edit.id
              ? api.patch(`/operator/employees/${edit.id}`, body)
              : api.post("/operator/employees", {
                  ...body,
                  role: owner ? v.role : "staff",
                }));
            await state.load();
          }}
        />
      )}
    </>
  );
}
export function TripsPage() {
  const state = useData("/operator/trips");
  const buses = useData("/operator/buses");
  const routes = useData("/operator/routes");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const fields = [
    {
      key: "routeId",
      label: "Tuyến",
      options: routes.data.map((r) => ({
        value: r.id,
        label: r.origin + " → " + r.destination,
      })),
    },
    {
      key: "busId",
      label: "Xe",
      options: buses.data.map((b) => ({ value: b.id, label: b.name })),
    },
    { key: "departureTime", label: "Giờ khởi hành", type: "time" },
    { key: "arrivalTime", label: "Giờ đến", type: "time" },
    { key: "duration", label: "Thời lượng (ví dụ 5h 30p)" },
    { key: "price", label: "Giá vé (đ)", type: "number", min: 1 },
    {
      key: "availableDate",
      label: "Ngày chạy (bỏ trống: định kỳ)",
      type: "date",
      optional: true,
    },
  ];
  async function action(t, remove) {
    if (remove && !confirm("Xóa chuyến chưa có vé?")) return;
    setBusy(true);
    try {
      await (remove
        ? api.delete(`/operator/trips/${t.id}`)
        : api.put(`/operator/trips/${t.id}`, { isActive: !t.isActive }));
      await state.load();
    } catch (e) {
      state.setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Quản lý chuyến</h1>
      <p>Lập lịch và giá vé cho các xe của nhà xe.</p>
      <button
        onClick={() =>
          setEdit({
            routeId: "",
            busId: "",
            departureTime: "08:00",
            arrivalTime: "13:00",
            duration: "5h",
            price: 200000,
            availableDate: "",
          })
        }
      >
        Thêm chuyến
      </button>
      <Notice {...state} />
      <Notice error={buses.error || routes.error} />
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Tuyến / Xe</th>
              <th>Giờ đi–đến</th>
              <th>Ngày</th>
              <th>Giá vé</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.route.origin} → {t.route.destination}
                  <br />
                  {t.bus.name}
                </td>
                <td>
                  {t.departureTime}–{t.arrivalTime}
                </td>
                <td>{date(t.availableDate)}</td>
                <td>{money(t.price)}</td>
                <td>{t.isActive ? "Đang mở" : "Tạm dừng"}</td>
                <td>
                  <button
                    onClick={() =>
                      setEdit({
                        ...t,
                        availableDate: t.availableDate?.slice(0, 10) || "",
                      })
                    }
                  >
                    Sửa
                  </button>
                  <button disabled={busy} onClick={() => action(t, false)}>
                    {t.isActive ? "Tạm dừng" : "Mở lại"}
                  </button>
                  <button disabled={busy} onClick={() => action(t, true)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!state.loading && !state.data.length && <p>Chưa có chuyến.</p>}
      {edit && (
        <Editor
          title={edit.id ? "Sửa chuyến" : "Thêm chuyến"}
          fields={fields}
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            const body = Object.fromEntries(
              fields.map((f) => [f.key, v[f.key]]),
            );
            body.availableDate = body.availableDate || null;
            await (edit.id
              ? api.put(`/operator/trips/${edit.id}`, body)
              : api.post("/operator/trips", body));
            await state.load();
          }}
        />
      )}
    </>
  );
}
export function BookingsPage({ customers = false, admin = false }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [day, setDay] = useState("");
  const [edit, setEdit] = useState(null);
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);
  const prefix = admin ? "/admin" : "/operator";
  const state = useData(`${prefix}/${customers ? "customers" : "bookings"}`, {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(day ? { date: day } : {}),
  });
  async function transition(b, next) {
    if (!confirm(`Chuyển vé ${b.bookingCode} sang ${labels[next]}?`)) return;
    setBusy(true);
    try {
      await api.patch(`${prefix}/bookings/${b.id}/status`, { status: next });
      await state.load();
    } catch (e) {
      state.setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>{customers ? "Quản lý thông tin khách" : "Quản lý vé"}</h1>
      <p>
        {customers
          ? "Thông tin liên hệ theo từng đơn vé, đồng bộ với vé hành khách."
          : "Duyệt vé, theo dõi ghế và ghi nhận khoản tiền thực tế đã thu."}
      </p>
      <div className="op-filters">
        <input
          aria-label="Tìm khách hoặc mã vé"
          placeholder="Tìm mã vé, tên, điện thoại, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Trạng thái vé"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {["pending", "confirmed", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </select>
        <input
          aria-label="Ngày khởi hành"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>
      <Notice {...state} />
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Mã vé / Khách</th>
              <th>Liên hệ</th>
              <th>Chuyến / Ghế</th>
              <th>Trạng thái</th>
              <th>Tiền vé</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.bookingCode}</strong>
                  <br />
                  {b.passengerName}
                </td>
                <td>
                  {b.passengerPhone}
                  <br />
                  {b.passengerEmail}
                </td>
                <td>
                  {b.trip?.route?.origin} → {b.trip?.route?.destination}
                  <br />
                  {date(b.tripDate)} {b.trip?.departureTime}
                  <br />
                  {b.seatCode}
                </td>
                <td>
                  {labels[b.status]}
                  <br />
                  {labels[b.paymentStatus]}
                </td>
                <td>
                  {money(b.totalPrice)}
                  {b.receipt && (
                    <small>
                      Thu {date(b.receipt.receivedAt)} ·{" "}
                      {b.receipt.reference || "Tiền mặt"}
                    </small>
                  )}
                </td>
                <td>
                  {customers ? (
                    ["pending", "confirmed"].includes(b.status) && (
                      <button onClick={() => setEdit(b)}>Sửa liên hệ</button>
                    )
                  ) : (
                    <>
                      {b.status === "pending" && (
                        <button
                          disabled={busy}
                          onClick={() => transition(b, "confirmed")}
                        >
                          Duyệt vé
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button
                          disabled={busy}
                          onClick={() => transition(b, "completed")}
                        >
                          Hoàn thành
                        </button>
                      )}
                      {["pending", "confirmed"].includes(b.status) && (
                        <button
                          disabled={busy}
                          onClick={() => transition(b, "cancelled")}
                        >
                          Hủy vé
                        </button>
                      )}
                      {b.status !== "cancelled" &&
                        b.paymentStatus === "unpaid" && (
                          <button onClick={() => setPayment(b)}>
                            Ghi nhận thu tiền
                          </button>
                        )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!state.loading && !state.data.length && <p>Không có dữ liệu phù hợp.</p>}
      {edit && (
        <Editor
          title="Sửa thông tin liên hệ"
          fields={[
            { key: "passengerName", label: "Họ tên" },
            { key: "passengerPhone", label: "Điện thoại (10 số)" },
            { key: "passengerEmail", label: "Email", type: "email" },
          ]}
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            await api.patch(`/operator/customers/${edit.id}`, {
              passengerName: v.passengerName,
              passengerPhone: v.passengerPhone,
              passengerEmail: v.passengerEmail,
            });
            await state.load();
          }}
        />
      )}
      {payment && (
        <Editor
          title={`Xác nhận đã thu ${money(payment.totalPrice)} · ${payment.bookingCode}`}
          fields={[
            {
              key: "method",
              label: "Phương thức thực tế",
              options: [
                { value: "cash", label: "Tiền mặt" },
                { value: "bank_transfer", label: "Chuyển khoản" },
              ],
            },
            {
              key: "reference",
              label: "Mã giao dịch (bắt buộc nếu chuyển khoản)",
              optional: true,
              maxLength: 100,
            },
          ]}
          initial={{ method: "cash", reference: "" }}
          onClose={() => setPayment(null)}
          onSave={async (v) => {
            await api.post(`${prefix}/bookings/${payment.id}/payment`, {
              method: v.method,
              ...(v.reference ? { reference: v.reference } : {}),
            });
            await state.load();
          }}
        />
      )}
    </>
  );
}
export function RevenuePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const state = useData("/operator/revenue", {
    ...(from ? { fromDate: from } : {}),
    ...(to ? { toDate: to } : {}),
  });
  return (
    <>
      <h1>Thống kê doanh thu</h1>
      <p>
        Lọc theo ngày thu tiền (giờ Việt Nam). Chỉ tính khoản thu có biên nhận;
        loại khoản đã ghi nhận hoàn tiền khỏi doanh thu.
      </p>
      <div className="op-filters">
        <label>
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <Notice {...state} />
      <div className="op-stats">
        <article>
          <span>Doanh thu sau hoàn</span>
          <strong>{money(state.data.netRevenue)}</strong>
        </article>
        <article>
          <span>Đã ghi nhận hoàn tiền</span>
          <strong>{money(state.data.refunded)}</strong>
        </article>
        <article>
          <span>Số khoản thu</span>
          <strong>{state.data.receipts?.length || 0}</strong>
        </article>
      </div>
      <p>Chênh lệch đổi vé đã thu/hoàn: {money(state.data.adjustmentTotal)}</p>
      {state.data.adjustments?.length > 0 && (
        <div className="op-table">
          <table>
            <thead>
              <tr>
                <th>Đơn đổi vé</th>
                <th>Ngày đổi</th>
                <th>Chênh lệch</th>
                <th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {state.data.adjustments.map((a) => (
                <tr key={a.id}>
                  <td>{a.booking.bookingCode}</td>
                  <td>{date(a.createdAt)}</td>
                  <td>{money(a.difference)}</td>
                  <td>
                    {a.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}{" "}
                    {a.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Mã vé</th>
              <th>Ngày thu</th>
              <th>Số tiền</th>
              <th>Phương thức / Tham chiếu</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {state.data.receipts?.map((r) => (
              <tr key={r.id}>
                <td>{r.booking.bookingCode}</td>
                <td>{date(r.receivedAt)}</td>
                <td>{money(r.amount)}</td>
                <td>
                  {r.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                  <br />
                  {r.reference}
                </td>
                <td>{labels[r.booking.paymentStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export default function OperatorPortal() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  const member = user.companyMembership;
  if (!member?.isActive) return <Navigate to="/" replace />;
  const owner = member.role === "owner";
  const base = owner ? "/company" : "/staff";
  if (!location.pathname.startsWith(base))
    return <Navigate to={`${base}/bookings`} replace />;
  const links = [
    ...(owner
      ? [
          ["buses", "Quản lý xe"],
          ["trips", "Quản lý chuyến"],
        ]
      : []),
    ["bookings", "Quản lý vé"],
    ["counter", "Bán vé tại quầy"],
    ["exchange", "Đổi ghế / chuyến"],
    ["qr-info", "Quét QR xem vé"],
    ["qr-board", "Quét QR lên xe"],
    ...(!owner ? [["customers", "Thông tin khách"]] : []),
    ...(["owner", "manager"].includes(member.role)
      ? [
          ["employees", "Quản lý nhân viên"],
          ["payment-issues", "Đối soát thanh toán"],
        ]
      : []),
    ...(owner ? [["revenue", "Thống kê doanh thu"]] : []),
  ];
  return (
    <div className="op-layout">
      <aside>
        <Link className="op-brand" to="/">
          Rightway
        </Link>
        <h2>{member.company?.name}</h2>
        <p>
          {labels[member.role]} · {user.fullName || user.email}
        </p>
        <nav>
          {links.map(([path, label]) => (
            <NavLink key={path} to={`${base}/${path}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/">Trang khách hàng</Link>
        <button onClick={logout}>Đăng xuất</button>
      </aside>
      <main>
        <Routes>
          <Route path={`${base}/bookings`} element={<BookingsPage />} />
          <Route path={`${base}/counter`} element={<CounterSalePage />} />
          <Route path={`${base}/exchange`} element={<ExchangePage />} />
          <Route path={`${base}/qr-info`} element={<QrInfoPage />} />
          <Route path={`${base}/qr-board`} element={<QrBoardPage />} />
          {["owner", "manager"].includes(member.role) && (
            <Route
              path={`${base}/payment-issues`}
              element={<PaymentIssuesPage />}
            />
          )}
          {owner ? (
            <>
              <Route path={`${base}/buses`} element={<BusesPage />} />
              <Route path={`${base}/trips`} element={<TripsPage />} />
              <Route path={`${base}/revenue`} element={<RevenuePage />} />
            </>
          ) : (
            <Route
              path={`${base}/customers`}
              element={<BookingsPage customers />}
            />
          )}
          {["owner", "manager"].includes(member.role) && (
            <Route path={`${base}/employees`} element={<EmployeesPage />} />
          )}
          <Route
            path="*"
            element={<Navigate to={`${base}/bookings`} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}
export function CompanyAccessPage() {
  const state = useData("/admin/company-access");
  const users = useData("/admin/users");
  const companies = useData("/admin/companies");
  const [edit, setEdit] = useState(null);
  return (
    <div className="op-access">
      <h1>Phân quyền nhà xe</h1>
      <p>
        Gán tài khoản hiện có vào nhà xe. Chủ nhà xe cấp quyền quản lý; quản lý
        chỉ thêm nhân viên thường.
      </p>
      <button
        onClick={() => setEdit({ userId: "", companyId: "", role: "owner" })}
      >
        Cấp quyền
      </button>
      <Notice {...state} />
      <Notice error={users.error || companies.error} />
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Nhà xe</th>
              <th>Vai trò</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((m) => (
              <tr key={m.id}>
                <td>{m.user.email}</td>
                <td>{m.company.name}</td>
                <td>
                  {labels[m.role]} {!m.isActive && "(đã khóa)"}
                </td>
                <td>
                  <button
                    onClick={async () => {
                      if (!confirm("Thu hồi quyền làm việc tại nhà xe?"))
                        return;
                      try {
                        await api.delete(`/admin/company-access/${m.id}`);
                        await state.load();
                      } catch (e) {
                        state.setError(errorText(e));
                      }
                    }}
                  >
                    Thu hồi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Editor
          title="Cấp quyền nhà xe"
          fields={[
            {
              key: "userId",
              label: "Tài khoản",
              options: (Array.isArray(users.data)
                ? users.data
                : users.data.users || []
              ).map((u) => ({ value: u.id, label: u.email })),
            },
            {
              key: "companyId",
              label: "Nhà xe",
              options: companies.data.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            },
            {
              key: "role",
              label: "Vai trò",
              options: ["owner", "manager", "staff"].map((r) => ({
                value: r,
                label: labels[r],
              })),
            },
          ]}
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            await api.post("/admin/company-access", v);
            await state.load();
          }}
        />
      )}
    </div>
  );
}
