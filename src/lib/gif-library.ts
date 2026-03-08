/**
 * Built-in GIF Library
 *
 * Uses Google Noto Emoji Animated (Apache 2.0 license).
 * These URLs require zero API calls — served directly from Google Fonts CDN.
 * Format: https://fonts.gstatic.com/s/e/notoemoji/latest/{unicode}/512.gif
 *
 * This static library is the instant-load fallback. The app also syncs
 * these packs to the database so admins can add custom GIFs on top.
 */

export interface GifItem {
  id: string;
  title: string;
  url: string;      // animated gif/webp
  thumbUrl?: string; // optional separate thumbnail (defaults to url)
  tags: string[];
}

export interface GifPack {
  id: string;
  name: string;
  emoji: string;
  gifs: GifItem[];
}

/** Build a Noto Emoji Animated URL for a given unicode codepoint string */
function noto(code: string): string {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.gif`;
}

export const BUILT_IN_PACKS: GifPack[] = [
  // ── Reactions ────────────────────────────────────────────────────────────
  {
    id: 'reactions',
    name: 'Reactions',
    emoji: '😂',
    gifs: [
      { id: 'thumbs-up',    title: 'Thumbs Up',    url: noto('1f44d'),       tags: ['yes', 'good', 'like', 'approve'] },
      { id: 'thumbs-down',  title: 'Thumbs Down',  url: noto('1f44e'),       tags: ['no', 'bad', 'dislike'] },
      { id: 'heart',        title: 'Heart',        url: noto('2764_fe0f'),   tags: ['love', 'like', 'heart'] },
      { id: 'lol',          title: 'LOL',          url: noto('1f602'),       tags: ['funny', 'laugh', 'lol', 'haha'] },
      { id: 'wow',          title: 'Wow',          url: noto('1f62e'),       tags: ['wow', 'shocked', 'surprised'] },
      { id: 'sad',          title: 'Sad',          url: noto('1f622'),       tags: ['sad', 'cry', 'crying'] },
      { id: 'angry',        title: 'Angry',        url: noto('1f621'),       tags: ['angry', 'mad', 'furious'] },
      { id: 'love-eyes',    title: 'Love Eyes',    url: noto('1f60d'),       tags: ['love', 'heart eyes', 'adore'] },
      { id: 'cool',         title: 'Cool',         url: noto('1f60e'),       tags: ['cool', 'sunglasses'] },
      { id: 'mind-blown',   title: 'Mind Blown',   url: noto('1f92f'),       tags: ['mind blown', 'wow', 'explode'] },
      { id: '100',          title: '100',          url: noto('1f4af'),       tags: ['100', 'perfect', 'yep'] },
      { id: 'fire',         title: 'Fire',         url: noto('1f525'),       tags: ['fire', 'hot', 'lit'] },
      { id: 'star-struck',  title: 'Star Struck',  url: noto('1f929'),       tags: ['stars', 'amazing', 'wow'] },
      { id: 'rolling-eyes', title: 'Rolling Eyes', url: noto('1f644'),       tags: ['really', 'ugh', 'sigh'] },
      { id: 'pleading',     title: 'Pleading',     url: noto('1f97a'),       tags: ['please', 'cute', 'puppy eyes'] },
      { id: 'smirk',        title: 'Smirk',        url: noto('1f60f'),       tags: ['smirk', 'knowing', 'sly'] },
    ],
  },

  // ── Celebrate ────────────────────────────────────────────────────────────
  {
    id: 'celebrate',
    name: 'Celebrate',
    emoji: '🎉',
    gifs: [
      { id: 'party',        title: 'Party',        url: noto('1f389'),       tags: ['party', 'celebrate', 'woo'] },
      { id: 'confetti',     title: 'Confetti',     url: noto('1f38a'),       tags: ['confetti', 'celebrate'] },
      { id: 'partying',     title: 'Partying',     url: noto('1f973'),       tags: ['party hat', 'celebrate'] },
      { id: 'sparkles',     title: 'Sparkles',     url: noto('2728'),        tags: ['sparkle', 'magic', 'stars'] },
      { id: 'trophy',       title: 'Trophy',       url: noto('1f3c6'),       tags: ['win', 'trophy', 'winner'] },
      { id: 'birthday',     title: 'Birthday Cake',url: noto('1f382'),       tags: ['birthday', 'cake'] },
      { id: 'balloon',      title: 'Balloon',      url: noto('1f388'),       tags: ['balloon', 'party', 'birthday'] },
      { id: 'rocket',       title: 'Rocket',       url: noto('1f680'),       tags: ['rocket', 'launch', 'go'] },
      { id: 'boom',         title: 'Boom!',        url: noto('1f4a5'),       tags: ['boom', 'explosion', 'wow'] },
      { id: 'crown',        title: 'Crown',        url: noto('1f451'),       tags: ['crown', 'king', 'queen'] },
    ],
  },

  // ── Gestures ─────────────────────────────────────────────────────────────
  {
    id: 'gestures',
    name: 'Gestures',
    emoji: '👋',
    gifs: [
      { id: 'wave',         title: 'Wave',         url: noto('1f44b'),       tags: ['wave', 'hello', 'bye', 'hi'] },
      { id: 'clap',         title: 'Clapping',     url: noto('1f44f'),       tags: ['clap', 'applause', 'bravo'] },
      { id: 'raised-hands', title: 'Raised Hands', url: noto('1f64c'),       tags: ['yes', 'raised', 'celebrate'] },
      { id: 'facepalm',     title: 'Facepalm',     url: noto('1f926'),       tags: ['facepalm', 'ugh', 'really'] },
      { id: 'shrug',        title: 'Shrug',        url: noto('1f937'),       tags: ['shrug', 'idk', 'whatever'] },
      { id: 'thinking',     title: 'Thinking',     url: noto('1f914'),       tags: ['think', 'hmm', 'thinking'] },
      { id: 'dance-woman',  title: 'Dance',        url: noto('1f483'),       tags: ['dance', 'dancing', 'party'] },
      { id: 'dance-man',    title: 'Dancer',       url: noto('1f57a'),       tags: ['dance', 'dancing', 'groove'] },
      { id: 'thanks',       title: 'Thanks',       url: noto('1f64f'),       tags: ['pray', 'please', 'thanks'] },
      { id: 'muscle',       title: 'Strong',       url: noto('1f4aa'),       tags: ['strong', 'flex', 'muscle'] },
      { id: 'ok',           title: 'OK',           url: noto('1f44c'),       tags: ['ok', 'alright', 'fine'] },
      { id: 'point-right',  title: 'Point Right',  url: noto('1f449'),       tags: ['this', 'point', 'right'] },
    ],
  },

  // ── Animals ──────────────────────────────────────────────────────────────
  {
    id: 'animals',
    name: 'Animals',
    emoji: '🐱',
    gifs: [
      { id: 'cat',          title: 'Cat',          url: noto('1f431'),       tags: ['cat', 'kitten', 'meow'] },
      { id: 'dog',          title: 'Dog',          url: noto('1f436'),       tags: ['dog', 'puppy', 'woof'] },
      { id: 'panda',        title: 'Panda',        url: noto('1f43c'),       tags: ['panda', 'bear', 'cute'] },
      { id: 'koala',        title: 'Koala',        url: noto('1f428'),       tags: ['koala', 'cute', 'sleepy'] },
      { id: 'frog',         title: 'Frog',         url: noto('1f438'),       tags: ['frog', 'kermit', 'green'] },
      { id: 'fox',          title: 'Fox',          url: noto('1f98a'),       tags: ['fox', 'clever', 'cute'] },
      { id: 'penguin',      title: 'Penguin',      url: noto('1f427'),       tags: ['penguin', 'cute', 'cold'] },
      { id: 'unicorn',      title: 'Unicorn',      url: noto('1f984'),       tags: ['unicorn', 'magic', 'rainbow'] },
      { id: 'bear',         title: 'Bear',         url: noto('1f43b'),       tags: ['bear', 'cute', 'hug'] },
      { id: 'bunny',        title: 'Bunny',        url: noto('1f430'),       tags: ['bunny', 'rabbit', 'cute'] },
      { id: 'hamster',      title: 'Hamster',      url: noto('1f439'),       tags: ['hamster', 'cute', 'tiny'] },
      { id: 'owl',          title: 'Owl',          url: noto('1f989'),       tags: ['owl', 'wise', 'bird'] },
    ],
  },
];

/** Flat search across all built-in packs */
export function searchBuiltIn(query: string): GifItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return BUILT_IN_PACKS.flatMap((p) => p.gifs);
  return BUILT_IN_PACKS.flatMap((p) =>
    p.gifs.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.tags.some((t) => t.includes(q)),
    ),
  );
}

/** Find a pack by id */
export function getBuiltInPack(id: string): GifPack | undefined {
  return BUILT_IN_PACKS.find((p) => p.id === id);
}
