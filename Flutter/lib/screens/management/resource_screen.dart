import 'dart:convert';

import 'package:flutter/material.dart';

import '../../services/management_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../operator/operator_widgets.dart';

class DataField {
  const DataField(
    this.keyName,
    this.label, {
    this.kind = 'text',
    this.required = true,
    this.ref,
    this.options,
    this.value,
    this.max = 1000,
  });
  final String keyName, label, kind;
  final bool required;
  final String? ref;
  final Map<String, String>? options;
  final dynamic value;
  final int max;
}

class ResourceSpec {
  const ResourceSpec(
    this.title,
    this.path,
    this.fields, {
    this.updateMethod = 'PUT',
    this.create = true,
    this.remove = true,
  });
  final String title, path, updateMethod;
  final List<DataField> fields;
  final bool create, remove;
}

String recordTitle(Map r) =>
    '${r['title'] ?? r['name'] ?? r['fullName'] ?? r['bookingCode'] ?? r['user']?['email'] ?? (r['origin'] != null ? '${r['origin']} → ${r['destination']}' : r['id'] ?? 'Bản ghi')}';
String referenceTitle(Map r) => r['route'] != null
    ? '${r['route']['origin']} → ${r['route']['destination']} • ${r['departureTime'] ?? ''}'
    : r['origin'] != null
    ? '${r['origin']} → ${r['destination']}'
    : '${r['email'] ?? r['name'] ?? r['title'] ?? r['id']}';

class ResourceScreen extends StatefulWidget {
  const ResourceScreen({super.key, required this.spec, this.rowActions});
  final ResourceSpec spec;
  final List<Widget> Function(
    BuildContext,
    Map<String, dynamic>,
    Future<void> Function(),
  )?
  rowActions;
  @override
  State<ResourceScreen> createState() => _ResourceScreenState();
}

