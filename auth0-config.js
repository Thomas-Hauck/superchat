import { createAuth0Client } from '@auth0/auth0-spa-js';

const auth0 = await createAuth0Client({
  domain: 'dev-3lzklhobvbwvle8k.us.auth0.com',
  clientId: 'EsU2zP69bbljufXm0uraT0LQNqKbeISA',
  authorizationParams: {
    redirect_uri: window.location.origin + '/callback'
  }
});