import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  // Создаем новый URLSearchParams без параметра endpoint
  const filters = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'endpoint') {
      filters.append(key, value);
    }
  }

  // Проверяем обязательные параметры
  if (!endpoint) {
    return NextResponse.json(
      { error: 'Endpoint parameter is required' },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `http://109.73.206.144:6969/api/${endpoint}?${filters}`;
    console.log('🔄 Proxying to:', apiUrl);

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Кэшируем на 60 секунд
    });

    if (!apiResponse.ok) {
      throw new Error(`API responded with status: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from API',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Обрабатываем OPTIONS для CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}