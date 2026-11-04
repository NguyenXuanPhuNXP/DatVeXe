/// Matches backend expiry.service: the server remains authoritative.
DateTime? bookingDeadline(Map<String, dynamic> booking) {
  final supplied = DateTime.tryParse('${booking['expiresAt'] ?? ''}');
  if (supplied != null) return supplied;
  return DateTime.tryParse('${booking['createdAt'] ?? ''}')
      ?.add(const Duration(minutes: 5));
}

bool canPayBooking(Map<String, dynamic> booking, {DateTime? now}) {
  final deadline = bookingDeadline(booking);
  return booking['status'] == 'pending' &&
      booking['paymentStatus'] == 'unpaid' &&
      deadline != null &&
      deadline.isAfter(now ?? DateTime.now());
}

bool hasIssuedTickets(Map<String, dynamic> booking) =>
    booking['paymentStatus'] == 'paid' && booking['status'] != 'cancelled';
