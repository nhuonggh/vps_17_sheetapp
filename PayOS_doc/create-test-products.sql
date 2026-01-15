-- Test Products cho PayOS Integration Testing
-- Giá: 2000 VND mỗi sản phẩm để test dễ dàng

-- NOTE: Schema theo Table_Construct.md
-- Products table KHÔNG CÓ: image_url, category, active
-- Products table CÓ: id, name, description, price, slug (và FK: category_id, instructor_id)

-- Insert test products vào bảng products
INSERT INTO products (id, name, description, price, slug)
VALUES 
  -- Test Product 1: Khóa học cơ bản
  (
    999991,
    'TEST - Khóa học AppSheet Cơ bản (2k)',
    'Sản phẩm test cho PayOS integration - Học AppSheet từ đầu cho người mới bắt đầu. Giá test: 2.000đ',
    2000,
    'test-course-basic-2k'
  ),
  
  -- Test Product 2: Khóa học nâng cao
  (
    999992,
    'TEST - Khóa học AppSheet Nâng cao (2k)',
    'Sản phẩm test cho PayOS integration - Các kỹ thuật AppSheet nâng cao. Giá test: 2.000đ',
    2000,
    'test-course-advanced-2k'
  ),
  
  -- Test Product 3: Template
  (
    999993,
    'TEST - Template Quản lý Cafe (2k)',
    'Sản phẩm test cho PayOS integration - Template AppSheet quản lý quán cafe. Giá test: 2.000đ',
    2000,
    'test-template-cafe-2k'
  ),
  
  -- Test Product 4: Tư vấn
  (
    999994,
    'TEST - Dịch vụ Tư vấn 1-1 (2k)',
    'Sản phẩm test cho PayOS integration - Tư vấn AppSheet 1 kèm 1. Giá test: 2.000đ',
    2000,
    'test-service-consult-2k'
  )

-- Xử lý conflict nếu products đã tồn tại
ON CONFLICT (id) 
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  slug = EXCLUDED.slug;

-- ⚠️ IMPORTANT: Set type và industry để products hiển thị
UPDATE products 
SET 
  type = 'course',
  industry = 'Test Products - PayOS'
WHERE id >= 999991 AND id <= 999994;

-- Verify test products
SELECT id, name, price, slug, type, industry 
FROM products 
WHERE id >= 999991 AND id <= 999994
ORDER BY id;
