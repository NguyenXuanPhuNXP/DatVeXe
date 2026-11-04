import 'dart:convert';

import 'package:flutter/material.dart';

import '../../widgets/app_widgets.dart';

class OpField {
  const OpField(
    this.keyName,
    this.label, {
    this.required = true,
    this.secret = false,
    this.email = false,
    this.phone = false,
    this.max = 120,
    this.options,
  });
  final String keyName, label;
  final bool required, secret, email, phone;
  final int max;
  final Map<String, String>? options;
}

Future<bool?> opConfirm(BuildContext context, String title, String message) =>
    showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        scrollable: true,
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );

class OperatorForm extends StatefulWidget {
  const OperatorForm({
    super.key,
    required this.title,
    required this.fields,
    required this.save,
    this.initial = const {},
    this.money = false,
  });
  final String title;
  final List<OpField> fields;
  final Map<String, dynamic> initial;
  final Future<void> Function(Map<String, dynamic>) save;
  final bool money;
  @override
  State<OperatorForm> createState() => _OperatorFormState();
}

class _OperatorFormState extends State<OperatorForm> {
  final form = GlobalKey<FormState>();
  late final controllers = {
    for (final f in widget.fields)
      f.keyName: TextEditingController(
        text: '${widget.initial[f.keyName] ?? ''}',
      ),
  };
  bool busy = false, acknowledged = false;
  String? error;
  @override
  void dispose() {
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  String? validate(OpField f, String? raw) {
    final value = f.secret ? raw ?? '' : raw?.trim() ?? '';
    if (value.isEmpty) return f.required ? 'Vui lòng nhập thông tin' : null;
    if (value.length > f.max) return 'Tối đa ${f.max} ký tự';
    if (f.email && !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)) {
      return 'Email không hợp lệ';
    }
    if (f.phone && !RegExp(r'^0\d{9}$').hasMatch(value)) {
      return 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    }
    if (f.secret && (value.length < 8 || utf8.encode(value).length > 72)) {
      return 'Mật khẩu từ 8 ký tự, tối đa 72 byte UTF-8';
    }
    return null;
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() || (widget.money && !acknowledged)) {
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    final body = {
      for (final f in widget.fields)
        f.keyName: f.secret
            ? controllers[f.keyName]!.text
            : controllers[f.keyName]!.text.trim(),
    };
    if (body['method'] == 'bank_transfer' &&
        (body['reference'] ?? '').isEmpty) {
      setState(() {
        busy = false;
        error = 'Chuyển khoản cần mã tham chiếu giao dịch.';
      });
      return;
    }
    try {
      await widget.save(body);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.title)),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          for (final f in widget.fields)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: f.options == null
                  ? TextFormField(
                      controller: controllers[f.keyName],
                      obscureText: f.secret,
                      decoration: InputDecoration(labelText: f.label),
                      keyboardType: f.email
                          ? TextInputType.emailAddress
                          : f.phone
                          ? TextInputType.phone
                          : TextInputType.text,
                      validator: (v) => validate(f, v),
                    )
                  : DropdownButtonFormField<String>(
                      isExpanded: true,
                      itemHeight: null,
                      initialValue: controllers[f.keyName]!.text.isEmpty
                          ? null
                          : controllers[f.keyName]!.text,
                      decoration: InputDecoration(labelText: f.label),
                      items: f.options!.entries
                          .map(
                            (e) => DropdownMenuItem(
                              value: e.key,
                              child: Text(
                                e.value,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: busy
                          ? null
                          : (v) => setState(
                              () => controllers[f.keyName]!.text = v ?? '',
                            ),
                      validator: (v) => validate(f, v),
                    ),
            ),
          if (widget.money)
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: acknowledged,
              onChanged: busy
                  ? null
                  : (v) => setState(() => acknowledged = v ?? false),
              title: const Text(
                'Tôi đã kiểm tra và thực nhận đủ tiền. Ghi nhận này sẽ cập nhật thanh toán của vé.',
              ),
            ),
          if (error != null)
            Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          FilledButton(
            onPressed: busy || (widget.money && !acknowledged) ? null : submit,
            child: Text(busy ? 'Đang lưu…' : 'Lưu thay đổi'),
          ),
        ],
      ),
    ),
  );
}

const paymentFields = [
  OpField(
    'method',
    'Phương thức',
    options: {'cash': 'Tiền mặt', 'bank_transfer': 'Chuyển khoản'},
  ),
  OpField(
    'reference',
    'Mã tham chiếu (chuyển khoản bắt buộc)',
    required: false,
    max: 100,
  ),
];
const contactFields = [
  OpField('passengerName', 'Họ tên', max: 120),
  OpField('passengerPhone', 'Số điện thoại', phone: true, max: 20),
  OpField('passengerEmail', 'Email', email: true, max: 254),
];
Map<String, dynamic> paymentBody(Map<String, dynamic> values) => {
  'method': values['method'],
  if ((values['reference'] ?? '').isNotEmpty) 'reference': values['reference'],
};

class OperatorList extends StatefulWidget {
  const OperatorList({
    super.key,
    required this.title,
    required this.load,
    required this.item,
    this.actions = const [],
  });
  final String title;
  final Future<List<dynamic>> Function() load;
  final Widget Function(
    BuildContext,
    Map<String, dynamic>,
    Future<void> Function(),
  )
  item;
  final List<Widget> actions;
  @override
  State<OperatorList> createState() => _OperatorListState();
}

class _OperatorListState extends State<OperatorList> {
  List<dynamic>? rows;
  String? error;
  bool loading = false;
  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    if (loading) return;
    setState(() => loading = true);
    try {
      final data = await widget.load();
      if (mounted) {
        setState(() {
          rows = data;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.title),
      actions: [
        ...widget.actions,
        IconButton(
          tooltip: 'Tải lại',
          onPressed: loading ? null : reload,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: reload,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (loading) const LinearProgressIndicator(),
          if (error != null)
            panel(
              Column(
                children: [
                  Text(error!),
                  TextButton(onPressed: reload, child: const Text('Thử lại')),
                ],
              ),
            ),
          if (!loading && rows?.isEmpty == true)
            panel(const Text('Chưa có dữ liệu.')),
          if (error == null)
            for (final row in rows ?? [])
              widget.item(context, Map<String, dynamic>.from(row), reload),
        ],
      ),
    ),
  );
}
