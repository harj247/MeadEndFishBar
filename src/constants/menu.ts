import { MenuItem, MenuCategory } from '@/types';

export const CATEGORIES: MenuCategory[] = [
  { id: 'fish',     name: 'Fish',           icon: '🐟' },
  { id: 'chips',    name: 'Chips',          icon: '🍟' },
  { id: 'kebabs',   name: 'Kebabs',         icon: '🥙' },
  { id: 'burgers',  name: 'Burgers',        icon: '🍔' },
  { id: 'chicken',  name: 'Chicken',        icon: '🍗' },
  { id: 'pies',     name: 'Pies & Pasties', icon: '🥧' },
  { id: 'sausages', name: 'Sausages',       icon: '🌭' },
  { id: 'meals',    name: 'Meal Deals',     icon: '🍽️' },
  { id: 'kids',     name: 'Kids Meals',     icon: '⭐' },
  { id: 'extras',   name: 'Extras & Sides', icon: '🫙' },
  { id: 'desserts', name: 'Desserts',       icon: '🍰' },
  { id: 'drinks',   name: 'Drinks',         icon: '🥤' },
];

// Unsplash food image URLs — diverse, high-quality food photography
const IMG = {
  cod:         'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&q=80',
  haddock:     'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&q=80',
  fishChips:   'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80',
  scampi:      'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80',
  chips:       'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400&q=80',
  cheeseChips: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80',
  kebab:       'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  kebabDoner:  'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80',
  burger:      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  veggieBurger:'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&q=80',
  chicken:     'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80',
  nuggets:     'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
  pie:         'https://images.unsplash.com/photo-1620921572077-b7073ab5e4f4?w=400&q=80',
  sausage:     'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=400&q=80',
  mealDeal:    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80',
  kidsMeal:    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80',
  mushy:       'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  onionRings:  'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&q=80',
  cheesecake:  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80',
  chocolate:   'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80',
  drinks:      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
  water:       'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&q=80',
  seafoodBox:  'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&q=80',
  halloumi:    'https://images.unsplash.com/photo-1614609819851-8fb47ded7c19?w=400&q=80',
  fishcake:    'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&q=80',
  prawns:      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&q=80',
};

