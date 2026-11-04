import 'package:flutter_dotenv/flutter_dotenv.dart';

/// All environment-specific values come from the project's .env asset.
class ApiConfig {
  static String value(String key) {
    final result = dotenv.env[key]?.trim();
    if (result == null || result.isEmpty) {
      throw StateError('Thiếu cấu hình $key trong .env.');
    }
    return result;
  }

  static int positiveInt(String key) {
    final result = int.tryParse(value(key));
    if (result == null || result <= 0) {
      throw StateError('$key trong .env phải là số nguyên dương.');
    }
    return result;
  }

  static String get baseURL => normalize(value('API_BASE_URL'));
  static String get appName => value('APP_NAME');
  static String get heroImage => dotenv.env['HERO_IMAGE_URL']?.trim() ?? '';
  static Duration get connectTimeout =>
      Duration(seconds: positiveInt('CONNECT_TIMEOUT_SECONDS'));
  static Duration get requestTimeout =>
      Duration(seconds: positiveInt('REQUEST_TIMEOUT_SECONDS'));
  static int get bookingAdvanceDays => positiveInt('BOOKING_ADVANCE_DAYS');

  static void validate() {
    baseURL;
    appName;
    connectTimeout;
    requestTimeout;
    bookingAdvanceDays;
  }

  static String normalize(String value) {
    final clean = value.trim().replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(clean);
    if (uri == null ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        !['http', 'https'].contains(uri.scheme) ||
        uri.hasQuery ||
        uri.hasFragment ||
        uri.userInfo.isNotEmpty) {
      throw ArgumentError(
        'API_BASE_URL trong .env phải là URL HTTP/HTTPS hợp lệ, bao gồm /api.',
      );
    }
    return clean;
  }
}
