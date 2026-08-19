/**
 * Magic-link accounts + saved waters (Supabase).
 * No-ops until URL + anon key are configured.
 */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  const account = {
    user: null,
    favs: new Set(),
    client: null,
    configured: false
  };
  window.COOPS = window.COOPS || {};
  COOPS.account = account;

  function cfg() {
    const s = COOPS.supabase || {};
    return { url: s.url || '', anonKey: s.anonKey || '' };
  }

  async function resolveCfg() {
    let { url, anonKey } = cfg();
    if (url && anonKey) return { url, anonKey };
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return { url: '', anonKey: '' };
      const j = await res.json();
      return { url: j.url || '', anonKey: j.anonKey || '' };
    } catch (e) {
      return { url: '', anonKey: '' };
    }
  }

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load auth library'));
      document.head.appendChild(s);
    });
  }

  async function getClient() {
    if (account.client) return account.client;
    const { url, anonKey } = await resolveCfg();
    if (!url || !anonKey) return null;
    await loadSdk();
    account.configured = true;
    account.client = window.supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true
      }
    });
    return account.client;
  }

  async function loadFavs() {
    account.favs = new Set();
    const sb = await getClient();
    if (!sb || !account.user) return;
    const { data, error } = await sb.from('favorites').select('water_id');
    if (error) {
      console.warn('favorites', error.message);
      return;
    }
    (data || []).forEach((row) => account.favs.add(row.water_id));
  }

  function shortEmail(email) {
    if (!email) return 'Account';
    const n = email.split('@')[0];
    return n.length > 16 ? n.slice(0, 14) + '…' : n;
  }

  function paintAccount() {
    const slot = $('#accountSlot');
    if (!slot) return;
    if (!account.configured && !account.user) {
      slot.innerHTML =
        '<button type="button" class="acct-btn" id="loginBtn"><i class="fa-solid fa-user"></i> Log in</button>';
    } else if (!account.user) {
      slot.innerHTML =
        '<button type="button" class="acct-btn" id="loginBtn"><i class="fa-solid fa-user"></i> Log in</button>';
    } else {
      slot.innerHTML =
        '<a class="acct-btn" href="favorites.html"><i class="fa-solid fa-star"></i> My waters</a>' +
        '<span class="acct-name" title="' +
        account.user.email.replace(/"/g, '') +
        '">' +
        shortEmail(account.user.email) +
        '</span>' +
        '<button type="button" class="acct-btn ghost" id="logoutBtn">Log out</button>';
    }
    const mobile = $('#mobileAccount');
    if (mobile) {
      if (account.user) {
        mobile.innerHTML =
          '<a href="favorites.html">My waters</a>' +
          '<a href="#" id="mobileLogout">Log out</a>';
      } else {
        mobile.innerHTML = '<a href="#" id="mobileLogin">Log in</a>';
      }
    }
    $('#loginBtn')?.addEventListener('click', openLogin);
    $('#logoutBtn')?.addEventListener('click', logout);
    $('#mobileLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      openLogin();
    });
    $('#mobileLogout')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
    paintFavButtons();
  }

  function openLogin() {
    const modal = $('#loginModal');
    if (!modal) return;
    modal.classList.remove('is-closed');
    $('#loginEmail')?.focus();
  }

  function closeLogin() {
    $('#loginModal')?.classList.add('is-closed');
  }

  async function logout() {
    const sb = await getClient();
    if (sb) await sb.auth.signOut();
    account.user = null;
    account.favs = new Set();
    paintAccount();
  }

  async function sendMagicLink(email) {
    const sb = await getClient();
    if (!sb) {
      throw new Error(
        'Accounts are not wired up yet. Add Supabase keys (see README) and reload.'
      );
    }
    const redirectTo = location.origin + '/auth.html';
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
  }

  function paintFavButtons() {
    $$('[data-fav]').forEach((btn) => {
      const id = btn.getAttribute('data-fav');
      const on = account.favs.has(id);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const label = on ? 'Saved' : 'Save';
      const icon = on ? 'fa-solid fa-star' : 'fa-regular fa-star';
      if (!btn.dataset.keepLabel) {
        btn.innerHTML = '<i class="' + icon + '"></i> ' + label;
      }
    });
  }

  account.isFav = (id) => account.favs.has(id);

  account.toggleFav = async function (waterId) {
    if (!waterId) return false;
    if (!account.user) {
      try {
        sessionStorage.setItem('coops_return', location.href);
      } catch (e) {}
      openLogin();
      return false;
    }
    const sb = await getClient();
    if (!sb) {
      openLogin();
      return false;
    }
    if (account.favs.has(waterId)) {
      const { error } = await sb.from('favorites').delete().eq('water_id', waterId);
      if (error) throw error;
      account.favs.delete(waterId);
    } else {
      const { error } = await sb.from('favorites').insert({
        user_id: account.user.id,
        water_id: waterId
      });
      if (error) throw error;
      account.favs.add(waterId);
    }
    paintFavButtons();
    return true;
  };

  account.bindFavs = function () {
    $$('[data-fav]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await account.toggleFav(btn.getAttribute('data-fav'));
        } catch (err) {
          alert(err.message || 'Could not save that water.');
        }
      });
    });
    paintFavButtons();
  };

  function wireLoginModal() {
    $('#loginClose')?.addEventListener('click', closeLogin);
    $('#loginModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'loginModal') closeLogin();
    });
    $('#loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = ($('#loginEmail')?.value || '').trim();
      const status = $('#loginStatus');
      if (!email || email.indexOf('@') === -1) {
        if (status) status.textContent = 'Enter a real email address.';
        return;
      }
      try {
        sessionStorage.setItem('coops_return', location.href);
      } catch (err) {}
      if (status) status.textContent = 'Sending link…';
      try {
        await sendMagicLink(email);
        if (status) {
          status.textContent = 'Check your email for a login link. It may take a minute.';
          status.className = 'fb-status ok';
        }
      } catch (err) {
        if (status) {
          const raw = (err && err.message) || '';
          const badKey = /invalid api key|invalid jwt|jwt/i.test(raw);
          status.textContent = badKey
            ? 'Invalid API key. In Netlify, edit SUPABASE_ANON_KEY and paste the full publishable or anon key from Supabase (not the secret key), then redeploy.'
            : raw || 'Could not send the link.';
          status.className = 'fb-status err';
        }
      }
    });
  }

  async function start() {
    wireLoginModal();
    paintAccount();
    try {
      const sb = await getClient();
      if (!sb) {
        account.configured = false;
        paintAccount();
        return;
      }
      account.configured = true;
      const { data } = await sb.auth.getSession();
      account.user = data.session && data.session.user ? data.session.user : null;
      if (account.user) await loadFavs();
      paintAccount();
      sb.auth.onAuthStateChange(async (_event, session) => {
        account.user = session && session.user ? session.user : null;
        if (account.user) await loadFavs();
        else account.favs = new Set();
        paintAccount();
      });
    } catch (e) {
      console.warn('auth', e);
      paintAccount();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
