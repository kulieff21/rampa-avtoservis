-- Rampa schema.
-- The interesting part is the EXCLUDE constraint on bookings: the database itself
-- refuses two live bookings on the same bay whose time ranges overlap, so a race
-- between two customers clicking the same slot cannot produce a double booking.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE services (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  name_az      text NOT NULL,
  name_en      text NOT NULL,
  part         text NOT NULL,              -- which part of the car drawing lights up
  duration_min integer NOT NULL CHECK (duration_min > 0 AND duration_min % 15 = 0),
  price_azn    integer NOT NULL CHECK (price_azn >= 0),
  active       boolean NOT NULL DEFAULT true,
  sort         integer NOT NULL DEFAULT 0
);

CREATE TABLE bays (
  id   integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE bookings (
  id          serial PRIMARY KEY,
  code        text NOT NULL UNIQUE,
  bay_id      integer NOT NULL REFERENCES bays(id),
  period      tstzrange NOT NULL,
  status      text NOT NULL DEFAULT 'booked'
              CHECK (status IN ('booked', 'in_progress', 'done', 'cancelled')),
  customer    text NOT NULL,
  phone       text NOT NULL,
  car         text NOT NULL,
  note        text,
  total_azn   integer NOT NULL,
  source      text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'demo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_overlap_per_bay
    EXCLUDE USING gist (bay_id WITH =, period WITH &&)
    WHERE (status <> 'cancelled')
);

CREATE INDEX bookings_period_idx ON bookings USING gist (period);

CREATE TABLE booking_services (
  booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id integer NOT NULL REFERENCES services(id),
  price_azn  integer NOT NULL,             -- price at the moment of booking
  PRIMARY KEY (booking_id, service_id)
);
