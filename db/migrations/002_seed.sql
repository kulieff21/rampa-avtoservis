-- Reference data: three bays and the price list. Bookings are not seeded here;
-- demo bookings are generated per day by src/lib/demo.ts.

INSERT INTO bays (id, name) VALUES (1, 'Bay 1'), (2, 'Bay 2'), (3, 'Bay 3');

INSERT INTO services (slug, name_az, name_en, part, duration_min, price_azn, sort) VALUES
  ('oil',         'Yağ və filtr dəyişimi',          'Oil and filter change',    'engine',     45,  35, 1),
  ('brakes',      'Əyləc bəndləri və diskləri',      'Brake pads and discs',     'brakes',     90,  80, 2),
  ('tyres',       'Təkər dəyişimi və balans',        'Tyre change and balance',  'wheels',     45,  30, 3),
  ('alignment',   'Təkərlərin uyğunlaşdırılması',    'Wheel alignment',          'axles',      60,  40, 4),
  ('diagnostics', 'Kompüter diaqnostikası',          'Computer diagnostics',     'dash',       30,  25, 5),
  ('battery',     'Akkumulyator yoxlanışı',          'Battery test',             'battery',    15,  10, 6),
  ('ac',          'Kondisioner xidməti',             'Air-con service',          'ac',         60,  55, 7),
  ('suspension',  'Asqı yoxlanışı',                  'Suspension check',         'suspension', 45,  30, 8);
