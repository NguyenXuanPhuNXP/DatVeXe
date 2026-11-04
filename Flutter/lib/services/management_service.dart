import 'package:flutter/services.dart';

import 'api_service.dart';
import 'customer_service.dart';

/// Shared CRUD transport. Resource definitions contain only fields accepted by Develops.
class ManagementService {
  ManagementService(this.client) : json = CustomerService(client);
  final ApiService client;
  final CustomerService json;
  Future<List<dynamic>> list(String path, {Map<String, dynamic>? query}) async {
    final data = await client.request(path, query: query);
    if (data is List) return data;
    if (data is Map) {
      for (final key in [
        'users',
        'roles',
        'items',
        'bookings',
        'anomalies',
        'data',
      ]) {
        if (data[key] is List) return data[key];
      }
    }
    throw const ApiException('Danh sách API không đúng định dạng.');
  }

  Future<void> save(
    String path,
    Map<String, dynamic> body, {
    String? id,
    String method = 'PUT',
  }) async {
    await client.request(
      id == null ? path : '$path/${Uri.encodeComponent(id)}',
      method: id == null ? 'POST' : method,
      body: body,
    );
  }

  Future<void> delete(String path, String id) async {
    await client.request('$path/${Uri.encodeComponent(id)}', method: 'DELETE');
  }

  Future<Uint8List> download(
    String path, {
    Map<String, dynamic>? query,
  }) async =>
      await client.request(path, query: query, binary: true) as Uint8List;
  Future<Map<String, dynamic>> upload(
    String path,
    Uint8List bytes,
    String name, {
    String? sheet,
  }) async {
    final data = await client.request(
      path,
      method: 'POST',
      uploadBytes: bytes,
      fileName: name,
      query: {'sheetName': sheet},
    );
    return Map<String, dynamic>.from(data);
  }
}

final management = ManagementService(api);

class DeviceFiles {
  static const channel = MethodChannel('rightway/files');
  static Future<Map<String, dynamic>?> pickExcel() async {
    final value = await channel.invokeMapMethod<String, dynamic>('pickExcel');
    return value;
  }

  static Future<void> save(String name, Uint8List bytes, String mime) async {
    await channel.invokeMethod('save', {
      'name': name,
      'bytes': bytes,
      'mime': mime,
    });
  }
}
