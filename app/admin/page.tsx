import { redirect } from "next/navigation";
import { authenticated } from "@/lib/cms/auth";
import { Login } from "@/components/admin/login";
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  if (await authenticated()) redirect("/admin/genel");
  return <Login passwordChanged={(await searchParams).password === "changed"} />;
}
