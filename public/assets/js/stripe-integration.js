class StripeCheckout {
  constructor(publicKey) {
    this.stripe = Stripe(publicKey);
    this.elements = null;
    this.paymentElement = null;
  }

  async initialize(amount, metadata = {}) {
    try {
      // Appel à votre Netlify Function
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          metadata: metadata
        })
      });

      const { clientSecret } = await response.json();

      // Créer les éléments Stripe
      this.elements = this.stripe.elements({
        clientSecret: clientSecret
      });

      // Créer l'élément de paiement
      this.paymentElement = this.elements.create('payment');
      this.paymentElement.mount('#payment-element');

      return clientSecret;
    } catch (error) {
      console.error('Erreur initialisation:', error);
      throw error;
    }
  }

  async confirmPayment(returnUrl) {
    if (!this.elements) {
      throw new Error('Stripe non initialisé');
    }

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: returnUrl
      }
    });

    if (error) {
      throw error;
    }
  }

  showMessage(message, isError = false) {
    const messageContainer = document.getElementById('payment-message');
    if (messageContainer) {
      messageContainer.textContent = message;
      messageContainer.className = isError ? 'error' : 'success';
      messageContainer.style.display = 'block';
    }
  }
}

// Initialisation globale
window.StripeCheckout = StripeCheckout;