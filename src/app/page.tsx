import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Decide on the server: one redirect instead of three client-side loading
// screens (auth skeleton → splash → chat list) flashing past each other.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  redirect(session?.user ? '/dm' : '/login');
}
