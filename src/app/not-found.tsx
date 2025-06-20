import Link from 'next/link';
import React from 'react';

export default function NotFound(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontSize: '2rem' }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: '2rem' }}>
        Sorry, the page you are looking for does not exist.
      </p>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        Return to Homepage
      </Link>
    </div>
  );
}
