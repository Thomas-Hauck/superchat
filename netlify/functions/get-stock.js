const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
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
    const { priceIds } = JSON.parse(event.body || '{}');
    
    const contentPath = path.join(process.cwd(), 'content/shop');
    const files = await fs.readdir(contentPath);
    
    const stockInfo = {};
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = path.join(contentPath, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter } = matter(fileContent);
      
      if (frontmatter.stripe_price_id && priceIds.includes(frontmatter.stripe_price_id)) {
        stockInfo[frontmatter.stripe_price_id] = {
          stock: frontmatter.stock || 0,
          title: frontmatter.title
        };
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ stockInfo })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};