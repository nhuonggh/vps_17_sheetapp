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
 * ❌ KHÔNG có: quantity, product_name
 * 
 * @param {number|string} orderId - Order's internal ID (UUID)
 * @returns {Array} Order items với product details
 */
function findOrderItems(orderId) {
  try {
    // Fetch order items (chỉ columns tồn tại trong schema)
    const items = supabaseSelect('order_items', {
      select: 'id,product_id,price_at_purchase,created_at',
      eq: { order_id: orderId }
    });
    
    if (!items || items.length === 0) {
      Logger.log(`⚠️ No order items found for order_id: ${orderId}`);
      return [];
    }
    
    Logger.log(`📦 Found ${items.length} order items`);
    
    // Fetch product details riêng (vì không có product_name trong order_items)
    const productIds = items.map(item => item.product_id);
    
    // Get all products in one query
    const products = supabaseSelect('products', {
      select: 'id,name,description,price'
    });
    
    if (!products || products.length === 0) {
      Logger.log(`⚠️ No products found in database`);
      // Return items with unknown product name
      return items.map(item => ({
        ...item,
        product_name: 'Unknown Product',
        quantity: 1  // Default quantity (schema không có column này)
      }));
    }
    
    // Map product names to items
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = p;
    });
    
    // Combine items với product info
    const enrichedItems = items.map(item => {
      const product = productsMap[item.product_id];
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || 'Unknown Product',
        product_description: product?.description || '',
        price: item.price_at_purchase,  // Giá tại thời điểm mua
        quantity: 1,  // Default vì schema không có column này
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
