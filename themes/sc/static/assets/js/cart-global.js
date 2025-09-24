// static/js/cart-global.js
// Fonction globale pour mettre à jour le compteur de panier
function updateCartCount() {
  var cart = JSON.parse(localStorage.getItem('cart') || '[]');
  var count = 0;
  
  for (var i = 0; i < cart.length; i++) {
    count += cart[i].quantity;
  }
  
  var countElement = document.getElementById('cart-count');
  if (countElement) {
    countElement.textContent = count;
  }
  
  // Mettre à jour aussi le titre de la page panier si on y est
  var panierTitle = document.querySelector('h1');
  if (panierTitle && panierTitle.textContent.includes('Panier')) {
    panierTitle.textContent = 'Panier (' + count + ')';
  }
  
  console.log('Compteur panier mis à jour:', count);
}

// Initialiser le compteur au chargement de chaque page
document.addEventListener('DOMContentLoaded', function() {
  updateCartCount();
});