exports.handler = async (event, context) => {
  console.log('🚀 Function create-checkout-session appelée');
  console.log('📝 Method:', event.httpMethod);
  console.log('📦 Body:', event.body);
  console.log('🔑 Variables env:', {
    stripe_key: !!process.env.STRIPE_SECRET_KEY,
    stripe_key_start: process.env.STRIPE_SECRET_KEY?.substring(0, 12)
  });

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // Vérification de la clé Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration Stripe manquante',
          details: 'STRIPE_SECRET_KEY non définie'
        })
      };
    }

    // Import et initialisation Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Parse des données
    const { priceId, quantity = 1, successUrl, cancelUrl } = JSON.parse(event.body || '{}');
    console.log('✅ Données parsées:', { priceId, quantity, successUrl, cancelUrl });

    if (!priceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'priceId requis' })
      };
    }

    // Création de la session Stripe
    console.log('🔄 Création session Stripe...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: parseInt(quantity) || 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'],
      },
    });

    console.log('✅ Session créée:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        url: session.url,
        session_id: session.id 
      }),
    };

  } catch (error) {
    console.error('❌ Erreur Stripe:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        type: error.type || 'unknown_error',
        code: error.code || 'unknown_code'
      }),
    };
  }
};