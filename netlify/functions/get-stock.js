exports.handler = async (event, context) => {
  console.log('get-stock appelée');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Version de test qui renvoie toujours du stock disponible
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        stockInfo: {},
        message: 'Vérification stock désactivée temporairement'
      })
    };
    
  } catch (error) {
    console.error('Erreur get-stock:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};