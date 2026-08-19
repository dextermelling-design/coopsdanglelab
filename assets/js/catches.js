/**
 * Public catch board: list, upload, owner/admin delete.
 */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const BUCKET = 'catches';
  const MAX_BYTES = 12 * 1024 * 1024;
  const NOTE_MAX = 600;

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function photoUrl(path) {
    const base = (COOPS.supabase && COOPS.supabase.url) || '';
    if (!base || !path) return '';
    return (
      base.replace(/\/$/, '') +
      '/storage/v1/object/public/' +
      BUCKET +
      '/' +
      String(path)
        .split('/')
        .map(encodeURIComponent)
        .join('/')
    );
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!t) return '';
    const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.round(hrs / 24);
    if (days < 14) return days + 'd ago';
    return new Date(iso).toLocaleDateString();
  }

  function speciesList() {
    const set = new Set();
    (COOPS.baitGuide || []).forEach((b) => {
      if (b.species) set.add(b.species);
    });
    return [...set].sort();
  }

  function fillWaterSelect(sel, selected) {
    if (!sel) return;
    const spots = (COOPS.spots || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    sel.innerHTML =
      '<option value="">Other / not listed</option>' +
      spots
        .map(
          (s) =>
            '<option value="' +
            escapeHtml(s.id) +
            '">' +
            escapeHtml(s.name) +
            ' (' +
            escapeHtml(s.state) +
            ')</option>'
        )
        .join('');
    if (selected && [...sel.options].some((o) => o.value === selected)) sel.value = selected;
  }

  function fillSpeciesSelect(sel) {
    if (!sel) return;
    sel.innerHTML =
      '<option value="">Choose species</option>' +
      speciesList()
        .map((n) => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>')
        .join('') +
      '<option value="__other">Other</option>';
  }

  async function waitForAccount() {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      if (window.COOPS && COOPS.account && COOPS.account.ready) return COOPS.account;
      await new Promise((r) => setTimeout(r, 80));
    }
    return (window.COOPS && COOPS.account) || null;
  }

  async function compressImage(file) {
    const maxEdge = 1600;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      bitmap = await createImageBitmap(file);
    }
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > maxEdge || h > maxEdge) {
      const scale = Math.min(maxEdge / w, maxEdge / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process that photo'))),
        'image/jpeg',
        0.84
      );
    });
  }

  async function loadRows(waterId) {
    const acc = COOPS.account;
    const sb = acc && acc.getClient ? await acc.getClient() : null;
    if (!sb) throw new Error('Accounts are not wired up.');
    let q = sb.from('catches').select('*').order('created_at', { ascending: false }).limit(60);
    if (waterId) q = q.eq('water_id', waterId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  function canDelete(row) {
    const acc = COOPS.account;
    if (!acc || !acc.user) return false;
    if (acc.isAdmin) return true;
    return row.user_id === acc.user.id;
  }

  function renderGrid(rows) {
    const grid = $('#catchGrid');
    const status = $('#catchStatus');
    if (!grid) return;
    if (!rows.length) {
      if (status) status.textContent = 'No catches posted yet. Be the first.';
      grid.innerHTML = '<p class="empty-msg">No photos on the board yet.</p>';
      return;
    }
    if (status) status.textContent = rows.length + ' recent catch' + (rows.length === 1 ? '' : 'es');
    grid.innerHTML = rows
      .map((row) => {
        const src = photoUrl(row.photo_path);
        const waterLink = row.water_id
          ? '<a href="location.html?water=' +
            encodeURIComponent(row.water_id) +
            '">' +
            escapeHtml(row.water_name || row.water_id) +
            '</a>'
          : escapeHtml(row.water_name || '');
        const del = canDelete(row)
          ? '<button type="button" class="catch-del" data-del="' +
            escapeHtml(row.id) +
            '" data-path="' +
            escapeHtml(row.photo_path) +
            '">Remove</button>'
          : '';
        return (
          '<article class="catch-card">' +
          (src
            ? '<a class="catch-photo" href="' +
              src +
              '" target="_blank" rel="noopener"><img src="' +
              src +
              '" alt="' +
              escapeHtml(row.species) +
              ' catch"></a>'
            : '') +
          '<div class="catch-body">' +
          '<h3>' +
          escapeHtml(row.species) +
          '</h3>' +
          (waterLink ? '<p class="catch-water"><i class="fa-solid fa-location-dot"></i> ' + waterLink + '</p>' : '') +
          (row.notes ? '<p class="catch-notes">' + escapeHtml(row.notes) + '</p>' : '') +
          '<p class="catch-meta">' +
          escapeHtml(row.angler || 'Angler') +
          ' · ' +
          escapeHtml(timeAgo(row.created_at)) +
          '</p>' +
          del +
          '</div></article>'
        );
      })
      .join('');
    grid.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () =>
        removeCatch(btn.getAttribute('data-del'), btn.getAttribute('data-path'))
      );
    });
  }

  async function refresh() {
    const status = $('#catchStatus');
    const q = new URLSearchParams(location.search);
    const waterId = q.get('water') || '';
    try {
      const rows = await loadRows(waterId);
      renderGrid(rows);
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'Could not load catches.';
        status.className = 'status-line';
      }
    }
  }

  async function removeCatch(id, path) {
    if (!id) return;
    if (!confirm('Remove this catch from the public board?')) return;
    const acc = COOPS.account;
    const sb = acc && acc.getClient ? await acc.getClient() : null;
    if (!sb) return;
    if (path) {
      const { error: storageErr } = await sb.storage.from(BUCKET).remove([path]);
      if (storageErr) console.warn('catch photo', storageErr.message);
    }
    const { error } = await sb.from('catches').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Could not remove that catch.');
      return;
    }
    refresh();
  }

  function paintFormGate() {
    const acc = COOPS.account;
    const gate = $('#catchGate');
    const form = $('#catchForm');
    if (!form) return;
    if (!acc || !acc.user) {
      form.hidden = true;
      if (gate) {
        gate.hidden = false;
        gate.innerHTML =
          'Log in (top right) to post a catch photo. The board below is public — keep it family-friendly.';
      }
      return;
    }
    if (gate) gate.hidden = true;
    form.hidden = false;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const acc = COOPS.account;
    const status = $('#catchFormStatus');
    const submit = $('#catchSubmit');
    if (!acc || !acc.user) {
      if (status) status.textContent = 'Log in first.';
      return;
    }
    const file = $('#catchPhoto') && $('#catchPhoto').files && $('#catchPhoto').files[0];
    if (!file) {
      if (status) status.textContent = 'Add a photo of the fish.';
      return;
    }
    if (!/^image\//.test(file.type)) {
      if (status) status.textContent = 'Use a photo file (jpg, png, or webp).';
      return;
    }
    if (file.size > MAX_BYTES) {
      if (status) status.textContent = 'That photo is too large (max about 12 MB).';
      return;
    }
    let species = ($('#catchSpecies') && $('#catchSpecies').value) || '';
    if (species === '__other') species = (($('#catchSpeciesOther') && $('#catchSpeciesOther').value) || '').trim();
    if (!species) {
      if (status) status.textContent = 'Say what you caught.';
      return;
    }
    const notes = (($('#catchNotes') && $('#catchNotes').value) || '').trim().slice(0, NOTE_MAX);
    const waterId = ($('#catchWater') && $('#catchWater').value) || '';
    const spot = (COOPS.spots || []).find((s) => s.id === waterId);
    const waterName = spot
      ? spot.name
      : (($('#catchWaterOther') && $('#catchWaterOther').value) || '').trim();
    const sb = await acc.getClient();
    if (!sb) {
      if (status) status.textContent = 'Could not reach accounts.';
      return;
    }
    if (status) {
      status.textContent = 'Uploading photo…';
      status.className = 'fb-status';
    }
    if (submit) submit.disabled = true;
    try {
      const blob = await compressImage(file);
      const path = acc.user.id + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '.jpg';
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
      if (upErr) throw upErr;
      const angler = ((acc.user.email || 'Angler').split('@')[0] || 'Angler').slice(0, 24);
      const { error: insErr } = await sb.from('catches').insert({
        user_id: acc.user.id,
        water_id: waterId || null,
        water_name: waterName || null,
        species: species.slice(0, 80),
        notes,
        photo_path: path,
        angler
      });
      if (insErr) throw insErr;
      $('#catchForm').reset();
      $('#catchSpeciesOther').hidden = true;
      $('#catchWaterOther').hidden = true;
      const q = new URLSearchParams(location.search);
      fillWaterSelect($('#catchWater'), q.get('water') || '');
      if (status) {
        status.textContent = 'Posted to the board.';
        status.className = 'fb-status ok';
      }
      refresh();
    } catch (err) {
      const msg = (err && err.message) || 'Could not post that catch.';
      if (status) {
        status.textContent = /row-level security|not found|bucket/i.test(msg)
          ? 'Catch photos are not set up in Supabase yet. Run supabase/catches.sql in the SQL editor.'
          : msg;
        status.className = 'fb-status err';
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function wireForm() {
    const form = $('#catchForm');
    if (!form) return;
    fillSpeciesSelect($('#catchSpecies'));
    const q = new URLSearchParams(location.search);
    fillWaterSelect($('#catchWater'), q.get('water') || '');
    $('#catchSpecies')?.addEventListener('change', () => {
      const other = $('#catchSpeciesOther');
      if (!other) return;
      other.hidden = $('#catchSpecies').value !== '__other';
      if (!other.hidden) other.focus();
    });
    $('#catchWater')?.addEventListener('change', () => {
      const other = $('#catchWaterOther');
      if (!other) return;
      other.hidden = !!$('#catchWater').value;
    });
    if (!q.get('water')) {
      const other = $('#catchWaterOther');
      if (other) other.hidden = false;
    }
    form.addEventListener('submit', onSubmit);
  }

  async function start() {
    if (!$('#catchGrid') && !$('#catchForm')) return;
    wireForm();
    await waitForAccount();
    paintFormGate();
    refresh();
    const acc = COOPS.account;
    if (acc && acc.getClient) {
      const sb = await acc.getClient();
      if (sb) {
        sb.auth.onAuthStateChange(() => {
          paintFormGate();
          refresh();
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
