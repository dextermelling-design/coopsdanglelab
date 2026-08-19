/**
 * Shared sticky header, footer, and feedback chrome.
 * Injects into #site-top / #site-bottom — no document.write
 * (that can close the document and skip first-load init).
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

  const top = document.getElementById('site-top');
  if (top) {
    top.outerHTML =
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
      '<div class="account-slot" id="accountSlot">' +
      '<button type="button" class="acct-btn" id="loginBtn"><i class="fa-solid fa-user"></i> Log in</button>' +
      '</div>' +
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
      '<div id="mobileAccount"><a href="#" id="mobileLogin">Log in</a></div>' +
      '<a href="#feedback" id="mobileFeedback">Feedback</a>' +
      '</div></header>';
  }

  const bot = document.getElementById('site-bottom');
  if (bot) {
    bot.outerHTML =
      '<footer class="footer"><div class="wrap"><p>' +
      '&copy; <span id="year"></span> Coop\'s Fishing · U.S. Hot Spots. ' +
      'Water data courtesy of USGS &amp; Open-Meteo. Not affiliated with any agency. ' +
      '<button type="button" class="footer-feedback" data-open-feedback>Send feedback</button>' +
      ' · <a href="usage.html">Usage</a>' +
      '</p></div></footer>' +
      '<button type="button" class="feedback-fab" id="feedbackFab" data-open-feedback>' +
      '<i class="fa-solid fa-comment-dots" aria-hidden="true"></i><span>Feedback</span></button>' +
      '<form name="feedback" method="POST" data-netlify="true" data-netlify-honeypot="website" class="fb-detect" tabindex="-1" aria-hidden="true">' +
      '<input type="hidden" name="form-name" value="feedback">' +
      '<input type="text" name="website"><input type="text" name="kind">' +
      '<textarea name="message"></textarea><input type="text" name="water">' +
      '<input type="text" name="name"><input type="email" name="email">' +
      '<input type="text" name="href"><input type="text" name="when"></form>' +
      '<div class="fb-backdrop is-closed" id="feedbackModal">' +
      '<div class="fb-dialog" role="dialog" aria-modal="true" aria-labelledby="fbTitle">' +
      '<button type="button" class="fb-close" id="feedbackClose" aria-label="Close feedback"><i class="fa-solid fa-xmark"></i></button>' +
      '<h2 id="fbTitle">Help make this better</h2>' +
      '<p class="muted">What should Coop add, fix, or fish next? Short notes are perfect.</p>' +
      '<form id="feedbackForm" method="POST" action="/" data-netlify-honeypot="website">' +
      '<input type="hidden" name="form-name" value="feedback">' +
      '<input type="hidden" name="href" id="fbHref" value="">' +
      '<input type="hidden" name="when" id="fbWhen" value="">' +
      '<input type="text" name="website" class="fb-honey" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<fieldset class="fb-kinds"><legend class="sr-only">What kind of note?</legend>' +
      '<label><input type="radio" name="kind" value="idea" checked> Idea</label>' +
      '<label><input type="radio" name="kind" value="missing"> Missing water</label>' +
      '<label><input type="radio" name="kind" value="bug"> Something\'s off</label>' +
      '<label><input type="radio" name="kind" value="love"> Love it</label></fieldset>' +
      '<label>Your note<textarea id="fbMessage" name="message" required maxlength="2000" rows="5" placeholder="Add Lake X, the Erie chart is confusing, I fish the Delta…"></textarea></label>' +
      '<label>Related water <span class="fb-opt">(optional)</span>' +
      '<select id="fbWater" name="water"><option value="">None / general</option></select></label>' +
      '<div class="fb-row"><label>Name <span class="fb-opt">(optional)</span>' +
      '<input type="text" id="fbName" name="name" maxlength="80" placeholder="How should we thank you?"></label>' +
      '<label>Email <span class="fb-opt">(optional)</span>' +
      '<input type="email" id="fbEmail" name="email" maxlength="120" placeholder="If you want a reply"></label></div>' +
      '<p class="fb-status" id="fbStatus" role="status"></p>' +
      '<button type="submit" class="btn btn-primary" id="fbSubmit"><i class="fa-solid fa-paper-plane"></i> Send feedback</button>' +
      '</form></div></div>' +
      '<div class="fb-backdrop is-closed" id="loginModal">' +
      '<div class="fb-dialog" role="dialog" aria-modal="true" aria-labelledby="loginTitle">' +
      '<button type="button" class="fb-close" id="loginClose" aria-label="Close login"><i class="fa-solid fa-xmark"></i></button>' +
      '<h2 id="loginTitle">Log in to save waters</h2>' +
      '<p class="muted">We email you a one-time link. No password to remember.</p>' +
      '<form id="loginForm">' +
      '<label>Email <input type="email" id="loginEmail" required placeholder="you@email.com" autocomplete="email"></label>' +
      '<p class="fb-status" id="loginStatus" role="status"></p>' +
      '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-envelope"></i> Send login link</button>' +
      '</form></div></div>';
  }
})();
