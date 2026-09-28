"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="admin-error">
      <h1>Panel yüklenemedi.</h1>
      <p>İçerikleriniz saklanıyor. Tekrar deneyin.</p>
      <button onClick={reset}>Tekrar dene</button>
    </main>
  );
}
