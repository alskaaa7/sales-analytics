module.exports = async (req, res) => {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { dateFrom, dateTo, page = 1, key, limit = 100 } = req.query;

  // Реалистичные данные
  const generateOrders = () => {
    const orders = [];
    const baseDate = new Date();
    const itemsCount = parseInt(limit) || 100;
    
    for (let i = 0; i < itemsCount; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const totalPrice = Math.floor(Math.random() * 15000) + 1000;
      const discountPercent = Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 10 : 0;
      const priceWithDisc = Math.floor(totalPrice * (1 - discountPercent / 100));
      
      orders.push({
        date: date.toISOString(),
        total_price: totalPrice,
        price_with_disc: priceWithDisc,
        discount_percent: discountPercent,
        is_cancel: Math.random() > 0.9,
        quantity: Math.floor(Math.random() * 3) + 1,
        nm_id: Math.floor(Math.random() * 900000) + 100000,
        warehouse_name: ['Москва', 'СПб', 'Новосибирск'][Math.floor(Math.random() * 3)],
        subject: `Товар ${i + 1}`,
        brand: ['Nike', 'Adidas', 'Puma'][Math.floor(Math.random() * 3)],
        category: ['Обувь', 'Одежда'][Math.floor(Math.random() * 2)]
      });
    }
    
    return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  try {
    const orders = generateOrders();
    
    res.status(200).json({
      data: orders,
      pagination: {
        current_page: parseInt(page),
        last_page: 5,
        total: 487,
        per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
