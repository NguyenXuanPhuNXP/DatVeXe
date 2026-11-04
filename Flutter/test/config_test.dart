import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/config/config_api.dart';

void main() {
  setUp(() {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
  });
  test('Loads system settings from .env', () {
    ApiConfig.validate();
    expect(ApiConfig.baseURL, dotenv.env['API_BASE_URL']);
    expect(
      ApiConfig.connectTimeout.inSeconds,
      int.parse(dotenv.env['CONNECT_TIMEOUT_SECONDS']!),
    );
    expect(
      ApiConfig.requestTimeout.inSeconds,
      int.parse(dotenv.env['REQUEST_TIMEOUT_SECONDS']!),
    );
    expect(ApiConfig.appName, dotenv.env['APP_NAME']);
  });
  test('Rejects missing values and invalid timeout settings', () {
    dotenv.loadFromString(envString: 'CONNECT_TIMEOUT_SECONDS=0');
    expect(() => ApiConfig.connectTimeout, throwsStateError);
    expect(() => ApiConfig.baseURL, throwsStateError);
    dotenv.loadFromString(envString: 'REQUEST_TIMEOUT_SECONDS=invalid');
    expect(() => ApiConfig.requestTimeout, throwsStateError);
  });
  test('Normalizes whitespace and trailing slash in API base URL', () {
    expect(
      ApiConfig.normalize(' http://10.0.2.2:3000/api/ '),
      'http://10.0.2.2:3000/api',
    );
    expect(
      ApiConfig.normalize('https://example.com/api'),
      'https://example.com/api',
    );
  });
  test('Rejects invalid API URLs and embedded credentials', () {
    for (final url in [
      '',
      'localhost:3000/api',
      'ftp://example.com/api',
      'http://',
      'https://example.com/api?q=1',
      'https://example.com/api#part',
      'https://user:pass@example.com/api',
    ]) {
      expect(() => ApiConfig.normalize(url), throwsArgumentError, reason: url);
    }
  });
}
