-- GIF Pack Library
-- Run this to create the built-in GIF pack tables

CREATE TABLE IF NOT EXISTS "gif_packs" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL UNIQUE,
  "emoji"      TEXT NOT NULL DEFAULT '🎭',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "gif_items" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pack_id"    UUID NOT NULL REFERENCES "gif_packs"("id") ON DELETE CASCADE,
  "title"      TEXT NOT NULL,
  "tags"       TEXT[] NOT NULL DEFAULT '{}',
  "url"        TEXT NOT NULL,
  "thumb_url"  TEXT,
  "width"      INTEGER,
  "height"     INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed default packs
INSERT INTO "gif_packs" ("name", "slug", "emoji", "sort_order") VALUES
  ('Reactions',  'reactions',  '😂', 0),
  ('Celebrate',  'celebrate',  '🎉', 1),
  ('Gestures',   'gestures',   '👋', 2),
  ('Animals',    'animals',    '🐱', 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed Reactions pack (using Google Noto Emoji Animated - Apache 2.0 licensed)
INSERT INTO "gif_items" ("pack_id", "title", "tags", "url", "sort_order")
SELECT p.id, v.title, v.tags::TEXT[], v.url, v.sort_order
FROM "gif_packs" p,
(VALUES
  ('Thumbs Up',    ARRAY['yes','good','like','approve'],          'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif', 0),
  ('Thumbs Down',  ARRAY['no','bad','dislike'],                   'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44e/512.gif', 1),
  ('Heart',        ARRAY['love','like','heart'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif', 2),
  ('LOL',          ARRAY['funny','laugh','lol','haha'],           'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif', 3),
  ('Wow',          ARRAY['wow','shocked','surprised'],            'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif', 4),
  ('Sad',          ARRAY['sad','cry','crying'],                   'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif', 5),
  ('Angry',        ARRAY['angry','mad','furious'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.gif', 6),
  ('Love Eyes',    ARRAY['love','heart eyes','adore'],            'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif', 7),
  ('Cool',         ARRAY['cool','sunglasses'],                    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif', 8),
  ('Mind Blown',   ARRAY['mind blown','wow','explode'],           'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.gif', 9),
  ('100',          ARRAY['100','perfect','yep'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif', 10),
  ('Fire',         ARRAY['fire','hot','lit'],                     'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif', 11),
  ('Star Struck',  ARRAY['stars','amazing','wow'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif', 12),
  ('Rolling Eyes', ARRAY['really','ugh','sigh'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f644/512.gif', 13),
  ('Pleading',     ARRAY['please','cute','puppy eyes'],           'https://fonts.gstatic.com/s/e/notoemoji/latest/1f97a/512.gif', 14),
  ('Smirk',        ARRAY['smirk','knowing','sly'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60f/512.gif', 15)
) AS v(title, tags, url, sort_order)
WHERE p.slug = 'reactions'
ON CONFLICT DO NOTHING;

-- Seed Celebrate pack
INSERT INTO "gif_items" ("pack_id", "title", "tags", "url", "sort_order")
SELECT p.id, v.title, v.tags::TEXT[], v.url, v.sort_order
FROM "gif_packs" p,
(VALUES
  ('Party',        ARRAY['party','celebrate','woo'],              'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif', 0),
  ('Confetti',     ARRAY['confetti','celebrate'],                 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.gif', 1),
  ('Partying',     ARRAY['party hat','celebrate'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif', 2),
  ('Sparkles',     ARRAY['sparkle','magic','stars'],              'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif', 3),
  ('Trophy',       ARRAY['win','trophy','winner'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif', 4),
  ('Birthday Cake',ARRAY['birthday','cake','celebration'],        'https://fonts.gstatic.com/s/e/notoemoji/latest/1f382/512.gif', 5),
  ('Balloon',      ARRAY['balloon','party','birthday'],           'https://fonts.gstatic.com/s/e/notoemoji/latest/1f388/512.gif', 6),
  ('Rocket',       ARRAY['rocket','launch','go','blast off'],     'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif', 7),
  ('Boom',         ARRAY['boom','explosion','wow'],               'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a5/512.gif', 8),
  ('Crown',        ARRAY['crown','king','queen','royalty'],       'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.gif', 9)
) AS v(title, tags, url, sort_order)
WHERE p.slug = 'celebrate'
ON CONFLICT DO NOTHING;

-- Seed Gestures pack
INSERT INTO "gif_items" ("pack_id", "title", "tags", "url", "sort_order")
SELECT p.id, v.title, v.tags::TEXT[], v.url, v.sort_order
FROM "gif_packs" p,
(VALUES
  ('Wave',         ARRAY['wave','hello','bye','hi'],              'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif', 0),
  ('Clapping',     ARRAY['clap','applause','bravo'],              'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif', 1),
  ('Raised Hands', ARRAY['yes','raised','celebrate'],             'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64c/512.gif', 2),
  ('Facepalm',     ARRAY['facepalm','ugh','really'],              'https://fonts.gstatic.com/s/e/notoemoji/latest/1f926/512.gif', 3),
  ('Shrug',        ARRAY['shrug','idk','whatever'],               'https://fonts.gstatic.com/s/e/notoemoji/latest/1f937/512.gif', 4),
  ('Thinking',     ARRAY['think','hmm','thinking'],               'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.gif', 5),
  ('Dance',        ARRAY['dance','dancing','party'],              'https://fonts.gstatic.com/s/e/notoemoji/latest/1f483/512.gif', 6),
  ('Dancer',       ARRAY['dance','dancing','groove'],             'https://fonts.gstatic.com/s/e/notoemoji/latest/1f57a/512.gif', 7),
  ('Thanks',       ARRAY['pray','please','thanks','namaste'],     'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif', 8),
  ('Strong',       ARRAY['strong','flex','muscle','power'],       'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.gif', 9),
  ('OK',           ARRAY['ok','alright','fine'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44c/512.gif', 10),
  ('Point Right',  ARRAY['this','point','right'],                 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f449/512.gif', 11)
) AS v(title, tags, url, sort_order)
WHERE p.slug = 'gestures'
ON CONFLICT DO NOTHING;

-- Seed Animals pack
INSERT INTO "gif_items" ("pack_id", "title", "tags", "url", "sort_order")
SELECT p.id, v.title, v.tags::TEXT[], v.url, v.sort_order
FROM "gif_packs" p,
(VALUES
  ('Cat',          ARRAY['cat','kitten','meow'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.gif', 0),
  ('Dog',          ARRAY['dog','puppy','woof'],                   'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.gif', 1),
  ('Panda',        ARRAY['panda','bear','cute'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43c/512.gif', 2),
  ('Koala',        ARRAY['koala','cute','sleepy'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f428/512.gif', 3),
  ('Frog',         ARRAY['frog','kermit','green'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f438/512.gif', 4),
  ('Fox',          ARRAY['fox','clever','cute'],                  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f98a/512.gif', 5),
  ('Penguin',      ARRAY['penguin','cute','cold'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f427/512.gif', 6),
  ('Unicorn',      ARRAY['unicorn','magic','rainbow'],            'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.gif', 7),
  ('Bear',         ARRAY['bear','cute','hug'],                    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.gif', 8),
  ('Bunny',        ARRAY['bunny','rabbit','cute','hop'],          'https://fonts.gstatic.com/s/e/notoemoji/latest/1f430/512.gif', 9),
  ('Hamster',      ARRAY['hamster','cute','tiny'],                'https://fonts.gstatic.com/s/e/notoemoji/latest/1f439/512.gif', 10),
  ('Owl',          ARRAY['owl','wise','bird','night'],            'https://fonts.gstatic.com/s/e/notoemoji/latest/1f989/512.gif', 11)
) AS v(title, tags, url, sort_order)
WHERE p.slug = 'animals'
ON CONFLICT DO NOTHING;
