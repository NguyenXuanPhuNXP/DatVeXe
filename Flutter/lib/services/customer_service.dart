import 'api_service.dart';

/// Endpoints mirror frontend/src/services/api.js and TicketPaymentPanel.jsx.
class CustomerService {
  CustomerService(this.client);
  final ApiService client;
  String segment(String id) => Uri.encodeComponent(id);
  Future<Map<String, dynamic>> object(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
  }) async {
    final data = await client.request(
      path,
      method: method,
      query: query,
      body: body,
    );
    if (data is! Map) {
      throw const ApiException('API không trả về đối tượng JSON.');
    }
    return Map<String, dynamic>.from(data);
  }

  Future<List<dynamic>> list(String path, {Map<String, dynamic>? query}) async {
    final data = await client.request(path, query: query);
    if (data is! List) {
      throw const ApiException('API không trả về danh sách JSON.');
    }
    return data;
  }

  Map<String, dynamic> access(String? phone) => {
    if (phone != null && phone.isNotEmpty) 'phone': phone,
  };
  Future<List<dynamic>> cities() => list('/routes/cities');
  Future<List<dynamic>> popularRoutes() => list('/routes/popular');
  Future<List<dynamic>> promotions() => list('/promotions');
  Future<List<dynamic>> news() => list('/news');
  Future<Map<String, dynamic>> newsById(String id) =>
      object('/news/${segment(id)}');
  Future<List<dynamic>> search(Map<String, dynamic> query) =>
      list('/trips/search', query: query);
  Future<Map<String, dynamic>> filterOptions() =>
      object('/trips/filter-options');
  Future<Map<String, dynamic>> trip(String id) =>
      object('/trips/${segment(id)}');
  Future<List<dynamic>> seats(String id, String date) =>
      list('/trips/${segment(id)}/seats', query: {'date': date});
  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> body) =>
      object('/bookings', method: 'POST', body: body);
  Future<List<dynamic>> myBookings() => list('/bookings/my-bookings');
  Future<Map<String, dynamic>> lookup(String code, String phone) => object(
    '/bookings/lookup',
    query: {'bookingCode': code.trim(), 'phone': phone.trim()},
  );
  Future<Map<String, dynamic>> booking(String id, {String? phone}) =>
      object('/bookings/${segment(id)}', query: access(phone));
  Future<Map<String, dynamic>> cancel(String id, {String? phone}) => object(
    '/bookings/${segment(id)}/cancel',
    method: 'PATCH',
    body: access(phone),
  );
  Future<Map<String, dynamic>> capabilities() =>
      object('/ticketing/capabilities');
  Future<Map<String, dynamic>> pay(String id, {String? phone}) => object(
    '/ticketing/bookings/${segment(id)}/vnpay',
    method: 'POST',
    body: access(phone),
  );
  Future<Map<String, dynamic>> tickets(String id, {String? phone}) => object(
    '/ticketing/bookings/${segment(id)}/tickets',
    query: access(phone),
  );
  Future<Map<String, dynamic>> delivery(String id, {String? phone}) => object(
    '/ticketing/bookings/${segment(id)}/delivery',
    query: access(phone),
  );
  Future<Map<String, dynamic>> resend(String id, {String? phone}) => object(
    '/ticketing/bookings/${segment(id)}/resend-email',
    method: 'POST',
    body: access(phone),
  );
}

final customer = CustomerService(api);
