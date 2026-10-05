"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="commerce-error-page">
      <span>THE EDIT / TEMPORARILY INTERRUPTED</span>
      <h1>The collection didn&apos;t load.</h1>
      <p>Your bag is safe on this device. Try loading this view again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
