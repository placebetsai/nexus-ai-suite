// Pure login-state detector.
//
// This module must stay free of React, react-native and react-native-webview
// imports so it can be unit-tested with plain `node`. The WebView only ever
// sends us navigation URLs and coarse page-structure signals; this function
// turns those signals into a verdict.

// Reason codes this detector can return (machine-readable, stable):
//   bounced    - we were redirected to a sign-in page -> not logged in
//   soft_404   - page body looks like a "not found" page -> not logged in
//   no_form    - page has no form controls at all (404 / empty shell / unmounted SPA)
//   login_form - page asks for a password -> not logged in
//   connected  - logout / avatar / sell button present -> logged in
//   unknown    - ambiguous -> NOT logged in (we never guess "connected")
export const REASONS = {
  BOUNCED: 'bounced',
  SOFT_404: 'soft_404',
  NO_FORM: 'no_form',
  LOGIN_FORM: 'login_form',
  CONNECTED: 'connected',
  UNKNOWN: 'unknown',
};

// Paths that mean "the site is asking you to sign in" when we land on them
// after having requested something else. Compared case-insensitively against
// the normalized final path.
const SIGN_IN_PATTERNS = [
  '/login',
  '/signin',
  '/join',
  '/signup',
  '/sign_in',
  '/auth/login',
  '/users/sign_up',
  '/ws/ebayisapi.dll',
];

// Wording that indicates an error / missing page rather than real content.
// Note the `i` flag: Etsy renders "Uh oh!" with a capital U.
const SOFT_404_PATTERN = /page not found|404|page you were looking for was not found|uh oh|we can't find/i;

// Reduce a URL or path to a comparable path: drop scheme + host, query string
// and fragment, force a leading slash, drop a trailing slash (except root).
export function normalizePath(input) {
  if (typeof input !== 'string') return '';
  let out = input.trim();
  const scheme = out.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i);
  if (scheme) out = out.slice(scheme[0].length);
  out = out.split('#')[0].split('?')[0];
  if (!out) out = '/';
  if (out.charAt(0) !== '/') out = '/' + out;
  if (out.length > 1) out = out.replace(/\/+$/, '');
  return out;
}

function isSignInPath(path) {
  const lower = path.toLowerCase();
  for (let i = 0; i < SIGN_IN_PATTERNS.length; i++) {
    if (lower.indexOf(SIGN_IN_PATTERNS[i]) !== -1) return true;
  }
  return false;
}

function notConnected(reason) {
  return { connected: false, reason: reason };
}

// Decide whether the user is logged in to a marketplace.
//
// inputs (either a single object or three positional args):
//   requestedPath - path we navigated the WebView to
//   finalPath     - path the WebView actually ended on
//   signals       - { hasPasswordField, logout, avatar, sellBtn, controlCount, bodyText }
//
// Checks run strictly in order (see REASONS above). Anything ambiguous
// returns connected:false - we never guess "connected".
export function detectLogin(a, b, c) {
  const input =
    a !== null && typeof a === 'object'
      ? a
      : { requestedPath: a, finalPath: b, signals: c };
  const sig = input.signals || {};
  const requested = normalizePath(input.requestedPath);
  const final = normalizePath(input.finalPath);

  // 1. bounced - redirected from our target onto a sign-in page.
  if (final !== requested && final !== '' && isSignInPath(final)) {
    return notConnected(REASONS.BOUNCED);
  }

  const bodyText = typeof sig.bodyText === 'string' ? sig.bodyText : '';

  // 2. soft_404 - the body reads like an error page, even if the URL looks fine.
  if (SOFT_404_PATTERN.test(bodyText)) {
    return notConnected(REASONS.SOFT_404);
  }

  // 3. no_form - zero interactive controls: a 404, an empty shell, or an SPA
  //    that never mounted. Structure, not wording, so new 404 copy can't fake a pass.
  const controlCount = sig.controlCount;
  if (typeof controlCount === 'number' && controlCount <= 0) {
    return notConnected(REASONS.NO_FORM);
  }

  // 4. login_form - the site is asking for a password right now.
  //    We only test for the field's existence; its value is never read.
  if (sig.hasPasswordField === true) {
    return notConnected(REASONS.LOGIN_FORM);
  }

  // 5. connected - an unmistakably authenticated-only element is on screen.
  if (sig.logout === true || sig.avatar === true || sig.sellBtn === true) {
    return { connected: true, reason: REASONS.CONNECTED };
  }

  // 6. unknown - ambiguous, therefore not connected.
  return notConnected(REASONS.UNKNOWN);
}

export default detectLogin;
