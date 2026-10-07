// Plain Node test for lib/loginDetect.js — no test framework required.
// Run:  node lib/loginDetect.test.js
// Exits non-zero if any case fails.

import { detectLogin, normalizePath, REASONS } from './loginDetect.js';
import { buildProbeScript } from './loginProbe.js';
import { markets } from '../config/markets.js';

let passed = 0;
let failed = 0;

function check(name, actual, expectedConnected, expectedReason) {
  const connectedOk = actual && actual.connected === expectedConnected;
  const reasonOk = actual && actual.reason === expectedReason;
  if (connectedOk && reasonOk) {
    passed += 1;
    console.log(
      'PASS  ' + name + '  -> connected:' + actual.connected + ' reason:' + actual.reason
    );
  } else {
    failed += 1;
    console.log(
      'FAIL  ' +
        name +
        '  expected connected:' +
        expectedConnected +
        ' reason:' +
        expectedReason +
        '  |  got ' +
        JSON.stringify(actual)
    );
  }
}

// --- 1. bounced to /login -------------------------------------------------
check(
  'bounced to /login',
  detectLogin('/lstng', '/login', {
    hasPasswordField: true,
    logout: false,
    avatar: false,
    sellBtn: false,
    controlCount: 6,
    bodyText: 'Welcome back',
  }),
  false,
  REASONS.BOUNCED
);

// --- 2. same path, Etsy "Uh oh" 404 body ---------------------------------
check(
  'same path, Etsy "Uh oh ... not found" body',
  detectLogin('/your/shops/me/tools/listings/create', '/your/shops/me/tools/listings/create', {
    hasPasswordField: false,
    logout: false,
    avatar: false,
    sellBtn: false,
    controlCount: 12,
    bodyText: 'Uh oh! The listing you were looking for was not found.',
  }),
  false,
  REASONS.SOFT_404
);

// --- 3. same path, zero controls ----------------------------------------
check(
  'same path, zero controls',
  detectLogin('/login', '/login', {
    hasPasswordField: false,
    logout: false,
    avatar: false,
    sellBtn: false,
    controlCount: 0,
    bodyText: 'Enjoy your shopping experience',
  }),
  false,
  REASONS.NO_FORM
);

// --- 4. password field present -------------------------------------------
check(
  'password field present',
  detectLogin('/login', '/login', {
    hasPasswordField: true,
    logout: false,
    avatar: false,
    sellBtn: false,
    controlCount: 8,
    bodyText: 'Sign in to continue',
  }),
  false,
  REASONS.LOGIN_FORM
);

// --- 5. logout link present ----------------------------------------------
check(
  'logout link present',
  detectLogin('/login', '/account/settings', {
    hasPasswordField: false,
    logout: true,
    avatar: true,
    sellBtn: false,
    controlCount: 25,
    bodyText: 'Your account settings',
  }),
  true,
  REASONS.CONNECTED
);

// --- 6. empty / unknown signals ------------------------------------------
check(
  'empty signals',
  detectLogin('/login', '/login', {}),
  false,
  REASONS.UNKNOWN
);
check(
  'all-false signals',
  detectLogin('/login', '/account', {
    hasPasswordField: false,
    logout: false,
    avatar: false,
    sellBtn: false,
    controlCount: 10,
    bodyText: 'Browse our latest arrivals',
  }),
  false,
  REASONS.UNKNOWN
);

// --- 7. regression: the Etsy case that previously faked a pass ------------
check(
  'regression: Etsy same-path "page you were looking for was not found"',
  detectLogin(
    '/your/shops/me/tools/listings/create',
    '/your/shops/me/tools/listings/create',
    {
      hasPasswordField: false,
      logout: false,
      avatar: false,
      sellBtn: false,
      controlCount: 14,
      bodyText: 'Sorry, the page you were looking for was not found.',
    }
  ),
  false,
  REASONS.SOFT_404
);

// --- extra: structure beats wording --------------------------------------
// No 404 wording, no password, but also no authenticated element -> unknown.
check(
  'no password and no logout/avatar/sell -> unknown',
  detectLogin('/login', '/login', {
    hasPasswordField: false,
    logout: false,
    avatar: false,
    sellBtn: false,
    controlCount: 30,
    bodyText: 'Discover trending styles',
  }),
  false,
  REASONS.UNKNOWN
);

// --- object-form signature (as used by the spec) --------------------------
check(
  'object-form input',
  detectLogin({
    requestedPath: '/lstng',
    finalPath: '/login',
    signals: { controlCount: 5, hasPasswordField: true, bodyText: 'Sign in' },
  }),
  false,
  REASONS.BOUNCED
);

// --- normalizePath sanity -------------------------------------------------
const normCases = [
  ['/login', '/login'],
  ['/login/', '/login'],
  ['/login?ref=1', '/login'],
  ['https://poshmark.com/login?x=1#y', '/login'],
  ['https://poshmark.com', '/'],
  [null, ''],
];
let normOk = true;
for (const pair of normCases) {
  const got = normalizePath(pair[0]);
  if (got !== pair[1]) {
    normOk = false;
    console.log('FAIL  normalizePath(' + JSON.stringify(pair[0]) + ') -> ' + JSON.stringify(got) + ' expected ' + JSON.stringify(pair[1]));
  }
}
if (normOk) {
  passed += 1;
  console.log('PASS  normalizePath cases -> all matched');
} else {
  failed += 1;
}

