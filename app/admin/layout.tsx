import type { Metadata } from "next";
import localFont from "next/font/local";
import "./admin.css";
const manrope = localFont({
  src: [
    { path: "../fonts/manrope-latin.woff2", weight: "200 800" },
    { path: "../fonts/manrope-latin-ext.woff2", weight: "200 800" },
  ],
  variable: "--font-manrope",
});
export const metadata: Metadata = {
  title: "Yönetim Paneli | Capilora",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
