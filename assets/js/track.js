/**
 * First-party page views for beta usage. Fires once per page load.
 */
(function () {
  'use strict';
  try {
    const path = location.pathname.split('/').pop() || 'index.html';
    const body = JSON.stringify({
      path: path.replace(/\.html$/i, '') || 'home',
      href: location.pathname + location.search,
      ref: document.referrer || '',
      when: new Date().toISOString()
    });
    const url = '/api/hit';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(function () {});
    }
  } catch (e) {
    /* ignore */
  }
})();
