/* La Playa Blanca — content loader
   All editable content lives in /content/*.json and is edited by the owner at /admin (Decap CMS).
   menu.json was generated 1:1 from the previous hardcoded data — items are NOT invented.
   Exposes window.LPB_MENU = { categories, items }, window.LPB_BUILDER, window.LPB_SITE,
   window.LPB_GALLERY and window.lpbImg(), then fires 'lpb-menu-ready'. */
(function () {
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  // builder option keys come from their names, so the owner never edits ids ("Crêpe" -> "crepe")
  function key(s) { return slug(String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')); }
  // Decap writes an emptied number field as "" — treat that as "no price yet" (Order Now)
  function num(v) { return (v === '' || v == null || isNaN(Number(v))) ? null : Number(v); }

  // Netlify Image CDN: resize big phone photos on the fly. Off-Netlify (local preview) use the raw file.
  var CDN = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.protocol !== 'file:';
  window.lpbImg = function (src, w) {
    if (!src) return '';
    if (!CDN || /^https?:/.test(src)) return src;
    return '/.netlify/images?url=' + encodeURIComponent(src) + '&w=' + (w || 800) + '&q=75';
  };

  function buildMenu(data) {
    // "All Items" is a synthetic filter — not stored in menu.json
    var categories = ['All Items'], items = [];
    (data.categories || []).forEach(function (c) {
      if (!c || !c.name) return;
      var cat = c.name;
      categories.push(cat);
      (c.items || []).forEach(function (row, i) {
        if (!row || !row.name) return;
        var name = row.name, price = num(row.price);
        var own = row.tags || [];
        var tags = [];
        if (own.indexOf('Signature') >= 0) tags.push('Signature');
        if (c.temp) tags.push(c.temp);
        own.forEach(function (t) { if (t !== 'Signature') tags.push(t); });
        var soldOut = row.available === false;
        if (soldOut) tags.unshift('Sold out');
        items.push({
          id: cat.toLowerCase().replace(/[^a-z]/g, '') + '-' + slug(name) + '-' + i,
          name: name,
          cat: cat,
          price: price,
          priceLabel: price == null ? null : ('$' + (Number.isInteger(price) ? price : price.toFixed(2))),
          desc: soldOut ? 'Sold out today — back soon' : (row.description || c.description || ''),
          tags: tags,
          icon: c.icon || 'glass',
          photo: row.photo || '',
          soldOut: soldOut,
          signature: own.indexOf('Signature') >= 0
        });
      });
    });
    return { categories: categories, items: items };
  }

  function buildBuilder(data) {
    var opt = function (o) { return { k: key(o.name), label: o.name, p: num(o.price) || 0, color: o.color || '', icon: o.icon || '' }; };
    return {
      bases: (data.bases || []).filter(function (o) { return o && o.name; }).map(opt),
      sauces: (data.sauces || []).filter(function (o) { return o && o.name; }).map(opt),
      toppings: (data.toppings || []).filter(function (o) { return o && o.name; }).map(opt),
      cream: { label: (data.cream && data.cream.name) || 'Whipped cream', p: num(data.cream && data.cream.price) || 0 }
    };
  }

  function get(name) {
    return fetch('/content/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name + '.json ' + r.status);
      return r.json();
    });
  }

  Promise.all([get('menu'), get('builder'), get('site'), get('gallery').catch(function () { return { photos: [] }; })])
    .then(function (res) {
      window.LPB_MENU = buildMenu(res[0]);
      window.LPB_BUILDER = buildBuilder(res[1]);
      window.LPB_SITE = res[2];
      window.LPB_GALLERY = res[3];
      try { window.dispatchEvent(new CustomEvent('lpb-menu-ready')); } catch (e) {}
    })
    .catch(function (e) { console.error('[content] failed to load /content/*.json —', e); });
})();
