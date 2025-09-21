// scripts/sync-stripe.js
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

async function makeRequest(url, options = {}) {
  const https = require('https');
  const { URL } = require('url');
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 8888,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = require('http').request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve({ error: 'Invalid JSON', raw: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function syncStripeProducts() {
  console.log('🔄 Synchronisation des produits avec Stripe...');
  
  try {
    // Appel à la fonction Netlify
    const functionUrl = 'http://localhost:8888/.netlify/functions/create-stripe-prices';
    
    console.log('📡 Appel de la fonction de synchronisation...');
    
    const result = await makeRequest(functionUrl, {
      method: 'POST'
    });
    
    console.log('📦 Réponse:', result);
    
    if (result.error) {
      console.error('❌ Erreur:', result.error);
      return;
    }
    
    if (result.created && result.created.length > 0) {
      console.log(`🎉 ${result.created.length} produit(s) synchronisé(s) !`);
      result.created.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} → ${item.price_id}`);
      });
    } else {
      console.log('ℹ️  Tous les produits sont déjà synchronisés.');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  syncStripeProducts();
}

module.exports = { syncStripeProducts };