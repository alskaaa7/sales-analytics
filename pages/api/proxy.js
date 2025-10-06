// pages/api/proxy.js
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, key, limit, page, dateFrom, dateTo } = req.query;

  console.log('🔍 Параметры запроса прокси:', { 
    endpoint, 
    limit, 
    page, 
    dateFrom, 
    dateTo 
  });

  try {
    const baseUrl = 'http://109.73.206.144:6969';
    const apiUrl = `${baseUrl}/api/${endpoint}`;
    
    const params = new URLSearchParams();
    
    // Обязательные параметры
    if (key) params.append('key', key);
    
    // dateFrom - обязательный
    if (dateFrom) {
      params.append('dateFrom', dateFrom);
    } else {
      const defaultDateFrom = new Date();
      defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
      params.append('dateFrom', defaultDateFrom.toISOString().split('T')[0]);
    }
    
    // dateTo - обязательный
    if (dateTo) {
      params.append('dateTo', dateTo);
    } else {
      const defaultDateTo = new Date();
      params.append('dateTo', defaultDateTo.toISOString().split('T')[0]);
    }
    
    // Остальные параметры
    if (limit) params.append('limit', limit);
    if (page) params.append('page', page);

    const fullUrl = `${apiUrl}?${params}`;
    console.log('🔄 Запрос к API:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Статус ответа API:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Данные получены, записей:', result.data ? result.data.length : 0);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Ошибка прокси:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch data',
      message: error.message
    });
  }
}