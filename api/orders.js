// api/orders.js - упрощенная версия
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { limit = 100 } = req.query;
    const itemsCount = parseInt(limit) || 100;

    // Генерируем тестовые данные
    const orders = [];
    for (let i = 0; i < itemsCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const totalPrice = Math.floor(Math.random() * 15000) + 1000;
      const discount = Math.floor(Math.random() * 500);
      
      orders.push({
        id: i + 1,
        date: date.toISOString(),
        total_price: totalPrice,
        price_with_disc: totalPrice - discount,
        is_cancel: Math.random() > 0.9
      });
    }

    // Сортируем по дате (новые сначала)
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(orders);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}