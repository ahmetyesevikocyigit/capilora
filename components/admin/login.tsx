"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
export function Login({ passwordChanged = false }: { passwordChanged?: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="login-layout">
      <div className="login-image">
        <Image
          src="/admin/login-equipment.webp"
          alt=""
          fill
          priority
          sizes="50vw"
        />
        <div className="login-shade" />
        <Link href="/tr" className="login-brand">
          capilora<span>HAIR CLINIC</span>
        </Link>
      </div>
      <div className="login-form-area">
        <form
          method="post"
          action="/api/admin/login"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            const data = new FormData(event.currentTarget);
            try {
              const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: data.get("password") }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error);
              router.replace("/admin/genel");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Giriş yapılamadı.");
              setPending(false);
            }
          }}
        >
          <h1>Yönetim Paneli</h1>
          {passwordChanged && <p className="form-success" role="status">Şifreniz güncellendi. Yeni şifrenizle giriş yapın.</p>}
          <label htmlFor="password">Şifreniz</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              maxLength={200}
              autoFocus
            />
            <button
              type="button"
              aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary login-submit" disabled={pending}>
            {pending ? "Giriş yapılıyor…" : "Panele giriş yapın"}
            <ArrowRight size={18} />
          </button>
          <Link className="login-return" href="/tr">
            Siteye dönün
          </Link>
        </form>
        <p className="login-footer">Capilora Hair Clinic</p>
      </div>
    </main>
  );
}
