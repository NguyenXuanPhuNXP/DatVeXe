import {DecodeHintType} from '@zxing/library';
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { TicketPaymentPanel } from "../TicketPaymentPanel";
const message = (e) =>
  e.response?.data?.message ||
  e.response?.data?.error?.message ||
  "Không thể thực hiện thao tác";
const currency = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function useTrips() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get("/operator/counter/trips")
      .then((r) => {
        if (active) setTrips(r.data);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, []);
  return { trips, error };
}
function TripFields({ trips, tripId, date, onTrip, onDate }) {
  return (
    <div className="op-filters">
      <label>
        Chuyến xe
        <select
          required
          value={tripId}
          onChange={(e) => onTrip(e.target.value)}
        >
          <option value="">Chọn chuyến</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.route.origin} → {t.route.destination} · {t.departureTime} ·{" "}
              {t.bus.name} · {currency(t.price)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ngày khởi hành
        <input
          type="date"
          required
          min={today()}
          value={date}
          onChange={(e) => onDate(e.target.value)}
        />
      </label>
    </div>
  );
}
function SeatPicker({ tripId, date, selected, onSelect }) {
  const [seats, setSeats] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get(`/trips/${tripId}/seats`, { params: { date } })
      .then((r) => {
        if (active) setSeats(r.data);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [tripId, date]);
  return (
    <section>
      <h3>Chọn ghế</h3>
      {error && <p role="alert">{error}</p>}
      {!seats && !error && <p>Đang kiểm tra ghế…</p>}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "14px 0" }}
      >
        {seats?.map((s) => (
          <button
            key={s.seatCode}
            type="button"
            disabled={s.status !== "available"}
            aria-pressed={selected.includes(s.seatCode)}
            style={{
              background: selected.includes(s.seatCode) ? "#2563eb" : "white",
              color: selected.includes(s.seatCode) ? "white" : undefined,
            }}
            onClick={() =>
              onSelect(
                selected.includes(s.seatCode)
                  ? selected.filter((x) => x !== s.seatCode)
                  : [...selected, s.seatCode],
              )
            }
          >
            {s.seatCode}
            {s.status !== "available" ? " · đã giữ" : ""}
          </button>
        ))}
      </div>
    </section>
  );
}
export function CounterSalePage() {
  const { trips, error: loadError } = useTrips();
  const [tripId, setTripId] = useState("");
  const [date, setDate] = useState(today);
  const [seats, setSeats] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const trip = trips.find((t) => t.id === tripId);
  async function sell(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!ack || !seats.length)
        throw Error("Cần chọn ghế và xác nhận đã thu tiền");
      const { data } = await api.post("/operator/counter/sales", {
        booking: {
          tripId,
          tripDate: date,
          seatCodes: seats,
          passengerName: name,
          passengerPhone: phone,
          passengerEmail: email,
          paymentMethod: method,
        },
        payment: { method, ...(reference ? { reference } : {}) },
      });
      setResult(data);
      setSeats([]);
      setAck(false);
    } catch (e) {
      setError(e.response ? message(e) : e.message);
    } finally {
      setBusy(false);
    }
  }
  const refresh = useCallback(async () => {
    if (!result) return;
    const { data } = await api.get(`/bookings/${result.id}`, {
      params: { phone: result.passengerPhone },
    });
    setResult(data);
  }, [result]);
  return (
    <>
      <h1>Bán vé tại quầy</h1>
      <p>
        Chọn chuyến, ghế, nhập thông tin khách và chỉ xác nhận sau khi thực tế
        thu đủ tiền. Vé và khoản thu được lưu cùng giao dịch.
      </p>
      {(error || loadError) && (
        <p className="op-error" role="alert">
          {error || loadError}
        </p>
      )}
      <form onSubmit={sell}>
        <TripFields
          trips={trips}
          tripId={tripId}
          date={date}
          onTrip={(v) => {
            setTripId(v);
            setSeats([]);
            setAck(false);
          }}
          onDate={(v) => {
            setDate(v);
            setSeats([]);
            setAck(false);
          }}
        />
        {tripId && (
          <SeatPicker
            key={tripId + date + String(result?.id)}
            tripId={tripId}
            date={date}
            selected={seats}
            onSelect={setSeats}
          />
        )}
        <div className="op-counter-fields">
          <label>
            Họ tên khách
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Điện thoại
            <input
              type="tel"
              required
              pattern="0[0-9]{9}"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label>
            Email nhận vé
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Phương thức đã thu
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Tiền mặt</option>
              <option value="bank_transfer">Chuyển khoản</option>
            </select>
          </label>
          <label>
            Mã tham chiếu
            <input
              required={method === "bank_transfer"}
              maxLength={100}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>
        <p>
          <strong>
            Tổng thu: {currency((trip?.price || 0) * seats.length)}
          </strong>
        </p>
        <label>
          <input
            type="checkbox"
            required
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />{" "}
          Tôi đã thu đủ số tiền trên từ khách
        </label>
        <p>
          <button disabled={busy || !seats.length || !ack}>
            {busy ? "Đang xuất vé…" : "Thu tiền và xuất vé"}
          </button>
        </p>
      </form>
      {result && (
        <>
          <p role="status">Đã xuất vé {result.bookingCode}</p>
          <TicketPaymentPanel booking={result} onRefresh={refresh} />
        </>
      )}
    </>
  );
}
export function ExchangePage() {
  const { trips, error: loadError } = useTrips();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [booking, setBooking] = useState(null);
  const [tripId, setTripId] = useState("");
  const [date, setDate] = useState(today);
  const [seats, setSeats] = useState([]);
  const [quote, setQuote] = useState(null);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function find(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.get("/operator/bookings", {
        params: { search, status: "confirmed" },
      });
      setMatches(data.filter((b) => b.paymentStatus === "paid"));
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const body = () => ({ tripId, tripDate: date, seatCodes: seats });
  function reset() {
    setQuote(null);
    setAck(false);
  }
  async function calculate() {
    setBusy(true);
    try {
      const { data } = await api.post(
        `/operator/bookings/${booking.id}/exchange/quote`,
        body(),
      );
      setQuote(data);
      setAck(false);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function exchange() {
    setBusy(true);
    try {
      const { data } = await api.post(
        `/operator/bookings/${booking.id}/exchange`,
        {
          ...body(),
          expectedTotal: quote.newTotal,
          expectedDifference: quote.difference,
          expectedVersion: quote.version,
          settleDifference: ack,
          method,
          ...(reference ? { reference } : {}),
        },
      );
      setBooking(data);
      setQuote(null);
      setMatches([]);
      setError(
        "Đổi vé thành công. QR mới đã được cấp và xếp lịch gửi về email; QR cũ không còn hiệu lực.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Đổi ghế / đổi chuyến tại quầy</h1>
      <p>
        Đổi trong cùng nhà xe, giữ nguyên số lượng vé. Vé đã lên xe hoặc chuyến
        đã khởi hành không được đổi.
      </p>
      {(error || loadError) && (
        <p role="status" className="op-error">
          {error || loadError}
        </p>
      )}
      <form onSubmit={find} className="op-filters">
        <input
          required
          aria-label="Mã vé hoặc điện thoại"
          placeholder="Mã vé hoặc điện thoại"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button disabled={busy}>Tìm vé</button>
      </form>
      {matches.map((b) => (
        <button
          key={b.id}
          onClick={() => {
            setBooking(b);
            setTripId(b.tripId);
            setDate(b.tripDate.slice(0, 10));
            setSeats([]);
            reset();
          }}
        >
          {b.bookingCode} · {b.passengerName} · {b.seatCode}
        </button>
      ))}
      {booking && (
        <>
          <p>
            Đơn <strong>{booking.bookingCode}</strong> · {booking.passengerName}{" "}
            · Ghế hiện tại {booking.seatCode} · Đã trả{" "}
            {currency(booking.totalPrice)} · Số vé: {booking.tickets.length}
          </p>
          <TripFields
            trips={trips}
            tripId={tripId}
            date={date}
            onTrip={(v) => {
              setTripId(v);
              setSeats([]);
              reset();
            }}
            onDate={(v) => {
              setDate(v);
              setSeats([]);
              reset();
            }}
          />
          {tripId && (
            <SeatPicker
              key={tripId + date}
              tripId={tripId}
              date={date}
              selected={seats}
              onSelect={(v) => {
                setSeats(v);
                reset();
              }}
            />
          )}
          <p>
            Ghế đang giữ của đơn vẫn hiện bận; để đổi một phần ghế, nhập đầy đủ
            danh sách ghế mới bên dưới.
          </p>
          <label>
            Danh sách ghế mới (ví dụ A1, B2)
            <input
              value={seats.join(", ")}
              onChange={(e) => {
                setSeats(
                  e.target.value
                    .toUpperCase()
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                );
                reset();
              }}
            />
          </label>
          <p>
            <button
              disabled={busy || seats.length !== booking.tickets.length}
              onClick={calculate}
            >
              Xem chênh lệch
            </button>
          </p>
          {quote && (
            <section className="op-stats">
              <article>
                <p>Giá vé mới: {currency(quote.newTotal)}</p>
                <strong>
                  {quote.difference > 0
                    ? "Thu thêm"
                    : quote.difference < 0
                      ? "Hoàn lại"
                      : "Không chênh lệch"}{" "}
                  {currency(Math.abs(quote.difference))}
                </strong>
                <label>
                  Hình thức xử lý
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="bank_transfer">Chuyển khoản</option>
                  </select>
                </label>
                <label>
                  Mã tham chiếu
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />{" "}
                  Đã xác nhận đổi vé
                  {quote.difference !== 0
                    ? " và đã thu/hoàn đủ chênh lệch tại quầy"
                    : ""}
                </label>
                <p>
                  <button disabled={busy || !ack} onClick={exchange}>
                    Xác nhận đổi và cấp QR mới
                  </button>
                </p>
              </article>
            </section>
          )}
        </>
      )}
    </>
  );
}
function Scanner({ onRead }) {
  const video = useRef(null);
  const controls = useRef(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  function stop() {
    controls.current?.stop();
    controls.current = null;
    for (const t of video.current?.srcObject?.getTracks?.() || []) t.stop();
    setRunning(false);
  }
  useEffect(
    () => () => {
      controls.current?.stop();
      for (const t of video.current?.srcObject?.getTracks?.() || []) t.stop();
    },
    [],
  );
  async function start() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          "Camera cần HTTPS hoặc localhost. Có thể chọn ảnh QR bên dưới.",
        );
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(new Map([[DecodeHintType.TRY_HARDER,true]]));
      const pureReader = new BrowserQRCodeReader(new Map([[DecodeHintType.PURE_BARCODE,true]]));
      let lastFallback=0;
      setRunning(true);
      controls.current = await reader.decodeFromVideoDevice(
        undefined,
        video.current,
        (result, _error, ctrl) => {
          if(!result && Date.now()-lastFallback>700){
            lastFallback=Date.now();
            try{result=pureReader.decode(video.current);}catch{/* Wait for a clearer frame. */}
          }
          if (result) {
            ctrl.stop();
            controls.current = null;
            setRunning(false);
            onRead(result.getText());
          }
        },
      );
    } catch (e) {
      setRunning(false);
      setError(e.message || "Không mở được camera");
    }
  }
  async function file(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    stop();
    setError("");
    if (selected.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5 MB");
      return;
    }
    const url = URL.createObjectURL(selected);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      let result;
      try{result=await new BrowserQRCodeReader().decodeFromImageUrl(url);}
      catch{
        // Native QR downloads are axis-aligned; pure mode avoids false finder patterns.
          result=await new BrowserQRCodeReader(new Map([[DecodeHintType.PURE_BARCODE,true]])).decodeFromImageUrl(url);
      }
      onRead(result.getText());
    } catch {
      setError("Không đọc được QR trong ảnh. Vui lòng chọn ảnh rõ hơn.");
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = "";
    }
  }
  return (
    <section>
      <button type="button" onClick={start} disabled={running}>
        Mở camera quét QR
      </button>
      <button type="button" onClick={stop} disabled={!running}>
        Dừng camera
      </button>
      <video
        ref={video}
        playsInline
        muted
        style={{
          display: running ? "block" : "none",
          width: "100%",
          maxWidth: 480,
          borderRadius: 12,
        }}
      />
      <label>
        Hoặc chọn ảnh QR
        <input type="file" accept="image/*" onChange={file} />
      </label>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function QrPage({ boarding }) {
  const { trips, error: loadError } = useTrips();
  const [tripId, setTripId] = useState("");
  const [date, setDate] = useState(today);
  const [qr, setQr] = useState("");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function inspect(value) {
    setQr(value);
    setInfo(null);
    setBusy(true);
    try {
      const { data } = await api.post("/operator/qr/inspect", { qr: value });
      setInfo({ ...data, qr: value });
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function board() {
    setBusy(true);
    try {
      const { data } = await api.post("/operator/qr/board", {
        qr: info.qr,
        tripId,
        tripDate: date,
      });
      setInfo((prev) => ({ ...prev, ticket: data }));
      setError("Đã xác nhận khách lên xe thành công.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>
        {boarding ? "Quét QR xác nhận lên xe" : "Quét QR xem thông tin vé"}
      </h1>
      <p>
        {boarding
          ? "Chọn đúng chuyến hôm nay, quét QR, kiểm tra thông tin rồi nhấn xác nhận lên xe."
          : "Trang này chỉ tra cứu thông tin, không đánh dấu khách đã lên xe."}
      </p>
      {boarding && (
        <TripFields
          trips={trips}
          tripId={tripId}
          date={date}
          onTrip={setTripId}
          onDate={setDate}
        />
      )}
      <Scanner onRead={inspect} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          inspect(qr);
        }}
      >
        <label>
          Nội dung QR (có thể dán để kiểm tra)
          <textarea
            required
            maxLength={6000}
            rows={3}
            value={qr}
            onChange={(e) => {
              setQr(e.target.value);
              setInfo(null);
            }}
            style={{ display: "block", width: "100%", maxWidth: 650 }}
          />
        </label>
        <button disabled={busy}>Đọc vé</button>
      </form>
      {(error || loadError) && (
        <p className="op-error" role="status">
          {error || loadError}
        </p>
      )}
      {info && (
        <article
          style={{
            background: "white",
            padding: 24,
            borderRadius: 12,
            marginTop: 20,
          }}
        >
          <h2>
            {info.ticket.ticketCode} · Ghế {info.ticket.seatCode}
          </h2>
          <p>
            Khách: {info.ticket.passengerName} · {info.ticket.passengerPhone}
          </p>
          <p>
            {info.booking.trip.route.origin} →{" "}
            {info.booking.trip.route.destination} ·{" "}
            {info.booking.tripDate.slice(0, 10)}{" "}
            {info.booking.trip.departureTime}
          </p>
          <p>
            Xe {info.booking.trip.bus.name} · Đơn {info.booking.bookingCode}
          </p>
          <p>
            {info.valid
              ? "Vé đã thanh toán, còn hiệu lực"
              : "Vé không đủ điều kiện lên xe"}
          </p>
          <p>
            {info.ticket.checkedInAt
              ? "Đã lên xe lúc " +
                new Date(info.ticket.checkedInAt).toLocaleString("vi-VN")
              : "Chưa xác nhận lên xe"}
          </p>
          {boarding && (
            <button
              disabled={
                busy ||
                !info.valid ||
                !!info.ticket.checkedInAt ||
                !tripId ||
                date !== today() ||
                info.booking.tripId !== tripId ||
                info.booking.tripDate.slice(0, 10) !== date
              }
              onClick={board}
            >
              Xác nhận khách đã lên xe
            </button>
          )}
        </article>
      )}
    </>
  );
}
export function QrInfoPage() {
  return <QrPage key="info" boarding={false} />;
}
export function QrBoardPage() {
  return <QrPage key="board" boarding />;
}
export function PaymentIssuesPage({ admin = false }) {
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get(admin ? "/admin/momo-issues" : "/operator/payment-issues")
      .then((r) => {
        if (active) setIssues(r.data);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [admin]);
  return (
    <>
      <h1>Đối soát MoMo cần hoàn tiền</h1>
      <p>
        Các khoản tiền được MoMo xác nhận sau khi đơn đã hết hạn, hủy hoặc đã
        thu bằng phương thức khác. Kiểm tra giao dịch và hoàn tiền trên tài
        khoản merchant MoMo, liên hệ khách qua thông tin dưới đây.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="op-table">
        <table>
          <thead>
            <tr>
              <th>Mã đơn / Khách</th>
              <th>Giao dịch MoMo</th>
              <th>Số tiền</th>
              <th>Lý do</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.booking.bookingCode}
                  <br />
                  {i.booking.passengerName}
                  <br />
                  {i.booking.passengerPhone}
                </td>
                <td>{i.transId}</td>
                <td>{currency(i.amount)}</td>
                <td>{i.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!issues.length && !error && <p>Không có khoản tiền cần đối soát.</p>}
    </>
  );
}
