/**
 * ========================================
 * SUPABASE CLIENT - FIXED VERSION
 * ========================================
 * ✅ findOrderItems() FIXED - queries correct columns and JOINs with products
 * 
 * HOW TO USE:
 * 1. Find the findOrderItems() function in your SupabaseClient.gs
 * 2. Replace it with the version below
 * 3. Save and test with test_wh()
 */

/**
 * ✅ FIXED - Tìm order items của một order
 * 
 * Based on REAL schema from Table_Construct.md:
 * - order_items.id (bigint)
 * - order_items.order_id (uuid) ← FK to orders.id
 * - order_items.product_id (bigint) ← FK to products.id
 * - order_items.price_at_purchase (numeric)
 * - order_items.created_at (timestamptz)
 * 
 * ❌ KHÔNG có: quantity, product_name, price
 * 
 * FIXES:
 * 1. Query only existing columns: id, product_id, price_at_purchase, created_at
 * 2. Separate query to products table for product names
 * 3. JOIN in JavaScript (not in SQL)
 * 4. Default quantity to 1 (schema doesn't track quantity)
 * 
 * @param {string} orderId - Order's UUID (orders.id, not order_id!)
 * @returns {Array} Order items với product details
 */
function findOrderItems(orderId) {
  try {
    // ✅ FIX: Query only columns that exist in schema
    const items = supabaseSelect('order_items', {
      select: 'id,product_id,price_at_purchase,created_at',
      eq: { order_id: orderId }
    });
    
    if (!items || items.length === 0) {
      Logger.log(`⚠️ No order items found for order_id: ${orderId}`);
      return [];
    }
    
    Logger.log(`📦 Found ${items.length} order items`);
    
    // ✅ FIX: Fetch product details separately (product_name not in order_items)
    const products = supabaseSelect('products', {
      select: 'id,name,description,price'
    });
    
    if (!products || products.length === 0) {
      Logger.log(`⚠️ No products found in database`);
      // Return items with unknown product name
      return items.map(item => ({
        ...item,
        product_name: 'Unknown Product',
        quantity: 1  // Default quantity (schema doesn't have this column)
      }));
    }
    
    // ✅ FIX: JOIN in JavaScript - create products map
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = p;
    });
    
    // ✅ FIX: Combine items with product info
    const enrichedItems = items.map(item => {
      const product = productsMap[item.product_id];
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || 'Unknown Product',
        product_description: product?.description || '',
        price: item.price_at_purchase,  // Use price_at_purchase (correct column name)
        quantity: 1,  // Default to 1 (schema doesn't track quantity)
        created_at: item.created_at
      };
    });
    
    Logger.log(`✅ Enriched ${enrichedItems.length} items with product info`);
    return enrichedItems;
    
  } catch (error) {
    Logger.log(`❌ Error finding order items: ${error.message}`);
    Logger.log(error.stack);
    return [];
  }
}

/**
 * IMPORTANT NOTES:
 * 
 * 1. Parameter orderId is orders.id (UUID), NOT orders.order_id (TEXT)
 *    - order_items.order_id FK points to orders.id (UUID)
 *    - When calling: findOrderItems(order.id)  ← Use .id not .order_id
 * 
 * 2. Schema differences from original code:
 *    - order_items.price_at_purchase (not .price)
 *    - NO order_items.product_name (must JOIN with products)
 *    - NO order_items.quantity (default to 1)
 * 
 * 3. Performance note:
 *    - Fetches ALL products (could be optimized with IN filter)
 *    - For production, consider: WHERE id IN (productIds)
 */
