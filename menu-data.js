/* La Playa Blanca — menu data
   Sourced 1:1 from "La Playa Blanca - Menu.md". Items are NOT invented.
   Bubble Waffle / N Cup / Matcha added Jul 2026 straight from the owner (names & prices verbatim).
   Short descriptions + tags are card copy only.
   Exposes window.LPB_MENU = { categories, items } and fires 'lpb-menu-ready'. */
(function () {
  // category filter order exactly as on the live menu — desserts first, then drinks
  var CATEGORIES = ['All Items', 'Pancake', 'Crêpe', 'Waffle', 'Bubble Waffle', 'N Cup', 'Smoothies', 'Fresh Juice', 'Shakes', 'Matcha', 'Hot Drinks', 'BOBA', 'Ice Cream'];

  // [name, price]  (price null = "Order Now" only, no price yet)
  var RAW = {
    'Pancake': [['Nutella', 6], ['Oreo', 6.5], ['Kinder', 6.5], ['Snickers', 6.5], ['Brownie', 6.5], ['Playa Blanca', 8.5], ['Arequipe', 5], ['Crispy', 7], ['Lotus', 7.5], ['Fruits', 7.5]],
    'Crêpe': [['Nutella', 6], ['Oreo', 7], ['Kinder', 7], ['Snickers', 6.5], ['Brownie', 6.5], ['Fruits', 7], ['Fettuccine', 6.5], ['Playa Blanca', 7], ['Arequipe', 6], ['Crispy', 7], ['Barbie', 6.5], ['Flio', 6], ['Lotus', 6.5], ['Sushi', 5], ['Marshmallow', 6], ['Sushi Brownie', 6.5]],
    'Waffle': [['Nutella', 6.5], ['Oreo', 7], ['Kinder', 7], ['Snickers', 7], ['Brownie', 7], ['Fruits', 8], ['Playa Blanca', 8], ['Arequipe', 6], ['Crispy', 8], ['Lotus', 7.5], ['Cheese cake', 9]],
    'Bubble Waffle': [['Fruits', 8], ['Kinder', 7.5], ['Lotus', 8], ['Arequipe', 8], ['Nutella', 7.5]],
    'N Cup': [['Oreo Cheesecake', 7], ['Strawberry Cheesecake', 6], ['Brownie', 5], ['Lotus Cheesecake', 7], ['Crunchy N Cup', 6], ['Dubai N Cup', 7]],
    'Matcha': [['Vanilla Matcha', 3.89], ['Strawberry Matcha', 3.89], ['Drama Queen Matcha', 3.89], ['Passion Lemon Matcha', 5], ['Coconut Cloud Matcha', 4.44], ['Matcha Latte', 3.89], ['Blueberry Matcha', 5], ['Matcha Coffee', 3], ['White Pistachio Matcha', 3.89]],
    'Smoothies': [['Strawberry', 3], ['Mango', 3], ['Caramel', 3], ['Nutella with strawberry', 3.5], ['Blueberry', 3], ['Banana', 3]],
    'Fresh Juice': [['Orange', 3], ['Carrot', 3], ['Apple', 3], ['Strawberry', 3.5], ['Lemonada', 3], ['Cocktail pieces fresh', 6], ['Cocktail juice fresh', 4], ['Cocktail pieces & avocado', 6], ['Orange & strawberry', 3.5], ['Banana with milk', 3.5], ['Blue hawaii', 4], ['Avocado', 7], ['Polo fresh', 3.5]],
    'Shakes': [['Lotus', 3], ['Nutella', 3], ['Red velvet', 3], ['Kinder', 3], ['Snickers', 3], ['Marshmallow', 3], ['Bubble Gum', 3], ['Arequipe', 3], ['Caramel', 3], ['Cookies', 3], ['Mocha', 3], ['Cerlac', 3], ['Trix', 3], ['Playa Blanca', 3], ['Churro', 5]],
    'BOBA': [['Peach & Strawberry', null], ['Peach & Mango', null], ['Peach & Passion fruit', null], ['Peach & Lychee', null], ['Peach & Lemon', null], ['Tropical', null], ['Peach', null], ['Lemon', null], ['Blue Milk', null], ['Pink Milk', null], ['Matcha', null], ['Peach (Milk)', null], ['Mango (Milk)', null], ['Vanilla', null], ['Coconut', null], ['Tapioca Pearls', null], ['Strawberry (Bobas)', null], ['Tropical (Bobas)', null], ['Lychee (Bobas)', null], ['Mango (Bobas)', null], ['Blueberry (Bobas)', null], ['Passion Fruit (Bobas)', null], ['Peach (Bobas)', null], ['Cheese Cake (Topping)', null], ['Cotton Candy (Topping)', null], ['Biscuit (Topping)', null]],
    'Ice Cream': [['Croissant', null], ['Blanca ice cream', null]],
    // Hot Drinks added Sep 2026 from the owner ("Hir caramel" read as "Hot caramel")
    'Hot Drinks': [['Espresso', null], ['Americano', null], ['Latte', null], ['Mocha', null], ['White mocha', null], ['Dark mocha', null], ['Caramel macchiato', null], ['White macchiato', null], ['Hot lotus', null], ['Hot white chocolate', null], ['Hot milk chocolate', null], ['Hot cerelac', null], ['Hot caramel', null], ['Cappuccino', null], ['Pumpkin Spice Latte', null]]
  };

  // short, honest card copy keyed by flavour name (reused across categories)
  var DESC = {
    'Nutella': 'Silky hazelnut–cocoa, warm and generous',
    'Oreo': 'Crushed cookies-and-cream, dark and dreamy',
    'Kinder': 'Soft milk-chocolate Kinder, pure nostalgia',
    'Snickers': 'Caramel, peanuts and chocolate, piled on',
    'Brownie': 'Fudgy brownie chunks, deep chocolate',
    'Playa Blanca': 'The house signature — our full spread',
    'Arequipe': 'Golden dulce de leche, slow and sweet',
    'Crispy': 'Crunchy layered crisp, extra texture',
    'Lotus': 'Caramelised Biscoff, spiced and smooth',
    'Fruits': 'Fresh seasonal fruit, bright and juicy',
    'Fettuccine': 'Ribboned crêpe, a playful house cut',
    'Barbie': 'Pretty in pink, strawberry sweet',
    'Flio': 'A house twist, lightly indulgent',
    'Sushi': 'Rolled and sliced, crêpe “sushi” style',
    'Marshmallow': 'Toasted marshmallow, pillowy soft',
    'Sushi Brownie': 'Rolled crêpe sushi, brownie centre',
    'Cheese cake': 'Baked cheesecake crumble, rich and tangy',
    'Strawberry': 'Sun-ripe strawberry, cool and creamy',
    'Mango': 'Tropical mango, thick and golden',
    'Caramel': 'Buttery caramel, a smooth swirl',
    'Nutella with strawberry': 'Hazelnut–cocoa meets fresh strawberry',
    'Blueberry': 'Wild blueberry, tart and bright',
    'Banana': 'Sweet banana, mellow and creamy',
    'Orange': 'Cold-pressed orange, pure sunshine',
    'Carrot': 'Fresh carrot, earthy and sweet',
    'Apple': 'Crisp pressed apple, clean finish',
    'Lemonada': 'House lemonade, zesty and cold',
    'Cocktail pieces fresh': 'Fresh fruit medley, chopped to order',
    'Cocktail juice fresh': 'A mixed fresh-juice cocktail',
    'Cocktail pieces & avocado': 'Fruit pieces with creamy avocado',
    'Orange & strawberry': 'Orange and strawberry, pressed together',
    'Banana with milk': 'Banana blended with cold milk',
    'Blue hawaii': 'Tropical blue cooler, beach-day bright',
    'Avocado': 'Creamy avocado, rich and smooth',
    'Polo fresh': 'A chilled house cooler',
    'Red velvet': 'Red velvet shake, cocoa and cream',
    'Bubble Gum': 'Candy-pink bubble-gum shake',
    'Cookies': 'Cookies blended into thick cream',
    'Mocha': 'Coffee and chocolate, a smooth buzz',
    'Cerlac': 'Malted cereal shake, comforting',
    'Trix': 'Fruity cereal shake, full of colour',
    'Churro': 'Cinnamon-sugar churro, blended cold',
    'Peach & Strawberry': 'Peach iced tea, strawberry pop',
    'Peach & Mango': 'Peach iced tea, tropical mango',
    'Peach & Passion fruit': 'Peach iced tea, tangy passion fruit',
    'Peach & Lychee': 'Peach iced tea, floral lychee',
    'Peach & Lemon': 'Peach iced tea, bright lemon',
    'Tropical': 'Tropical iced tea, sunshine in a cup',
    'Peach': 'Classic peach iced tea',
    'Lemon': 'Zesty lemon iced tea',
    'Blue Milk': 'Dreamy blue milk tea',
    'Pink Milk': 'Rosy pink milk tea',
    'Matcha': 'Stone-ground matcha, smooth and green',
    'Peach (Milk)': 'Creamy peach milk tea',
    'Mango (Milk)': 'Creamy mango milk tea',
    'Vanilla': 'Soft vanilla milk tea',
    'Coconut': 'Cool coconut milk tea',
    'Tapioca Pearls': 'Classic chewy tapioca pearls',
    'Strawberry (Bobas)': 'Popping strawberry pearls',
    'Tropical (Bobas)': 'Popping tropical pearls',
    'Lychee (Bobas)': 'Popping lychee pearls',
    'Mango (Bobas)': 'Popping mango pearls',
    'Blueberry (Bobas)': 'Popping blueberry pearls',
    'Passion Fruit (Bobas)': 'Popping passion-fruit pearls',
    'Peach (Bobas)': 'Popping peach pearls',
    'Cheese Cake (Topping)': 'Cheesecake foam topping',
    'Cotton Candy (Topping)': 'Cloud of spun cotton candy',
    'Biscuit (Topping)': 'Crushed biscuit topping',
    'Croissant': 'Ice-cream stuffed croissant',
    'Blanca ice cream': 'Our house Blanca scoop',
    'Vanilla Matcha': 'Creamy vanilla over stone-ground matcha',
    'Strawberry Matcha': 'Fresh strawberry swirled into green matcha',
    'Drama Queen Matcha': 'Our boldest matcha — extra everything',
    'Passion Lemon Matcha': 'Passion fruit and lemon, a zesty matcha',
    'Coconut Cloud Matcha': 'Coconut cream floating on smooth matcha',
    'Matcha Latte': 'Classic matcha and milk, gently sweet',
    'Blueberry Matcha': 'Wild blueberry beneath vivid green matcha',
    'Matcha Coffee': 'Matcha meets coffee — the best of both',
    'White Pistachio Matcha': 'White chocolate and pistachio in matcha',
    'Oreo Cheesecake': 'Oreo cheesecake layered in a cup',
    'Strawberry Cheesecake': 'Strawberry cheesecake, cool in a cup',
    'Lotus Cheesecake': 'Biscoff cheesecake, spiced and smooth',
    'Crunchy N Cup': 'Layers of crunch, cream and chocolate',
    'Dubai N Cup': 'Pistachio–kunafa chocolate, Dubai style',
    'Espresso': 'A short, strong shot — pure coffee',
    'Americano': 'Espresso lengthened smooth and black',
    'Latte': 'Espresso folded into steamed milk',
    'White mocha': 'White chocolate melted into coffee',
    'Dark mocha': 'Dark chocolate, deep in espresso',
    'Caramel macchiato': 'Steamed milk marked with caramel and espresso',
    'White macchiato': 'Espresso over milk, white-chocolate sweet',
    'Hot lotus': 'Warm Biscoff, spiced and silky in a cup',
    'Hot white chocolate': 'Melted white chocolate, steamed and creamy',
    'Hot milk chocolate': 'Classic hot chocolate, rich and cosy',
    'Hot cerelac': 'Steamed malted Cerelac, warm nostalgia',
    'Hot caramel': 'Buttery caramel, steamed into warm milk',
    'Cappuccino': 'Espresso under a deep cap of foam',
    'Pumpkin Spice Latte': 'Autumn in a cup — pumpkin and warm spice'
  };

  var CAT_DESC = {
    'Pancake': 'Fluffy stacked pancakes, your way',
    'Crêpe': 'Thin French crêpe, folded and filled',
    'Waffle': 'Crisp Belgian waffle, loaded high',
    'Bubble Waffle': 'Hong Kong bubble waffle, rolled and loaded',
    'N Cup': 'Layered dessert cups, spoon-ready',
    'Matcha': 'Stone-ground matcha, iced and creamy',
    'Smoothies': 'Blended fresh, thick and cold',
    'Fresh Juice': 'Pressed fresh, nothing added',
    'Shakes': 'Thick blended shake, extra cold',
    'BOBA': 'Iced tea with chewy pearls',
    'Ice Cream': 'Cold, creamy, made in-house',
    'Hot Drinks': 'Coffee and cocoa, served steaming'
  };

  // family key that maps a category to an icon + a "temperature" tag
  var CAT_META = {
    'Pancake': { icon: 'pancake', temp: 'Warm' },
    'Crêpe': { icon: 'crepe', temp: 'Warm' },
    'Waffle': { icon: 'waffle', temp: 'Warm' },
    'Bubble Waffle': { icon: 'waffle', temp: 'Warm' },
    'N Cup': { icon: 'glass', temp: 'Cold' },
    'Matcha': { icon: 'shake', temp: 'Iced' },
    'Smoothies': { icon: 'glass', temp: 'Iced' },
    'Fresh Juice': { icon: 'juice', temp: 'Fresh' },
    'Shakes': { icon: 'shake', temp: 'Iced' },
    'BOBA': { icon: 'boba', temp: 'Iced' },
    'Ice Cream': { icon: 'scoop', temp: 'Cold' },
    'Hot Drinks': { icon: 'coffee', temp: 'Hot' }
  };

  var NUTTY = { 'Nutella': 1, 'Kinder': 1, 'Snickers': 1, 'Nutella with strawberry': 1, 'White Pistachio Matcha': 1, 'Dubai N Cup': 1 };

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  var items = [];
  CATEGORIES.forEach(function (cat) {
    if (cat === 'All Items') return;
    (RAW[cat] || []).forEach(function (row, i) {
      var name = row[0], price = row[1];
      var meta = CAT_META[cat] || { icon: 'glass', temp: '' };
      var tags = [];
      if (meta.temp) tags.push(meta.temp);
      if (NUTTY[name]) tags.push('Nuts');
      if (name === 'Playa Blanca') tags.unshift('Signature');
      items.push({
        id: cat.toLowerCase().replace(/[^a-z]/g, '') + '-' + slug(name) + '-' + i,
        name: name === 'Playa Blanca' ? 'Playa Blanca' : name,
        cat: cat,
        price: price,
        priceLabel: price == null ? null : ('$' + (Number.isInteger(price) ? price : price.toFixed(2))),
        desc: DESC[name] || CAT_DESC[cat] || '',
        tags: tags,
        icon: meta.icon,
        signature: name === 'Playa Blanca'
      });
    });
  });

  window.LPB_MENU = { categories: CATEGORIES, items: items };
  try { window.dispatchEvent(new CustomEvent('lpb-menu-ready')); } catch (e) {}
})();
