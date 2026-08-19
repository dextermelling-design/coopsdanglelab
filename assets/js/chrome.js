/**
 * Shared header / footer / feedback chrome for multi-page nav.
 * Runs synchronously so the sticky bar is in the document before paint.
 */
(function () {
  'use strict';
  const page = (document.body && document.body.getAttribute('data-page')) || 'home';
  const nav = [
    { id: 'home', href: 'index.html', label: 'Home' },
    { id: 'temps', href: 'temps.html', label: 'Temps' },
    { id: 'spots', href: 'spots.html', label: 'Spots' },
    { id: 'depths', href: 'depths.html', label: 'Depths' },
    { id: 'bait', href: 'bait.html', label: 'Bait' },
    { id: 'charts', href: 'charts.html', label: 'Charts' },
    { id: 'about', href: 'about.html', label: 'About' }
  ];
  const links = nav
    .map((n) => {
      const on = n.id === page ? ' class="active"' : '';
      return '<li><a href="' + n.href + '"' + on + '>' + n.label + '</a></li>';
    })
    .join('');
  const mobile = nav
    .map((n) => {
      const on = n.id === page ? ' class="active"' : '';
      return '<a href="' + n.href + '"' + on + '>' + n.label + '</a>';
    })
    .join('');

  if (typeof document.write !== 'function') return;
  if (window.__COOPS_CHROME_HEAD__) return;
  window.__COOPS_CHROME_HEAD__ = true;

  document.write(
    '<div class="topbar"><div class="wrap">' +
      '<span><i class="fa-solid fa-water"></i> Live USGS gauges + coastal / Great Lakes buoys</span>' +
      '<span>Featured waters coast to coast · <strong>Bass · Walleye · Stripers · Redfish</strong></span>' +
      '</div></div>' +
      '<header class="site-header" id="siteHeader">' +
      '<div class="wrap nav-inner">' +
      '<a href="index.html" class="logo">' +
      '<img class="logo-mark" src="assets/images/logo-mark.jpg" width="48" height="48" alt="">' +
      '<div class="logo-text"><span>Coop\'s Fishing</span><span>U.S. Hot Spots</span></div>' +
      '</a>' +
      '<nav aria-label="Main"><ul class="nav-links">' +
      links +
      '</ul></nav>' +
      '<button class="menu-btn" id="menuBtn" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>' +
      '</div>' +
      '<div class="wrap search-bar" id="searchBar">' +
      '<form id="searchForm" role="search" autocomplete="off">' +
      '<label class="sr-only" for="globalSearch">Search fishing waters</label>' +
      '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>' +
      '<input type="search" id="globalSearch" placeholder="Search lakes, reefs, states, or species…" autocomplete="off" spellcheck="false">' +
      '<kbd class="search-kbd" title="Press / to search">/</kbd>' +
      '</form>' +
      '<div class="search-results" id="searchResults" hidden role="listbox" aria-label="Search results"></div>' +
      '</div>' +
      '<div class="mobile-menu" id="mobileMenu">' +
      mobile +
      '<a href="#feedback" id="mobileFeedback">Feedback</a>' +
      '</div></header>'
  );
})();