class _ResourceScreenState extends State<ResourceScreen> {
  List<dynamic>? rows;
  String? error;
  bool loading = false;
  final search = TextEditingController();
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> load() async {
    if (loading) return;
    setState(() => loading = true);
    try {
      final d = await management.list(widget.spec.path);
      if (mounted) {
        setState(() {
          rows = d;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> edit([Map<String, dynamic>? row]) async {
    final saved = await open<bool>(
      context,
      DataEditor(spec: widget.spec, initial: row),
    );
    if (saved == true) await load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.spec.title),
      actions: [
        if (widget.spec.create)
          IconButton(
            tooltip: 'Thêm mới',
            onPressed: () => edit(),
            icon: const Icon(Icons.add),
          ),
        IconButton(
          tooltip: 'Tải lại',
          onPressed: loading ? null : load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          TextField(
            controller: search,
            decoration: const InputDecoration(
              labelText: 'Tìm trong danh sách',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (loading) const LinearProgressIndicator(),
          if (error != null) panel(Text(error!)),
          if (!loading && rows?.isEmpty == true)
            panel(const Text('Chưa có dữ liệu.')),
          if (error == null)
            for (final item in rows ?? [])
              if (jsonEncode(item)
                  .toLowerCase()
                  .contains(search.text.toLowerCase()))
                Builder(
                  builder: (c) {
                    final r = Map<String, dynamic>.from(item);
                    return panel(
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          heading(recordTitle(r)),
                          for (final f in widget.spec.fields.where(
                            (f) =>
                                f.kind != 'password' &&
                                f.ref == null &&
                                f.keyName != 'content',
                          ))
                            if (r[f.keyName] != null)
                              Text(
                                '${f.label}: ${f.kind == 'bool'
                                    ? (r[f.keyName] == true ? 'Có' : 'Không')
                                    : f.kind == 'calendar' || f.kind == 'date'
                                    ? tripDateLabel(r[f.keyName])
                                    : f.options?[r[f.keyName]] ?? r[f.keyName]}',
                              ),
                          Wrap(
                            spacing: 8,
                            children: [
                              TextButton(
                                onPressed: () => edit(r),
                                child: const Text('Chỉnh sửa'),
                              ),
                              if (widget.rowActions != null)
                                ...widget.rowActions!(c, r, load),
                              if (widget.spec.remove)
                                TextButton(
                                  onPressed: () async {
                                    if (await opConfirm(
                                          c,
                                          'Xóa ${recordTitle(r)}?',
                                          'Không thể xóa dữ liệu đang được sử dụng.',
                                        ) !=
                                        true) {
                                      return;
                                    }
                                    try {
                                      await management.delete(
                                        widget.spec.path,
                                        '${r['id']}',
                                      );
                                      await load();
                                    } catch (e) {
                                      if (c.mounted) notify(c, e);
                                    }
                                  },
                                  child: const Text('Xóa'),
                                ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    ),
  );
}

class DataEditor extends StatefulWidget {
  const DataEditor({super.key, required this.spec, this.initial});
  final ResourceSpec spec;
  final Map<String, dynamic>? initial;
  @override
  State<DataEditor> createState() => _DataEditorState();
}

class _DataEditorState extends State<DataEditor> {
  final form = GlobalKey<FormState>();
  late final values = <String, dynamic>{
    for (final f in widget.spec.fields)
      f.keyName:
          widget.initial?[f.keyName] ??
          f.value ??
          (f.kind == 'bool'
              ? true
              : f.kind == 'roles'
              ? <String>[]
              : ''),
  };
  final references = <String, List<dynamic>>{};
  bool ready = false, busy = false;
  String? error;
  @override
  void initState() {
    super.initState();
    for (final f in widget.spec.fields) {
      if (f.kind == 'date' || f.kind == 'calendar') {
        values[f.keyName] = calendarDate(values[f.keyName]);
      }
      if (f.kind == 'password') values[f.keyName] = '';
      if (widget.initial == null && f.keyName == 'publishedAt') {
        values[f.keyName] = dateKey(vietnamToday());
      }
    }
    load();
  }

  Future<void> load() async {
    try {
      for (final f in widget.spec.fields.where((f) => f.ref != null)) {
        references[f.ref!] = await management.list(f.ref!);
      }
      if (mounted) {
        setState(() {
          ready = true;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
  }

  Future<void> save() async {
    if (!ready || !form.currentState!.validate()) return;
    setState(() => busy = true);
    try {
      final body = <String, dynamic>{};
      for (final f in widget.spec.fields) {
        final v = values[f.keyName];
        if (f.kind == 'roles' && (v as List).isEmpty) {
          throw StateError('Chọn ít nhất một vai trò.');
        }
        if (f.kind == 'bool' || f.kind == 'roles') {
          body[f.keyName] = v;
          continue;
        }
        final text = '$v'.trim();
        if (text.isEmpty) {
          if (f.kind == 'password' && widget.initial != null) continue;
          if (!f.required && f.kind == 'password') continue;
          body[f.keyName] = null;
          continue;
        }
        body[f.keyName] = switch (f.kind) {
          'int' => int.parse(text),
          'decimal' => num.parse(text),
          'date' => '${text}T00:00:00.000Z',
          _ => f.kind == 'password' ? '$v' : text,
        };
      }
      await management.save(
        widget.spec.path,
        body,
        id: widget.initial?['id']?.toString(),
        method: widget.spec.updateMethod,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        '${widget.initial == null ? 'Thêm' : 'Sửa'} ${widget.spec.title.toLowerCase()}',
      ),
    ),
    body: !ready
        ? Center(
            child: error == null
                ? const CircularProgressIndicator()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(error!),
                      TextButton(onPressed: load, child: const Text('Thử lại')),
                    ],
                  ),
          )
        : Form(
            key: form,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                for (final f in widget.spec.fields)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: field(f),
                  ),
                if (error != null)
                  Text(
                    error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                FilledButton(
                  onPressed: busy ? null : save,
                  child: Text(busy ? 'Đang lưu…' : 'Lưu thay đổi'),
                ),
              ],
            ),
          ),
  );
  Widget field(DataField f) {
    if (f.kind == 'bool') {
      return SwitchListTile(
        title: Text(f.label),
        value: values[f.keyName] == true,
        onChanged: busy ? null : (v) => setState(() => values[f.keyName] = v),
      );
    }
    final choices =
        f.options ??
        {
          for (final r in references[f.ref] ?? [])
            '${f.kind == 'roles' ? r['name'] : r['id']}': referenceTitle(r),
        };
    if (f.kind == 'roles') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(f.label),
          Wrap(
            spacing: 8,
            children: choices.entries
                .map(
                  (e) => FilterChip(
                    label: Text(e.value),
                    selected: (values[f.keyName] as List).contains(e.key),
                    onSelected: busy
                        ? null
                        : (on) => setState(() {
                            final selected = List<String>.from(
                              values[f.keyName],
                            );
                            on ? selected.add(e.key) : selected.remove(e.key);
                            values[f.keyName] = selected;
                          }),
                  ),
                )
                .toList(),
          ),
        ],
      );
    }
    if (f.options != null || f.ref != null) {
      return DropdownButtonFormField<String>(
        initialValue: choices.containsKey('${values[f.keyName]}')
            ? '${values[f.keyName]}'
            : null,
        isExpanded: true,
        decoration: InputDecoration(labelText: f.label),
        items: choices.entries
            .map(
              (e) => DropdownMenuItem(
                value: e.key,
                child: Text(e.value, overflow: TextOverflow.ellipsis),
              ),
            )
            .toList(),
        onChanged: busy ? null : (v) => values[f.keyName] = v,
        validator: (v) =>
            f.required && (v == null || v.isEmpty) ? 'Vui lòng chọn' : null,
      );
    }
    return TextFormField(
      initialValue: '${values[f.keyName]}',
      obscureText: f.kind == 'password',
      minLines: f.kind == 'long' ? 3 : 1,
      maxLines: f.kind == 'long' ? 8 : 1,
      decoration: InputDecoration(
        labelText: f.label,
        hintText: f.kind == 'calendar' || f.kind == 'date'
            ? 'YYYY-MM-DD'
            : null,
      ),
      keyboardType: ['int', 'decimal'].contains(f.kind)
          ? TextInputType.number
          : TextInputType.text,
      onChanged: (v) => values[f.keyName] = v,
      validator: (raw) {
        final v = raw?.trim() ?? '';
        if (v.isEmpty) {
          return f.required && !(widget.initial != null && f.kind == 'password')
              ? 'Vui lòng nhập'
              : null;
        }
        if (v.length > f.max) return 'Tối đa ${f.max} ký tự';
        if (f.kind == 'int' && int.tryParse(v) == null ||
            f.kind == 'decimal' && num.tryParse(v) == null) {
          return 'Nhập số hợp lệ';
        }
        if ((f.kind == 'calendar' || f.kind == 'date') &&
            (v.length != 10 || calendarDate(v) != v)) {
          return 'Ngày phải là YYYY-MM-DD hợp lệ';
        }
        if (f.kind == 'password' &&
            (v.length < 8 || utf8.encode(raw!).length > 72)) {
          return 'Mật khẩu từ 8 ký tự, tối đa 72 byte';
        }
        return null;
      },
    );
  }
}
