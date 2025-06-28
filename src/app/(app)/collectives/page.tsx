import { redirect } from 'next/navigation';

export default function CollectivesPage(): never {
  // Redirect to dashboard since collectives are now accessible via the sidebar modal
  redirect('/dashboard');
}
