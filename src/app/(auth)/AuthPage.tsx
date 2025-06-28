import { Suspense } from 'react';

import SignInPageClient from './sign-in/SignInPageClient';
import SignUpPageClient from './sign-up/SignUpPageClient';

interface AuthPageProps {
  mode: 'sign-in' | 'sign-up';
}

export default function AuthPage({ mode }: AuthPageProps): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      {mode === 'sign-in' ? <SignInPageClient /> : <SignUpPageClient />}
    </Suspense>
  );
}
