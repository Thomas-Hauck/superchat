const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  // Gestion CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount, currency = 'eur', shopSlug, metadata = {} } = JSON.parse(event.body);

    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Montant invalide' })
      };
    }

    // Vérifier le stock si un slug de produit est fourni
    if (shopSlug) {
      const stockCheck = await checkProductStock(shopSlug);
      
      if (!stockCheck.available) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: stockCheck.message || 'Produit non disponible'
          })
        };
      }

      console.log(`Stock vérifié pour ${shopSlug}:`, stockCheck);
    }

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency: currency,
      metadata: {
        ...metadata,
        shop_slug: shopSlug || '',
        timestamp: new Date().toISOString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Payment Intent créé:', paymentIntent.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      })
    };
  } catch (error) {
    console.error('Erreur Payment Intent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erreur serveur lors de la création du paiement' 
      })
    };
  }
};

// Fonction pour vérifier le stock d'un produit
async function checkProductStock(shopSlug) {
  try {
    // Chemin vers le fichier du produit
    const productPath = path.join(process.cwd(), 'content/products', `${shopSlug}.md`);
    
    console.log('Vérification du fichier:', productPath);
    
    // Lire le fichier
    const fileContent = await fs.readFile(productPath, 'utf8');
    const { data } = matter(fileContent);
    
    console.log('Données du produit:', {
      title: data.title,
      actif: data.actif,
      stock_limite: data.stock_limite,
      stock: data.stock
    });
    
    // Vérifier si le produit est actif
    if (data.actif === false) {
      return { 
        available: false, 
        message: 'Ce produit n\'est plus disponible' 
      };
    }
    
    // Vérifier le stock si la gestion de stock est activée
    if (data.stock_limite === true) {
      const currentStock = parseInt(data.stock) || 0;
      
      if (currentStock <= 0) {
        return { 
          available: false, 
          message: 'Rupture de stock - Ce produit n\'est plus disponible' 
        };
      }
      
      return { 
        available: true, 
        stock: currentStock,
        message: `${currentStock} en stock`
      };
    }
    
    // Produit disponible sans limite de stock
    return { 
      available: true, 
      stock: null,
      message: 'Produit disponible'
    };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Fichier produit non trouvé:', shopSlug);
      return { 
        available: false, 
        message: 'Produit introuvable' 
      };
    }
    
    console.error('Erreur vérification stock:', error);
    return { 
      available: false, 
      message: 'Erreur lors de la vérification du produit' 
    };
  }
}