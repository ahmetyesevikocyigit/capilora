import { redirect } from "next/navigation";
import { authenticated } from "@/lib/cms/auth";
import { listEntries } from "@/lib/cms/store";
import { AdminPanel } from "@/components/admin/panel";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ view: string[] }>;
}) {
  if (!(await authenticated())) redirect("/admin");
  const { view } = await params;
  const entries = await listEntries();
  if (view[0] === "yorumlar" || (view[0] === "duzenle" && entries.some(e => e.id === view[1] && e.kind === "review")))
    redirect("/admin/genel");
  if (view[0] === "medya" || view[0] === "galeri") {
    const page = entries.find(e => e.id === view[1] && e.kind === "page" && !e.deletedAt);
    redirect(page ? `/admin/duzenle/${page.id}` : "/admin/sayfalar");
  }
  if (view[0] === "menu-footer") redirect("/admin/ayarlar");
  return (
    <AdminPanel view={view} entries={entries} />
  );
}
