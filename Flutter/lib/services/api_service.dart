import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../config/config_api.dart';

/// Native client for the same JSON + Bearer + refresh-cookie API as React.
class ApiService {
  ApiService({String? baseUrl})
    : baseUrl = ApiConfig.normalize(baseUrl ?? ApiConfig.baseURL);
  final String baseUrl;
  final HttpClient _http = HttpClient()
    ..connectionTimeout = ApiConfig.connectTimeout;
  final ValueNotifier<int> sessionChanges = ValueNotifier(0);
  String? token;
  String? _refreshCookie;
  Map<String, dynamic>? user;
  Future<void>? _refreshing;
  void clearSession() {
    token = null;
    user = null;
    _refreshCookie = null;
    sessionChanges.value++;
  }

  void _setSession(dynamic data) {
    if (data is! Map ||
        data['accessToken'] is! String ||
        data['user'] is! Map) {
      throw const ApiException('Phản hồi đăng nhập không đúng định dạng API.');
    }
    token = data['accessToken'];
    user = Map<String, dynamic>.from(data['user']);
    sessionChanges.value++;
  }

  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
    bool retry = true,
    bool binary = false,
    Uint8List? uploadBytes,
    String? fileName,
  }) async {
    try {
      if (uploadBytes != null && uploadBytes.length > 5 * 1024 * 1024) {
        throw const ApiException('File Excel tối đa 5 MB.');
      }
      final parameters = <String, String>{};
      for (final entry in (query ?? <String, dynamic>{}).entries) {
        final value = entry.value;
        if (value == null ||
            value == '' ||
            (value is Iterable && value.isEmpty)) {
          continue;
        }
        parameters[entry.key] = value is Iterable ? value.join(',') : '$value';
      }
      final uri = Uri.parse('$baseUrl$path')
          .replace(queryParameters: parameters.isEmpty ? null : parameters);
      final sentToken = token;
      final req = await _http
          .openUrl(method, uri)
          .timeout(ApiConfig.requestTimeout);
      req.headers.contentType = ContentType.json;
      req.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (sentToken != null) {
        req.headers.set('Authorization', 'Bearer $sentToken');
      }
      if (path.startsWith('/auth/') && _refreshCookie != null) {
        req.headers.set('Cookie', _refreshCookie!);
      }
      if (uploadBytes != null) {
        final boundary = 'rightway-${DateTime.now().microsecondsSinceEpoch}';
        final crlf = String.fromCharCodes([13, 10]);
        final safe = String.fromCharCodes(
          (fileName ?? 'trips.xlsx').codeUnits.map(
            (c) => [34, 13, 10, 47, 92].contains(c) ? 95 : c,
          ),
        );
        req.headers.set(
          HttpHeaders.contentTypeHeader,
          'multipart/form-data; boundary=$boundary',
        );
        req.add(
          utf8.encode(
            '--$boundary${crlf}Content-Disposition: form-data; name="file"; filename="$safe"${crlf}Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet$crlf$crlf',
          ),
        );
        req.add(uploadBytes);
        req.add(utf8.encode('$crlf--$boundary--$crlf'));
      } else if (body != null) {
        req.write(jsonEncode(body));
      }
      final res = await req.close().timeout(ApiConfig.requestTimeout);
      for (final cookie in res.cookies) {
        if (cookie.name == 'refreshToken') {
          _refreshCookie = cookie.value.isEmpty
              ? null
              : '${cookie.name}=${cookie.value}';
        }
      }
      final responseBytes = await consolidateHttpClientResponseBytes(res)
          .timeout(ApiConfig.requestTimeout);
      if (binary && res.statusCode < 400) return responseBytes;
      final raw = utf8.decode(responseBytes, allowMalformed: true);
      dynamic data;
      try {
        data = raw.isEmpty ? null : jsonDecode(raw);
      } catch (_) {
        if (res.statusCode == 429) {
          throw const ApiException(
            'Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.',
            429,
            'RATE_LIMITED',
          );
        }
        throw ApiException(
          'Máy chủ trả về dữ liệu không hợp lệ (${res.statusCode}).',
          res.statusCode,
        );
      }
      if (res.statusCode == 401 &&
          retry &&
          !path.startsWith('/auth/') &&
          _refreshCookie != null) {
        // A delayed response with an old token need not rotate the cookie again.
        if (token == sentToken) {
          _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
          await _refreshing;
        }
        return await request(
          path,
          method: method,
          query: query,
          body: body,
          retry: false,
          binary: binary,
          uploadBytes: uploadBytes,
          fileName: fileName,
        );
      }
      if (res.statusCode >= 400) {
        final error = data is Map
            ? (data['error'] is Map ? data['error'] as Map : data)
            : <String, dynamic>{};
        final code = error['code']?.toString();
        if (res.statusCode == 401 && !path.startsWith('/auth/') ||
            code == 'ACCOUNT_LOCKED') {
          clearSession();
        }
        final details = error['details'];
        var message =
            error['message']?.toString() ??
            'Yêu cầu thất bại (${res.statusCode}).';
        if (code == 'VALIDATION_ERROR' && details is Map) {
          final fields = details['fieldErrors'];
          if (fields is Map) {
            final lines = fields.entries
                .where((e) => e.value is List && (e.value as List).isNotEmpty)
                .map((e) => '${e.key}: ${(e.value as List).join(', ')}');
            if (lines.isNotEmpty) message = lines.join('\n');
          }
        }
        throw ApiException(message, res.statusCode, code, details);
      }
      return data;
    } on SocketException {
      throw const ApiException(
        'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.',
      );
    } on TimeoutException {
      throw const ApiException('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    } on HttpException {
      throw const ApiException(
        'Kết nối bị gián đoạn. Vui lòng kiểm tra trạng thái đơn trước khi đặt lại.',
      );
    }
  }

  Future<void> _refresh() async {
    try {
      _setSession(await request('/auth/refresh', method: 'POST', retry: false));
    } catch (_) {
      clearSession();
      rethrow;
    }
  }

  Future<void> authenticate(
    Map<String, dynamic> body, {
    bool register = false,
  }) async {
    _setSession(
      await request(
        register ? '/auth/register' : '/auth/login',
        method: 'POST',
        body: body,
      ),
    );
  }

  Future<void> refreshProfile() async {
    final data = await request('/auth/me');
    if (data is! Map || data['user'] is! Map) {
      throw const ApiException('Thông tin tài khoản không hợp lệ.');
    }
    user = Map<String, dynamic>.from(data['user']);
    sessionChanges.value++;
  }

  Future<void> logout() async {
    try {
      await request('/auth/logout', method: 'POST');
    } finally {
      clearSession();
    }
  }

  void close() {
    _http.close(force: true);
    sessionChanges.dispose();
  }
}

class ApiException implements Exception {
  const ApiException(this.message, [this.status, this.code, this.details]);
  final String message;
  final int? status;
  final String? code;
  final dynamic details;
  @override
  String toString() => message;
}

final api = ApiService();
