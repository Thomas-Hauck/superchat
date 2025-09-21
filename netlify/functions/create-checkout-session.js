const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  console.log('Function create-checkout-session appelée');
  console.log('Method:', event.httpMethod);
  console.log('Body:', event.body);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gestion CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Vérification de la clé Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration Stripe manquante',
          details: 'STRIPE_SECRET_KEY non définie'
        })
      };
    }

    // Parse des données
    const requestData = JSON.parse(event.body || '{}');
    console.log('Données reçues:', requestData);

    const { lineItems, successUrl, cancelUrl, priceId, quantity } = requestData;

    // Support des deux formats : ancien (un produit) et nouveau (panier multiple)
    let stripeLineItems;

    if (lineItems && Array.isArray(lineItems)) {
      // Nouveau format : panier multiple
      console.log('Format panier multiple détecté');
      stripeLineItems = lineItems.map(item => {
        if (!item.priceId) {
          throw new Error('priceId manquant dans un élément du panier');
        }
        return {
          price: item.priceId,
          quantity: parseInt(item.quantity) || 1
        };
      });
    } else if (priceId) {
      // Ancien format : achat direct d'un seul produit (rétrocompatibilité)
      console.log('Format achat direct détecté');
      stripeLineItems = [{
        price: priceId,
        quantity: parseInt(quantity) || 1
      }];
    } else {
      throw new Error('Aucun produit spécifié (priceId ou lineItems requis)');
    }

    console.log('Line items Stripe:', stripeLineItems);

    // Validation des URLs
    if (!successUrl || !cancelUrl) {
      throw new Error('successUrl et cancelUrl sont requis');
    }

    // Création de la session Stripe
    console.log('Création de la session Stripe...');
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC', 'ES', 'IT', 'DE'],
      },
      // Ajouter des métadonnées pour le suivi
      metadata: {
        source: 'hugo-netlify-shop',
        items_count: stripeLineItems.length.toString(),
        created_at: new Date().toISOString()
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Session créée avec succès:', session.id);
    console.log('URL de checkout:', session.url);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        url: session.url,
        session_id: session.id,
        items_count: stripeLineItems.length
      }),
    };

  } catch (error) {
    console.error('Erreur dans create-checkout-session:');
    console.error('Message:', error.message);
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    
    // Gestion spécifique des erreurs Stripe
    let errorMessage = error.message;
    let errorCode = error.code || 'unknown_error';
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Erreur Stripe: ${error.message}`;
    } else if (error.code === 'resource_missing') {
      errorMessage = 'Prix Stripe non trouvé. Vérifiez que le produit est bien synchronisé.';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        type: error.type || 'unknown_error',
        code: errorCode,
        stripe_error: error.type ? true : false
      }),
    };
  }
};