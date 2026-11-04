import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class BookingSteps extends StatelessWidget {
  const BookingSteps({super.key, required this.current});
  final int current;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 16),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < 4; i++)
          Expanded(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 15,
                  backgroundColor: i <= current ? red : const Color(0xFFE5E7EB),
                  child: Text(
                    '${i + 1}',
                    style: TextStyle(
                      color: i <= current ? Colors.white : navy,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  const [
                    'Chọn chuyến',
                    'Chọn chỗ',
                    'Hành khách',
                    'Thanh toán',
                  ][i],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    color: i <= current ? red : navy,
                    fontWeight: i == current
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
      ],
    ),
  );
}
