import 'package:flutter/material.dart';

import '../services/customer_service.dart';
import '../widgets/app_widgets.dart';
import '../widgets/remote.dart';

class NewsScreen extends StatelessWidget {
  const NewsScreen({super.key, required this.id});
  final String id;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tin tức')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Remote(
          load: () => customer.newsById(id),
          builder: (n) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              heading('${n['title']}'),
              SelectableText('${n['content'] ?? n['summary'] ?? ''}'),
            ],
          ),
        ),
      ],
    ),
  );
}
