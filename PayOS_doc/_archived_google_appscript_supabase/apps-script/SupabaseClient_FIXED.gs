/**
 * Tìm order items của một order
 * 
 * ✅ FIXED: Không query product_name trực tiếp (column không tồn tại)
 * Instead: Fetch product details từ products table riêng
 * 
 * @param {number} orderId - Order's internal ID
 * @returns {Array} Order items với product details
 */
function findOrderItems(orderId) {
  try {
    // Fetch order items (chỉ columns tồn tại)
    const items = supabaseSelect('order_items', {
      select: 'id,product_id,quantity,price_at_purchase',
      eq: { order_id: orderId }
    });
    
    if (!items || items.length === 0) {
      return [];
    }
    
    // Fetch product details riêng
    const productIds = items.map(item => item.product_id);
    
    // Get all products in one query
    const products = supabaseSelect('products', {
      select: 'id,name,description'
    });
    
    // Map product names to items
    const productsMap = {};
    if (products) {
      products.forEach(p => {
        productsMap[p.id] = p;
      });
    }
    
    // Combine items với product info
    return items.map(item => ({
      ...item,
      product_name: productsMap[item.product_id]?.name || 'Unknown Product',
      product_description: productsMap[item.product_id]?.description || ''
    }));
    
  } catch (error) {
    Logger.log(`❌ Error finding order items: ${error.message}`);
    return [];
  }
}
