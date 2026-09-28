export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
): Promise<T> {
  const res = await fetch(
    `/api/admin/${path}`,
    data === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  if (res.status === 401 && path !== "login") {
    throw new Error("Oturumunuz sona erdi.");
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "İşlem tamamlanamadı.");
  return json as T;
}
