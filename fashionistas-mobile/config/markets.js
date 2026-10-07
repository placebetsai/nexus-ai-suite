// Marketplace registry for the Connect screen.
//
// `origin`    - canonical site origin (no trailing slash).
// `createUrl` - full URL we point the WebView at to test the login state.
//               Chosen per site: origin + "/login" where that path exists,
//               the site root where it does not (Vinted, Grailed), plus the
//               site-specific entry points eBay and Etsy require.
//               Verified against the live sites on 2026-10-05.

export const markets = [
  {
    id: 'poshmark',
    name: 'Poshmark',
    origin: 'https://poshmark.com',
    createUrl: 'https://poshmark.com/login',
  },
  {
    id: 'mercari',
    name: 'Mercari',
    origin: 'https://www.mercari.com',
    createUrl: 'https://www.mercari.com/login',
  },
  {
    id: 'depop',
    name: 'Depop',
    origin: 'https://www.depop.com',
    createUrl: 'https://www.depop.com/login',
  },
  {
    id: 'vinted',
    name: 'Vinted',
    origin: 'https://www.vinted.com',
    // No /login path exists (it 404s); sign-in is a modal opened from the root.
    createUrl: 'https://www.vinted.com',
  },
  {
    id: 'grailed',
    name: 'Grailed',
    origin: 'https://www.grailed.com',
    // /login is another user's profile, not the sign-in form; root it is.
    createUrl: 'https://www.grailed.com',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    origin: 'https://www.facebook.com',
    createUrl: 'https://www.facebook.com/login',
  },
  {
    id: 'kidizen',
    name: 'Kidizen',
    origin: 'https://www.kidizen.com',
    createUrl: 'https://www.kidizen.com/login',
  },
  {
    id: 'vestiaire',
    name: 'Vestiaire Collective',
    origin: 'https://www.vestiairecollective.com',
    createUrl: 'https://www.vestiairecollective.com/login',
  },
  {
    id: 'whatnot',
    name: 'Whatnot',
    origin: 'https://www.whatnot.com',
    createUrl: 'https://www.whatnot.com/login',
  },
  {
    id: 'ebay',
    name: 'eBay',
    origin: 'https://www.ebay.com',
    // Seller hub: signed-out users bounce to signin.ebay.com/ws/eBayISAPI.dll.
    createUrl: 'https://www.ebay.com/lstng',
  },
  {
    id: 'etsy',
    name: 'Etsy',
    origin: 'https://www.etsy.com',
    // Listing tool: signed-out users bounce to /signin.
    createUrl: 'https://www.etsy.com/your/shops/me/tools/listings/create',
  },
];

export default markets;
