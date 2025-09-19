const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
    console.log('Webhook reçu:', stripeEvent.type, stripeEvent.id);
  } catch (err) {
    console.log('Erreur webhook signature:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }

  // Gestion des événements
  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = stripeEvent.data.object;
      console.log('✅ Paiement réussi:', paymentIntent.id);
      await handleSuccessfulPayment(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = stripeEvent.data.object;
      console.log('❌ Paiement échoué:', failedPayment.id);
      await handleFailedPayment(failedPayment);
      break;

    case 'payment_intent.canceled':
      const canceledPayment = stripeEvent.data.object;
      console.log('🚫 Paiement annulé:', canceledPayment.id);
      await handleCanceledPayment(canceledPayment);
      break;

    case 'payment_method.attached':
      const paymentMethod = stripeEvent.data.object;
      console.log('💳 Méthode de paiement attachée:', paymentMethod.id);
      break;

    default:
      console.log(`ℹ️ Type d'événement non géré: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};

// Traitement des paiements réussis
async function handleSuccessfulPayment(paymentIntent) {
  const shopSlug = paymentIntent.metadata.shop_slug;
  const shopName = paymentIntent.metadata.shop_name;
  const amount = paymentIntent.amount / 100; // Conversion des centimes
  
  console.log('🛍️ Détails de la vente:');
  console.log(`   - Produit: ${shopName} (${shopSlug})`);
  console.log(`   - Montant: ${amount} ${paymentIntent.currency.toUpperCase()}`);
  console.log(`   - ID Transaction: ${paymentIntent.id}`);
  console.log(`   - Email client: ${paymentIntent.receipt_email || 'N/A'}`);
  
  if (shopSlug) {
    console.log(`🚨 ACTION REQUISE: Vérifiez le stock de "${shopSlug}"`);
    
    // Ici vous pouvez ajouter d'autres actions :
    await sendStockAlert(shopSlug, shopName, amount);
    await logSaleToFile(paymentIntent);
    // await updateExternalInventory(shopSlug);
    // await sendConfirmationEmail(paymentIntent);
  }
}

// Traitement des paiements échoués
async function handleFailedPayment(paymentIntent) {
  const shopSlug = paymentIntent.metadata.shop_slug;
  const shopName = paymentIntent.metadata.shop_name;
  
  console.log('❌ Échec de paiement:');
  console.log(`   - Produit: ${shopName} (${shopSlug})`);
  console.log(`   - Raison: ${paymentIntent.last_payment_error?.message || 'Non spécifiée'}`);
  console.log(`   - ID: ${paymentIntent.id}`);
  
  // Vous pourriez envoyer une alerte ou logger cet événement
}

// Traitement des paiements annulés
async function handleCanceledPayment(paymentIntent) {
  const shopSlug = paymentIntent.metadata.shop_slug;
  
  console.log('🚫 Paiement annulé:');
  console.log(`   - Produit: ${shopSlug}`);
  console.log(`   - ID: ${paymentIntent.id}`);
}

// Fonction pour envoyer une alerte de stock
async function sendStockAlert(shopSlug, shopName, amount) {
  console.log(`📧 Alerte stock à envoyer pour: ${shopName}`);
  
  // Exemple d'intégration avec un service d'email
  // const emailData = {
  //   to: process.env.ADMIN_EMAIL,
  //   subject: `Vente réalisée - ${shopName}`,
  //   body: `
  //     Une vente vient d'être réalisée:
  //     - Produit: ${shopName}
  //     - Montant: ${amount}€
  //     - Action: Vérifiez le stock de ${shopSlug}
  //   `
  // };
  
  // await sendEmail(emailData);
}

// Fonction pour logger les ventes
async function logSaleToFile(paymentIntent) {
  const saleData = {
    id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    shop_slug: paymentIntent.metadata.shop_slug,
    shop_name: paymentIntent.metadata.shop_name,
    timestamp: new Date().toISOString(),
    email: paymentIntent.receipt_email || null
  };
  
  console.log('💾 Données de vente à sauvegarder:', saleData);
  
  // Ici vous pourriez sauvegarder dans une base de données
  // ou envoyer vers un service d'analytics
}

// Fonction exemple pour mise à jour d'inventaire externe
async function updateExternalInventory(shopSlug) {
  console.log(`📦 Mise à jour inventaire externe pour: ${shopSlug}`);
  
  // Exemple d'intégration avec un service tiers
  // try {
  //   const response = await fetch('https://votre-api-inventaire.com/decrease', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ sku: shopSlug, quantity: 1 })
  //   });
  //   
  //   if (response.ok) {
  //     console.log('✅ Inventaire mis à jour');
  //   } else {
  //     console.error('❌ Erreur mise à jour inventaire');
  //   }
  // } catch (error) {
  //   console.error('Erreur API inventaire:', error);
  // }
}