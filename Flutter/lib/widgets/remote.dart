import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import 'app_widgets.dart';

class Remote extends StatefulWidget {
  const Remote({super.key, required this.load, required this.builder});
  final Future<dynamic> Function() load;
  final Widget Function(dynamic) builder;
  @override
  State<Remote> createState() => _RemoteState();
}

class _RemoteState extends State<Remote> {
  late Future<dynamic> future;
  @override
  void initState() {
    super.initState();
    future = widget.load();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        );
      }
      if (snapshot.hasError) {
        return panel(
          Column(
            children: [
              const Icon(Icons.cloud_off_outlined, size: 40, color: navy),
              Text('${snapshot.error}', textAlign: TextAlign.center),
              TextButton(
                onPressed: () => setState(() => future = widget.load()),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        );
      }
      return widget.builder(snapshot.data);
    },
  );
}
