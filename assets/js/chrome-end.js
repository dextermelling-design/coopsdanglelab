/**
 * Shared footer + feedback modal. Runs at the end of <body>.
 */
(function () {
  'use strict';
  if (typeof document.write !== 'function') return;
  if (window.__COOPS_CHROME_END__) return;
  window.__COOPS_CHROME_END__ = true;

  document.write(
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
      '</form></div></div>'
  );
})();
