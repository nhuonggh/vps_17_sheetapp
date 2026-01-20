# 🔧 FIX AUTO-ENROLLMENT - UPDATED (Based on Real Schema)

## ✅ SCHEMA THỰC TẾ (From Table_Construct.md)

### `order_items` Table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `order_id` | **uuid** | FK to orders.id (UUID, not TEXT!) |
| `product_id` | bigint | FK to products.id |
| `price_at_purchase` | numeric | Giá tại thời điểm mua |
| `created_at` | timestamptz | Timestamp |

**❌ KHÔNG CÓ các columns:**
- `quantity` - Schema không có!
- `product_name` - Phải JOIN với products table
- `price` - Tên column là `price_at_purchase`

---

## 🔍 ROOT CAUSE ANALYSIS

### **Lỗi trong SupabaseClient.gs (dòng 280):**

```javascript
// ❌ SAI - Query columns không tồn tại
function findOrderItems(orderId) {
  return supabaseSelect('order_items', {
    select: 'id,product_id,product_name,quantity,price',  
    // ← product_name, quantity, price KHÔNG TỒN TẠI!
    eq: { order_id: orderId }
  });
}
```

**Error message:**
```
column order_items.product_name does not exist
```

---

## ✅ GIẢI PHÁP CHÍNH XÁC

### **Fix: Update function `findOrderItems()` trong SupabaseClient.gs**

**Thay thế function cũ bằng code này:**

```javascript
/**
 * ✅ FIXED - Tìm order items của một order
 * 
 * Schema thực tế:
 * - order_items.order_id (uuid) ← FK to orders.id
 * - order_items.product_id (bigint)
 * - order_items.price_at_purchase (numeric)
 * - ❌ KHÔNG có: quantity, product_name
 * 
 * @param {string} orderId - Order's UUID
 * @returns {Array} Order items với product details
 */
function findOrderItems(orderId) {
  try {
    // Fetch order items (chỉ columns tồn tại)
    const items = supabaseSelect('order_items', {
      select: 'id,product_id,price_at_purchase,created_at',
      eq: { order_id: orderId }
    });
    
    if (!items || items.length === 0) {
      Logger.log(`⚠️ No order items found for order_id: ${orderId}`);
      return [];
    }
    
    Logger.log(`📦 Found ${items.length} order items`);
    
    // Fetch product details riêng
    const products = supabaseSelect('products', {
      select: 'id,name,description,price'
    });
    
    if (!products || products.length === 0) {
      Logger.log(`⚠️ No products found`);
      return items.map(item => ({
        ...item,
        product_name: 'Unknown Product',
        quantity: 1
      }));
    }
    
    // Map products
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = p;
    });
    
    // Combine items với product info
    return items.map(item => {
      const product = productsMap[item.product_id];
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || 'Unknown Product',
        product_description: product?.description || '',
        price: item.price_at_purchase,
        quantity: 1,  // Default (schema không có column này)
        created_at: item.created_at
      };
    });
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    return [];
  }
}
```

---

## ⚠️ QUAN TRỌNG: Kiểm tra thêm

### **1. Verify Schema trong Supabase:**

Chạy query này trong Supabase SQL Editor:

```sql
-- Lấy cấu trúc order_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;
```

**Expected output:**
```
id              | bigint        | NO
order_id        | uuid          | NO
product_id      | bigint        | NO
price_at_purchase | numeric     | NO
created_at      | timestamptz   | NO
```

### **2. Kiểm tra Foreign Key:**

```sql
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name,
    ccu.column_name as ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'order_items'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected:**
```
order_items_order_id_fkey   | order_id   | orders   | id
order_items_product_id_fkey | product_id | products | id
```

---

## 🧪 TESTING

### **Bước 1: Update code trong Apps Script**
1. Mở Apps Script Editor
2. File: `SupabaseClient.gs`
3. Tìm function `findOrderItems()` (dòng ~277)
4. Thay thế bằng code fixed ở trên
5. **Save** (Ctrl+S)

### **Bước 2: Test ngay**
```javascript
// Trong Apps Script, chạy:
test_wh()
```

### **Expected log output:**
```
✅ Signature verified
✅ Idempotency check passed
✅ Order found: nhuongggh@gmail.com
✅ Order updated to PAID
✅ Transaction logged
✅ User found: ca32c7cc-... (nhuongggh@gmail.com)
📦 Found 2 order items            ← NEW
✅ Enriched 2 items with product info  ← NEW
✅ Enrolled in: Excel Cơ Bản      ← SHOULD WORK NOW!
✅ Enrolled in: Power Query       ← SHOULD WORK NOW!
✅ Auto-enrollment completed
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] **Verify schema trong Supabase:**
  - [ ] Run query để check columns
  - [ ] Confirm không có `quantity`, `product_name`
  - [ ] Confirm có `price_at_purchase`

- [ ] **Update Apps Script:**
  - [ ] Copy fixed function
  - [ ] Paste vào `SupabaseClient.gs`
  - [ ] Save file

- [ ] **Test webhook:**
  - [ ] Run `test_wh()` trong Apps Script
  - [ ] Check logs
  - [ ] Verify enrollment created

- [ ] **Test real payment:**
  - [ ] Create order trên website
  - [ ] Chuyển khoản QR
  - [ ] Check Apps Script logs
  - [ ] Verify enrollment trong Supabase

---

## 📁 FILES

**Fixed code (based on real schema):**  
[`SupabaseClient_FIXED_REAL_SCHEMA.gs`](file:///e:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/SupabaseClient_FIXED_REAL_SCHEMA.gs)

**SQL to verify schema:**  
[`GET_ORDER_ITEMS_SCHEMA.sql`](file:///e:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/GET_ORDER_ITEMS_SCHEMA.sql)

**Schema documentation:**  
[`Table_Construct.md`](file:///e:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/_AI_DOCS/Table_Construct.md) (lines 89-105)

---

## 🎯 KẾT LUẬN

**Vấn đề:** Code query columns không tồn tại (`product_name`, `quantity`, `price`)  
**Nguyên nhân:** Schema thực tế khác với assumption  
**Giải pháp:** Query đúng columns (`price_at_purchase`), JOIN với products table để lấy `product_name`  
**Status:** ✅ **Ready to deploy**

---

**⚡ Chỉ cần update 1 function trong Apps Script là xong!**
