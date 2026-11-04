/// Mirrors frontend/src/context/auth-context.js on Develops.
class AppAccess {
  const AppAccess(this.user);
  final Map<String, dynamic>? user;
  bool has(String key) => (user?['permissions'] as List? ?? []).contains(key);
  bool get admin => has('admin.access');
  bool get customer =>
      user != null &&
      user!['companyMembership'] == null &&
      has('booking.create') &&
      !admin;
  bool get operator =>
      !admin &&
      user?['companyMembership']?['isActive'] == true &&
      has('operator.access');
  bool get blocked => user != null && !admin && !customer && !operator;
  Map<String, dynamic>? get member => user?['companyMembership'] is Map
      ? {
          ...Map<String, dynamic>.from(user!['companyMembership']),
          'permissions': user!['permissions'] ?? [],
        }
      : null;
}
