// Builds the JavaScript that runs inside a marketplace page inside the WebView.
//
// Pure module: no React, no react-native, no react-native-webview. That lets
// lib/loginDetect.test.js compile and execute the generated script in plain
// Node against a stub DOM, which is how we know the probe is syntactically
// valid and emits the payload shape lib/loginDetect.js expects.
//
// PRIVACY CONTRACT (enforced here, stated once for the whole feature):
//   We NEVER read, request, store or log a password.
//   - We do NOT read input[type=password] values, only whether such a field exists.
//   - We do NOT capture keystrokes, focus, blur, keyup, input or paste events.
//   - We do NOT read form values or anything the user types.
//   - We only observe navigation URLs (location.pathname) and page structure:
//     control counts, existence of a password field, existence of logout/avatar/
//     sell controls, and body text used solely for the soft-404 match.

const CONTROL_SELECTOR = [
  'input',
  'select',
  'textarea',
  'button',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
].join(', ');

const NODE_SELECTOR = ['a', 'button', '[role="button"]', '[role="menuitem"]', '[role="link"]'].join(', ');

const AVATAR_SELECTOR = [
  '[class*="avatar"]',
  '[class*="Avatar"]',
  '[data-testid*="avatar"]',
  '[data-testid*="Avatar"]',
  'img[src*="avatar"]',
  'img[src*="Avatar"]',
  '[class*="profile-image"]',
  '[class*="profileImage"]',
  '[class*="user-image"]',
  '[class*="userImage"]',
].join(', ');

// Extract a pathname without the URL constructor (Hermes-safe).
export function pathOf(url) {
  const noHash = String(url).split('#')[0];
  const noQuery = noHash.split('?')[0];
  const withoutOrigin = noQuery.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '');
  return withoutOrigin || '/';
}

// Returns a script string. Ends with `true;` because injectedJavaScript treats
// the last expression as its return value.
export function buildProbeScript(market) {
  const requestedPath = pathOf(market.createUrl);
  return [
    '(function () {',
    '  var marketId = ' + JSON.stringify(market.id) + ';',
    '  var requestedPath = ' + JSON.stringify(requestedPath) + ';',
    '  try {',
    "    var bodyText = (document.body && document.body.innerText ? document.body.innerText : '').slice(0, 6000);",
    '    var passwordFieldCount = document.querySelectorAll(' + JSON.stringify('input[type="password"]') + ').length;',
    '    var controlCount = document.querySelectorAll(' + JSON.stringify(CONTROL_SELECTOR) + ').length;',
    '    var logout = false;',
    '    var sellBtn = false;',
    '    var nodes = document.querySelectorAll(' + JSON.stringify(NODE_SELECTOR) + ');',
    '    for (var i = 0; i < nodes.length && i < 400; i++) {',
    "      var t = (nodes[i].innerText || nodes[i].textContent || '').replace(/\\s+/g, ' ').trim();",
    '      if (!t || t.length > 40) continue;',
    '      if (/^(log\\s*out|sign\\s*out)$/i.test(t)) logout = true;',
    "      if (/^(sell now|list an? (item|listing)|create (a )?listing|start selling)$/i.test(t)) sellBtn = true;",
    '    }',
    '    var avatarCount = document.querySelectorAll(' + JSON.stringify(AVATAR_SELECTOR) + ').length;',
    '    var payload = {',
    "      type: 'login-probe',",
    '      marketId: marketId,',
    '      requestedPath: requestedPath,',
    "      finalPath: location.pathname || '',",
    '      signals: {',
    '        hasPasswordField: passwordFieldCount > 0,',
    '        logout: logout,',
    '        avatar: avatarCount > 0,',
    '        sellBtn: sellBtn,',
    '        controlCount: controlCount,',
    '        bodyText: bodyText',
    '      }',
    '    };',
    '    window.ReactNativeWebView.postMessage(JSON.stringify(payload));',
    '  } catch (e) {',
    '    try {',
    "      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'login-probe-error', marketId: marketId, message: String(e) }));",
    '    } catch (ignored) {}',
    '  }',
    '})();',
    'true;',
  ].join('\n');
}

export default buildProbeScript;
