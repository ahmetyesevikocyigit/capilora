"use client";
import Link from "next/link";
export function PreviewBar() {
  return (
    <div className="cms-preview-bar">
      <span>Taslak önizlemesi</span>
      <Link href="/admin">Panele dön</Link>
      <button
        onClick={async () => {
          await fetch("/api/admin/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: false }),
          });
          location.reload();
        }}
      >
        Önizlemeyi kapat
      </button>
    </div>
  );
}
