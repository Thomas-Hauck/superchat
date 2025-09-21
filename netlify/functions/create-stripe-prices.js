// netlify/functions/create-stripe-prices.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  console.log('🚀 Function create-stripe-prices appelée');
  
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY manquante');
    }

    const contentPath = path.join(process.cwd(), 'themes/sc/content/shop');
    console.log('📁 Chemin content:', contentPath);
    
    const files = await fs.readdir(contentPath);
    console.log('📄 Fichiers trouvés:', files);
    
    const results = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(contentPath, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter } = matter(fileContent);

      console.log(`📝 Traitement de ${file}:`, {
        title: frontmatter.title,
        price: frontmatter.price,
        stripe_price_id: frontmatter.stripe_price_id
      });

      if (!frontmatter.stripe_price_id && frontmatter.price) {
        console.log(`💰 Création produit Stripe pour: ${frontmatter.title}`);
        
        // Créer le produit Stripe
        const product = await stripe.products.create({
          name: frontmatter.title,
          description: frontmatter.description || '',
          images: frontmatter.images || [],
        });

        // Créer le prix
        const price = await stripe.prices.create({
          unit_amount: Math.round(frontmatter.price * 100), // Convertir en centimes
          currency: frontmatter.currency || 'eur',
          product: product.id,
        });

        console.log(`✅ Prix créé: ${price.id} pour ${frontmatter.title}`);

        // Mettre à jour le fichier avec le price_id
        const updatedContent = fileContent.replace(
          /stripe_price_id:\s*['""].*['""]?/,
          `stripe_price_id: "${price.id}"`
        );
        
        await fs.writeFile(filePath, updatedContent);

        results.push({
          file,
          product_id: product.id,
          price_id: price.id,
          title: frontmatter.title,
          price: frontmatter.price
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        created: results,
        message: `${results.length} prix créé(s)`
      }),
    };

  } catch (error) {
    console.error('❌ Erreur:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
    };
  }
};