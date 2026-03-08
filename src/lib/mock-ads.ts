/**
 * Mock ad data — replace with real Ad API (Google Custom Native Ads,
 * direct sponsor DB, etc.) when ready.
 */
export interface SponsoredAd {
  id: string;
  brandName: string;
  /** Short ad copy shown as the "last message" preview */
  copy: string;
  /** Brand logo / product image URL */
  imageUrl: string;
  /** Landing page */
  targetUrl: string;
  /** Optional accent colour for the avatar ring */
  accentColor?: string;
}

export const MOCK_ADS: SponsoredAd[] = [
  {
    id: 'ad-bolt',
    brandName: 'Bolt Delivery',
    copy: 'Get groceries delivered in 10 minutes. First order free! 🛒',
    imageUrl: 'https://ui-avatars.com/api/?name=Bolt&background=FCD34D&color=1F2937&bold=true&size=128',
    targetUrl: 'https://bolt.eu',
    accentColor: '#FCD34D',
  },
  {
    id: 'ad-afrilearn',
    brandName: 'Afrilearn',
    copy: "Master any skill with Africa's #1 e-learning platform. 🎓",
    imageUrl: 'https://ui-avatars.com/api/?name=AL&background=10B981&color=FFFFFF&bold=true&size=128',
    targetUrl: 'https://myafrilearn.com',
    accentColor: '#10B981',
  },
  {
    id: 'ad-flutterwave',
    brandName: 'Flutterwave',
    copy: 'Send money to anyone in Africa — zero fees this weekend. 💳',
    imageUrl: 'https://ui-avatars.com/api/?name=FW&background=F97316&color=FFFFFF&bold=true&size=128',
    targetUrl: 'https://flutterwave.com',
    accentColor: '#F97316',
  },
  {
    id: 'ad-piggyvest',
    brandName: 'PiggyVest',
    copy: 'Save daily and earn up to 15% p.a. interest. Start with ₦100. 🐷',
    imageUrl: 'https://ui-avatars.com/api/?name=PV&background=6366F1&color=FFFFFF&bold=true&size=128',
    targetUrl: 'https://piggyvest.com',
    accentColor: '#6366F1',
  },
];