// ---------------------------------------------------------------------------
// Probe-script execution: run buildProbeScript() output against a stub DOM to
// prove it is valid JS and that the payload it emits satisfies detectLogin.
// ---------------------------------------------------------------------------

function runProbe(market, dom) {
  const script = buildProbeScript(market);
  const document = {
    body: { innerText: dom.bodyText || '' },
    querySelectorAll(selector) {
      const key = selector.trim();
      if (dom.results && Object.prototype.hasOwnProperty.call(dom.results, key)) {
        return dom.results[key];
      }
      if (key === 'input[type="password"]') {
        return dom.password ? [{}] : [];
      }
      if (key === 'a, button, [role="button"], [role="menuitem"], [role="link"]') {
        return (dom.links || []).map((text) => ({ innerText: text }));
      }
      if (key.indexOf('avatar') !== -1) {
        return dom.avatar ? [{}] : [];
      }
      // control selector (inputs/selects/textareas/buttons/roles)
      const n = typeof dom.controlCount === 'number' ? dom.controlCount : 0;
      return new Array(n).fill(0).map(() => ({}));
    },
  };
  const location = { pathname: dom.finalPath || '/' };
  let posted = null;
  const window = {
    ReactNativeWebView: { postMessage: (s) => { posted = s; } },
  };
  const fn = new Function('document', 'location', 'window', script);
  fn(document, location, window);
  if (posted === null) return { noMessage: true };
  return JSON.parse(posted);
}

function probeCase(name, dom, expectedConnected, expectedReason) {
  const market = { id: 'poshmark', name: 'Poshmark', createUrl: 'https://poshmark.com/login' };
  const msg = runProbe(market, dom);
  if (msg.noMessage || msg.type === 'login-probe-error') {
    failed += 1;
    console.log('FAIL  ' + name + '  probe emitted no usable payload: ' + JSON.stringify(msg));
    return;
  }
  const result = detectLogin({
    requestedPath: msg.requestedPath,
    finalPath: msg.finalPath,
    signals: msg.signals,
  });
  check(name, result, expectedConnected, expectedReason);
}

// signed-out login page: password field, form controls, no logout
probeCase(
  'probe: signed-out login page -> login_form',
  { bodyText: 'Welcome back. Enter your email.', password: true, controlCount: 9, links: ['Forgot password?'], finalPath: '/login' },
  false,
  REASONS.LOGIN_FORM
);

// bounced from the seller hub onto eBay's sign-in endpoint
probeCase(
  'probe: bounced to eBay sign-in -> bounced',
  {
    bodyText: 'Sign in to continue',
    password: true,
    controlCount: 7,
    links: ['Keep me signed in'],
    finalPath: '/ws/eBayISAPI.dll',
  },
  false,
  REASONS.BOUNCED
);

// logged in: avatar + sell control, no password prompt
probeCase(
  'probe: logged-in page with avatar -> connected',
  {
    bodyText: 'Your listings. 12 items active.',
    password: false,
    avatar: true,
    controlCount: 30,
    links: ['My Closet', 'Log out'],
    finalPath: '/login',
  },
  true,
  REASONS.CONNECTED
);

// soft-404 shell
probeCase(
  'probe: soft-404 shell -> soft_404',
  {
    bodyText: "Uh oh! We can't find the page you were looking for.",
    password: false,
    controlCount: 20,
    links: ['Home'],
    finalPath: '/login',
  },
  false,
  REASONS.SOFT_404
);

// empty SPA shell: no controls at all
probeCase(
  'probe: empty SPA shell -> no_form',
  { bodyText: '', password: false, controlCount: 0, links: [], finalPath: '/login' },
  false,
  REASONS.NO_FORM
);

// Every market's probe script must compile, and pathOf must yield a sane path.
const expectedPaths = {
  poshmark: '/login',
  mercari: '/login',
  depop: '/login',
  vinted: '/',
  grailed: '/',
  facebook: '/login',
  kidizen: '/login',
  vestiaire: '/login',
  whatnot: '/login',
  ebay: '/lstng',
  etsy: '/your/shops/me/tools/listings/create',
};
let marketsOk = true;
for (const m of markets) {
  let script;
  try {
    script = buildProbeScript(m);
    new Function(script); // compiles?
  } catch (e) {
    marketsOk = false;
    console.log('FAIL  probe script for ' + m.id + ' does not compile: ' + e.message);
    continue;
  }
  const msg = runProbe(m, { bodyText: '', password: false, controlCount: 0, links: [], finalPath: '/login' });
  const want = expectedPaths[m.id];
  if (msg.requestedPath !== want) {
    marketsOk = false;
    console.log('FAIL  ' + m.id + ' requestedPath=' + JSON.stringify(msg.requestedPath) + ' expected ' + JSON.stringify(want));
  }
}
if (marketsOk && markets.length === 11) {
  passed += 1;
  console.log('PASS  all ' + markets.length + ' market probe scripts compile and produce the expected requestedPath');
} else {
  failed += 1;
  if (markets.length !== 11) console.log('FAIL  expected 11 markets, found ' + markets.length);
}

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
