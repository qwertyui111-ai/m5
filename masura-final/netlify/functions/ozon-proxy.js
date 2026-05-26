/**
 * LUMIÈRE — Netlify Function: Ozon API proxy
 */

const ALLOWED_ORIGIN = 'https://boisterous-pothos-37dffd.netlify.app';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверный JSON' }) };
  }

  const { clientId, apiKey, resource = 'products', ids = [] } = requestBody;

  if (!clientId || !apiKey) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Не переданы clientId и apiKey' }) };
  }

  const ozonHeaders = {
    'Client-Id':    String(clientId),
    'Api-Key':      String(apiKey),
    'Content-Type': 'application/json',
  };

  try {
    let url, body;

    if (resource === 'products') {
      url  = 'https://api-seller.ozon.ru/v3/product/list';
      body = JSON.stringify({
        filter: { visibility: 'ALL' },
        last_id: '',
        limit: 1000,
      });

    } else if (resource === 'product-info') {
      // v3 info/list принимает item_id (это product_id из v3/product/list)
      url  = 'https://api-seller.ozon.ru/v3/product/info/list';
      body = JSON.stringify({
        product_id: ids,
        offer_id: [],
        sku: [],
      });

    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Неизвестный resource: ${resource}` }) };
    }

    const response = await fetch(url, { method: 'POST', headers: ozonHeaders, body });

    // Всегда возвращаем текст как есть для диагностики
    const text = await response.text();

    // Проверяем что это валидный JSON
    try {
      JSON.parse(text);
      return { statusCode: 200, headers, body: text };
    } catch {
      // Ozon вернул не JSON — оборачиваем в ошибку
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: `Ozon вернул невалидный ответ (HTTP ${response.status})`,
          raw: text.slice(0, 500)
        })
      };
    }

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