export const MENU_ITEMS: MenuItem[] = [

  // ── FISH ───────────────────────────────────────────────────────────────────
  { id: 'cod-small',        name: 'Cod (Small)',            description: 'Fresh cod fillet in our signature crispy batter. Served with chips.',                 price: 8.00,  category: 'fish', image: IMG.cod,       popular: true  },
  { id: 'cod-large',        name: 'Cod (Large)',            description: 'Large fresh cod fillet in our signature crispy batter. Served with chips.',           price: 9.00,  category: 'fish', image: IMG.cod,       popular: true  },
  { id: 'haddock-small',    name: 'Haddock (Small)',        description: 'Fresh haddock fillet in crispy golden batter. Served with chips.',                    price: 8.00,  category: 'fish', image: IMG.haddock               },
  { id: 'haddock-large',    name: 'Haddock (Large)',        description: 'Large fresh haddock fillet in crispy golden batter. Served with chips.',              price: 9.00,  category: 'fish', image: IMG.haddock,   popular: true  },
  { id: 'plaice',           name: 'Plaice',                 description: 'Fresh plaice fillet in light crispy batter. Served with chips.',                      price: 9.00,  category: 'fish', image: IMG.fishChips              },
  { id: 'rock-eel',         name: 'Rock Eel',               description: 'Traditional rock eel in crispy batter. Served with chips.',                           price: 9.50,  category: 'fish', image: IMG.fishChips              },
  { id: 'scampi',           name: 'Scampi (10)',            description: 'Crispy wholetail scampi pieces (10). Served with chips.',                             price: 7.00,  category: 'fish', image: IMG.scampi,    popular: true  },
  { id: 'cod-roe',          name: 'Cod Roe',                description: 'Classic British cod roe, pan fried to perfection.',                                   price: 2.80,  category: 'fish', image: IMG.fishChips              },
  { id: 'fishcake',         name: 'Fish Cake',              description: 'Traditional fishcake in crispy batter.',                                              price: 2.00,  category: 'fish', image: IMG.fishcake               },
  { id: 'raw-king-prawns',  name: 'Raw King Prawns',        description: 'Ocean sea king prawns, freshly cooked.',                                              price: 6.00,  category: 'fish', image: IMG.prawns                 },
  { id: 'fish-bites',       name: 'Fish Bites (7)',         description: 'Seven crispy battered fish bites. Great for sharing.',                                price: 8.00,  category: 'fish', image: IMG.scampi                 },
  { id: 'seniors-meal',     name: 'Seniors Fish & Chips',   description: 'Smaller portion of fish in batter with chips. Perfect for seniors.',                  price: 8.50,  category: 'fish', image: IMG.fishChips              },

  // ── CHIPS ──────────────────────────────────────────────────────────────────
  { id: 'chips-kids',       name: 'Kids Chips',             description: 'Small portion of golden chips for little ones.',                                      price: 2.50,  category: 'chips', image: IMG.chips                },
  { id: 'chips-small',      name: 'Chips (Small)',          description: 'Golden hand-cut chips, lightly salted.',                                              price: 3.50,  category: 'chips', image: IMG.chips,    popular: true  },
  { id: 'chips-large',      name: 'Chips (Large)',          description: 'Large portion of golden hand-cut chips.',                                             price: 4.50,  category: 'chips', image: IMG.chips,    popular: true  },
  { id: 'cheesy-chips',     name: 'Cheesy Chips',           description: 'Golden chips topped with melted grated cheese.',                                      price: 4.80,  category: 'chips', image: IMG.cheeseChips           },
  { id: 'cheesy-chips-plus',name: 'Cheesy Chips + Beans / Gravy / Curry', description: 'Cheesy chips served with your choice of beans, gravy or curry sauce.',  price: 6.90,  category: 'chips', image: IMG.cheeseChips           },
  { id: 'chip-butty',       name: 'Chip Butty',             description: 'Chips in a soft white roll. A classic.',                                              price: 4.00,  category: 'chips', image: IMG.chips                 },

  // ── KEBABS ─────────────────────────────────────────────────────────────────
  { id: 'doner-sm',         name: 'Doner Kebab (Small)',              description: 'Seasoned doner meat with salad & sauce in pitta.',                          price: 8.50,  category: 'kebabs', image: IMG.kebabDoner, popular: true },
  { id: 'doner-lg',         name: 'Doner Kebab (Large)',              description: 'Large doner meat with salad & sauce in pitta.',                             price: 10.50, category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-xl',         name: 'Doner Kebab (X-Large)',            description: 'Extra-large doner meat with salad & sauce in pitta.',                       price: 12.00, category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'chicken-keb-sm',   name: 'Chicken Kebab (Small)',            description: 'Marinated chicken with salad & sauce in pitta.',                            price: 9.50,  category: 'kebabs', image: IMG.kebab                  },
  { id: 'chicken-keb-lg',   name: 'Chicken Kebab (Large)',            description: 'Large marinated chicken with salad & sauce in pitta.',                      price: 12.50, category: 'kebabs', image: IMG.kebab,   popular: true  },
  { id: 'chicken-keb-xl',   name: 'Chicken Kebab (X-Large)',          description: 'Extra-large marinated chicken with salad & sauce in pitta.',                price: 16.00, category: 'kebabs', image: IMG.kebab                  },
  { id: 'lamb-shish-sm',    name: 'Lamb Shish Kebab (Small)',         description: 'Tender grilled lamb shish with salad & sauce.',                             price: 10.50, category: 'kebabs', image: IMG.kebab                  },
  { id: 'lamb-shish-lg',    name: 'Lamb Shish Kebab (Large)',         description: 'Large tender grilled lamb shish with salad & sauce.',                       price: 14.00, category: 'kebabs', image: IMG.kebab                  },
  { id: 'doner-chips-sm',   name: 'Doner Meat & Chips (Small)',       description: 'Doner meat served with chips.',                                             price: 8.50,  category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-chips-lg',   name: 'Doner Meat & Chips (Large)',       description: 'Large doner meat served with chips.',                                       price: 9.50,  category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-chips-xl',   name: 'Doner Meat & Chips (X-Large)',     description: 'Extra-large doner meat served with chips.',                                 price: 11.50, category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-cheese-sm',  name: 'Doner Meat, Chips & Cheese (Sm)', description: 'Doner meat with chips and melted cheese.',                                  price: 9.00,  category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-cheese-lg',  name: 'Doner Meat, Chips & Cheese (Lg)', description: 'Large doner meat with chips and melted cheese.',                            price: 10.70, category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-cheese-xl',  name: 'Doner Meat, Chips & Cheese (XL)', description: 'Extra-large doner meat with chips and melted cheese.',                      price: 11.70, category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'portion-doner-sm', name: 'Portion of Doner Meat (Small)',    description: 'Portion of seasoned doner meat.',                                           price: 7.50,  category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'portion-doner-lg', name: 'Portion of Doner Meat (Large)',    description: 'Large portion of seasoned doner meat.',                                     price: 8.50,  category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'portion-doner-xl', name: 'Portion of Doner Meat (X-Large)', description: 'Extra-large portion of seasoned doner meat.',                               price: 10.00, category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'doner-roll',       name: 'Doner Roll',                       description: 'Doner meat in a soft roll with salad & sauce.',                             price: 7.50,  category: 'kebabs', image: IMG.kebabDoner              },
  { id: 'halloumi-keb-sm',  name: 'Grilled Halloumi Kebab (Small)',  description: 'Grilled halloumi with salad & sauce in pitta.',                              price: 8.00,  category: 'kebabs', image: IMG.halloumi                },
  { id: 'halloumi-keb-lg',  name: 'Grilled Halloumi Kebab (Large)',  description: 'Large grilled halloumi with salad & sauce in pitta.',                        price: 9.50,  category: 'kebabs', image: IMG.halloumi                },
  { id: 'combo-chicken-doner',  name: 'Chicken Shish & Doner',        description: 'Combination of chicken shish and doner meat with salad & sauce.',           price: 13.50, category: 'kebabs', image: IMG.kebab,   popular: true  },
  { id: 'combo-chicken-lamb',   name: 'Chicken Shish & Lamb Shish',   description: 'Combination of chicken shish and lamb shish with salad & sauce.',           price: 13.50, category: 'kebabs', image: IMG.kebab                  },
  { id: 'combo-lamb-doner',     name: 'Lamb Shish & Doner',           description: 'Combination of lamb shish and doner meat with salad & sauce.',              price: 13.50, category: 'kebabs', image: IMG.kebab                  },
  { id: 'chef-mix',             name: 'Chef Mix',                     description: 'Chicken Kebab, Lamb Shish & Doner — the ultimate combination.',              price: 16.00, category: 'kebabs', image: IMG.kebab,   popular: true  },

  // ── BURGERS ────────────────────────────────────────────────────────────────
  { id: 'burger-quarter',   name: '1/4 Pounder Cheese Burger',  description: 'Quarter pounder beef burger with melted cheese.',                               price: 4.50,  category: 'burgers', image: IMG.burger,       popular: true  },
  { id: 'burger-half',      name: '1/2 Pounder Cheese Burger',  description: 'Half pound beef burger with melted cheese.',                                    price: 5.50,  category: 'burgers', image: IMG.burger,       popular: true  },
  { id: 'burger-veggie',    name: 'Veggie Burger',              description: 'Tasty vegetarian burger patty.',                                                price: 5.00,  category: 'burgers', image: IMG.veggieBurger              },
  { id: 'burger-chicken',   name: 'Chicken Burger',             description: 'Crispy or grilled chicken burger.',                                             price: 5.00,  category: 'burgers', image: IMG.burger                    },
  { id: 'burger-kids',      name: 'Kids Cheese Burger',         description: 'Smaller beef cheese burger perfect for kids.',                                  price: 3.50,  category: 'burgers', image: IMG.burger                    },

  // ── CHICKEN ────────────────────────────────────────────────────────────────
  { id: 'chicken-quarter',  name: 'Quarter Chicken Breast',     description: 'Juicy quarter chicken breast.',                                                 price: 4.50,  category: 'chicken', image: IMG.chicken,    popular: true  },
  { id: 'nuggets-5',        name: 'Chicken Nuggets (5)',         description: 'Five crispy chicken nuggets.',                                                  price: 3.00,  category: 'chicken', image: IMG.nuggets                   },
  { id: 'nuggets-10',       name: 'Chicken Nuggets (10)',        description: 'Ten crispy chicken nuggets.',                                                   price: 5.50,  category: 'chicken', image: IMG.nuggets,    popular: true  },
  { id: 'goujons',          name: 'Chicken Goujons (6)',         description: 'Six crispy breaded chicken goujons.',                                           price: 5.80,  category: 'chicken', image: IMG.nuggets                   },

  // ── PIES & PASTIES ─────────────────────────────────────────────────────────
  { id: 'pie-steak',        name: 'Steak & Kidney Pie',         description: 'Traditional steak and kidney pie.',                                             price: 3.00,  category: 'pies', image: IMG.pie,       popular: true  },
  { id: 'pie-beef',         name: 'Beef & Onion Pie',           description: 'Hearty beef and onion pie.',                                                    price: 3.00,  category: 'pies', image: IMG.pie                    },
  { id: 'pie-chicken',      name: 'Chicken & Mushroom Pie',     description: 'Creamy chicken and mushroom pie.',                                              price: 3.00,  category: 'pies', image: IMG.pie                    },
  { id: 'pie-vegan',        name: 'Vegan Mushroom Pie',         description: 'Vegan-friendly mushroom pie.',                                                  price: 3.00,  category: 'pies', image: IMG.pie                    },
  { id: 'pasty-cornish',    name: 'Cornish Pasty',              description: 'Traditional Cornish pasty with beef and vegetables.',                           price: 3.00,  category: 'pies', image: IMG.pie                    },
  { id: 'pasty-cheese',     name: 'Cheese & Onion Pasty',       description: 'Cheese and onion filled pasty.',                                                price: 2.80,  category: 'pies', image: IMG.pie                    },

  // ── SAUSAGES ───────────────────────────────────────────────────────────────
  { id: 'sausage-plain-sm', name: 'Plain Sausage (Small)',      description: 'Small plain pork sausage.',                                                     price: 1.40,  category: 'sausages', image: IMG.sausage               },
  { id: 'sausage-plain-lg', name: 'Plain Sausage (Large)',      description: 'Large plain pork sausage.',                                                     price: 2.50,  category: 'sausages', image: IMG.sausage               },
  { id: 'sausage-halal',    name: 'Halal Sausage',              description: 'Halal sausage, large.',                                                         price: 2.50,  category: 'sausages', image: IMG.sausage               },
  { id: 'sausage-batt-sm',  name: 'Battered Sausage (Small)',   description: 'Small sausage in crispy golden batter.',                                        price: 1.40,  category: 'sausages', image: IMG.sausage, popular: true  },
  { id: 'sausage-batt-lg',  name: 'Battered Sausage (Large)',   description: 'Large sausage in crispy golden batter.',                                        price: 2.50,  category: 'sausages', image: IMG.sausage, popular: true  },
  { id: 'saveloy',          name: 'Saveloy (Large)',            description: 'Classic bright red saveloy sausage.',                                           price: 2.50,  category: 'sausages', image: IMG.sausage               },

  // ── MEAL DEALS ─────────────────────────────────────────────────────────────
  { id: 'meal-quarter-burger',  name: '1/4 Cheese Burger Meal',    description: '1/4 pounder cheese burger, chips & a drink.',                              price: 8.00,  category: 'meals', image: IMG.mealDeal, popular: true  },
  { id: 'meal-half-burger',     name: '1/2 Cheese Burger Meal',    description: '1/2 pounder cheese burger, chips & a drink.',                              price: 10.00, category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-chicken-quarter', name: '1/4 Chicken Meal',          description: 'Quarter chicken breast, chips & a drink.',                                 price: 10.00, category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-jumbo-sausage',   name: 'Jumbo Sausage Meal',        description: 'Jumbo sausage (plain or battered), chips & a drink.',                      price: 7.50,  category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-saveloy',         name: 'Saveloy, Chips & Drink',    description: 'Saveloy sausage, chips & a drink.',                                        price: 7.50,  category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-veggie-burger',   name: 'Veggie Burger Meal',        description: 'Veggie burger, chips & a drink.',                                          price: 8.50,  category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-chicken-burger',  name: 'Chicken Burger Meal',       description: 'Chicken burger, chips & a drink.',                                         price: 9.50,  category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-nuggets',         name: 'Chicken Nuggets Meal',      description: 'Chicken nuggets, chips & a drink.',                                        price: 9.00,  category: 'meals', image: IMG.mealDeal              },
  { id: 'meal-vegan-burger',    name: 'Vegan Burger Meal',         description: 'Vegan burger, chips & a drink.',                                           price: 8.00,  category: 'meals', image: IMG.mealDeal              },
  { id: 'seafood-box',          name: 'Sea Food Box',              description: '3 Cod Bites, 3 Scampi, 3 Large Ocean Prawns with Chips, Peas, Beans or Curry, Sachet of Tomato or Tartar Sauce.', price: 13.00, category: 'meals', image: IMG.seafoodBox, popular: true },

  // ── KIDS MEALS (all £5.80) ─────────────────────────────────────────────────
  { id: 'kids-nuggets',     name: 'Kids Chicken Nuggets Meal',   description: 'Chicken nuggets, chips & a drink.',                                           price: 5.80,  category: 'kids', image: IMG.kidsMeal, popular: true  },
  { id: 'kids-burger',      name: 'Kids Burger Meal',            description: 'Kids burger, chips & a drink.',                                               price: 5.80,  category: 'kids', image: IMG.kidsMeal              },
  { id: 'kids-fish-bites',  name: 'Kids Fish Bites Meal',        description: 'Fish bites, chips & a drink.',                                                price: 5.80,  category: 'kids', image: IMG.kidsMeal              },
  { id: 'kids-sausage',     name: 'Kids Sausage Meal',           description: 'Sausage, chips & a drink.',                                                   price: 5.80,  category: 'kids', image: IMG.kidsMeal              },
  { id: 'kids-fishcake',    name: 'Kids Fish Cake Meal',         description: 'Fish cake, chips & a drink.',                                                 price: 5.80,  category: 'kids', image: IMG.kidsMeal              },

  // ── EXTRAS & SIDES ─────────────────────────────────────────────────────────
  { id: 'onion-rings',      name: 'Onion Rings (10)',            description: 'Ten crispy battered onion rings.',                                             price: 3.20,  category: 'extras', image: IMG.onionRings, popular: true },
  { id: 'mushrooms',        name: 'Mushrooms (10)',              description: 'Ten battered mushrooms.',                                                      price: 3.20,  category: 'extras', image: IMG.mushy                },
  { id: 'batt-halloumi',    name: 'Battered Halloumi',           description: 'Crispy battered halloumi cheese.',                                             price: 5.00,  category: 'extras', image: IMG.halloumi             },
  { id: 'spring-roll',      name: 'Jumbo Veggie Spring Roll',    description: 'Large crispy vegetable spring roll.',                                          price: 3.00,  category: 'extras', image: IMG.mushy                },
  { id: 'curry-lg',         name: 'Curry Sauce (Large)',         description: 'Large portion of mild chip shop curry sauce.',                                 price: 1.80,  category: 'extras', image: IMG.mushy                },
  { id: 'mushy-lg',         name: 'Mushy Peas (Large)',          description: 'Large traditional British mushy peas.',                                        price: 1.80,  category: 'extras', image: IMG.mushy,   popular: true  },
  { id: 'beans-lg',         name: 'Beans (Large)',               description: 'Large portion of baked beans.',                                                price: 1.80,  category: 'extras', image: IMG.mushy                },
  { id: 'curry-sm',         name: 'Curry Sauce (Small)',         description: 'Small portion of mild chip shop curry sauce.',                                 price: 0.90,  category: 'extras', image: IMG.mushy                },
  { id: 'mushy-sm',         name: 'Mushy Peas (Small)',          description: 'Small traditional British mushy peas.',                                        price: 0.90,  category: 'extras', image: IMG.mushy                },
  { id: 'beans-sm',         name: 'Beans (Small)',               description: 'Small portion of baked beans.',                                                price: 0.90,  category: 'extras', image: IMG.mushy                },
  { id: 'salad-box',        name: 'Salad Box',                   description: 'Fresh salad box.',                                                             price: 3.50,  category: 'extras', image: IMG.mushy                },
  { id: 'sauce-sachet',     name: 'Sauce Sachet',                description: 'Tomato or tartar sauce sachet.',                                               price: 0.40,  category: 'extras', image: IMG.mushy                },
  { id: 'pickled-onion',    name: 'Pickled Onion',               description: 'Traditional pickled onion.',                                                   price: 0.70,  category: 'extras', image: IMG.mushy                },
  { id: 'pickled-gherkin',  name: 'Pickled Gherkin',             description: 'Pickled gherkin.',                                                             price: 0.80,  category: 'extras', image: IMG.mushy                },
  { id: 'pickled-egg',      name: 'Pickled Egg',                 description: 'Traditional pickled egg.',                                                     price: 0.90,  category: 'extras', image: IMG.mushy                },
  { id: 'bottled-vinegar',  name: 'Bottled Vinegar',             description: 'Malt vinegar bottle.',                                                         price: 1.50,  category: 'extras', image: IMG.mushy                },
  { id: 'bottled-ketchup',  name: 'Bottled Ketchup',             description: 'Tomato ketchup bottle.',                                                       price: 1.50,  category: 'extras', image: IMG.mushy                },
  { id: 'grated-cheese',    name: 'Grated Cheese',               description: 'Extra grated cheese.',                                                         price: 1.00,  category: 'extras', image: IMG.mushy                },

  // ── DESSERTS ───────────────────────────────────────────────────────────────
  { id: 'cheesecake',       name: 'Strawberry Cheesecake',       description: 'Creamy strawberry cheesecake.',                                                price: 3.50,  category: 'desserts', image: IMG.cheesecake, popular: true },
  { id: 'choc-cake',        name: 'Chocolate Fudge Cake',        description: 'Rich and indulgent chocolate fudge cake.',                                     price: 3.50,  category: 'desserts', image: IMG.chocolate             },

  // ── DRINKS ─────────────────────────────────────────────────────────────────
  { id: 'shandy',           name: 'Ben Shaws Shandy (330ml)',    description: 'Refreshing Ben Shaws shandy can.',                                             price: 1.40,  category: 'drinks', image: IMG.drinks               },
  { id: 'lemonade',         name: 'Ben Shaws Cloudy Lemonade',   description: 'Ben Shaws cloudy lemonade can.',                                               price: 1.40,  category: 'drinks', image: IMG.drinks               },
  { id: 'soft-drink-can',   name: 'Can of Soft Drink',           description: 'Chilled can of soft drink.',                                                   price: 1.40,  category: 'drinks', image: IMG.drinks, popular: true  },
  { id: 'soft-drink-bottle',name: 'Soft Drink Bottle (1.5L)',    description: '1.5 litre bottle of soft drink.',                                              price: 3.50,  category: 'drinks', image: IMG.drinks               },
  { id: 'water-bottle',     name: 'Water Bottle',                description: 'Chilled still water bottle.',                                                  price: 1.00,  category: 'drinks', image: IMG.water                },
  { id: 'fruit-shoot',      name: 'Fruit Shoot',                 description: 'Robinsons Fruit Shoot for kids.',                                              price: 1.40,  category: 'drinks', image: IMG.drinks               },
];
