import 'resource_screen.dart';

ResourceSpec catalog(String type, {bool owner = false}) {
  final p = owner ? '/operator' : '/admin';
  const company = DataField('companyId', 'Nhà xe', ref: '/admin/companies');
  final route = DataField('routeId', 'Tuyến đường', ref: '$p/routes');
  final bus = DataField('busId', 'Xe', ref: '$p/buses');
  return switch (type) {
    'buses' => ResourceSpec('Quản lý xe', '$p/buses', [
      const DataField('name', 'Tên xe', max: 100),
      const DataField('type', 'Loại xe', max: 50),
      const DataField('totalSeats', 'Số ghế', kind: 'int', value: 36),
      if (!owner) company,
    ]),
    'trips' => ResourceSpec('Quản lý chuyến', '$p/trips', [
      route,
      bus,
      if (!owner) company,
      const DataField('departureTime', 'Giờ khởi hành (HH:mm)'),
      const DataField('arrivalTime', 'Giờ đến (HH:mm)'),
      const DataField('duration', 'Thời lượng (5h 30p)', max: 10),
      const DataField('price', 'Giá vé', kind: 'int'),
      const DataField(
        'availableDate',
        'Ngày chạy (trống = định kỳ)',
        kind: 'calendar',
        required: false,
      ),
      const DataField('isActive', 'Đang bán vé', kind: 'bool', value: true),
    ]),
    'routes' => ResourceSpec('Quản lý tuyến', '/admin/routes', const [
      DataField('origin', 'Điểm đi', max: 100),
      DataField('destination', 'Điểm đến', max: 100),
      DataField('distance', 'Khoảng cách (km)', kind: 'int', required: false),
    ]),
    'points' => ResourceSpec('Điểm đón/trả', '/admin/pickup-dropoff-points', [
      const DataField('routeId', 'Tuyến đường', ref: '/admin/routes'),
      const DataField(
        'type',
        'Loại điểm',
        options: {'pickup': 'Điểm đón', 'dropoff': 'Điểm trả'},
        value: 'pickup',
      ),
      const DataField('name', 'Tên điểm', max: 150),
      const DataField('address', 'Địa chỉ', max: 300),
      const DataField('city', 'Tỉnh/thành phố', max: 100),
      const DataField('sortOrder', 'Thứ tự', kind: 'int', value: 0),
      const DataField('isActive', 'Đang hoạt động', kind: 'bool', value: true),
    ]),
    'companies' => ResourceSpec('Nhà xe', '/admin/companies', const [
      DataField('name', 'Tên nhà xe', max: 100),
      DataField(
        'description',
        'Giới thiệu',
        kind: 'long',
        required: false,
        max: 500,
      ),
      DataField('logo', 'Link logo', required: false, max: 500),
      DataField('website', 'Website', required: false, max: 500),
      DataField('rating', 'Đánh giá', kind: 'decimal', value: 0),
      DataField('totalReviews', 'Số đánh giá', kind: 'int', value: 0),
    ]),
    'promotions' => ResourceSpec('Khuyến mãi', '/admin/promotions', const [
      DataField('title', 'Tiêu đề', max: 200),
      DataField('description', 'Nội dung', kind: 'long', required: false),
      DataField('image', 'Link ảnh', required: false, max: 500),
      DataField('discount', 'Giảm (%)', kind: 'int', required: false),
      DataField('code', 'Mã ưu đãi', required: false, max: 50),
      DataField('startDate', 'Ngày bắt đầu', kind: 'date', required: false),
      DataField('endDate', 'Ngày kết thúc', kind: 'date', required: false),
      DataField('isActive', 'Đang áp dụng', kind: 'bool', value: true),
    ]),
    'news' => ResourceSpec('Tin tức', '/admin/news', const [
      DataField('title', 'Tiêu đề', max: 300),
      DataField('summary', 'Tóm tắt', kind: 'long', required: false, max: 500),
      DataField(
        'content',
        'Nội dung',
        kind: 'long',
        required: false,
        max: 200000,
      ),
      DataField('image', 'Link ảnh', required: false, max: 500),
      DataField('category', 'Chuyên mục', required: false, max: 50),
      DataField('publishedAt', 'Ngày xuất bản', kind: 'date'),
      DataField('isPublished', 'Đã xuất bản', kind: 'bool', value: true),
    ]),
    'users' => ResourceSpec('Người dùng', '/admin/users', const [
      DataField('fullName', 'Họ tên', required: false, max: 120),
      DataField('email', 'Email', max: 254),
      DataField(
        'password',
        'Mật khẩu (trống khi không đổi)',
        kind: 'password',
        max: 72,
      ),
      DataField(
        'roles',
        'Vai trò',
        kind: 'roles',
        ref: '/admin/roles',
        value: ['USER'],
      ),
    ], updateMethod: 'PATCH'),
    _ => throw ArgumentError('Danh mục không hỗ trợ'),
  };
}
