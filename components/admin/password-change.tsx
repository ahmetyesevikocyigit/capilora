"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { api } from "./api";

const fields = [
  { name: "currentPassword", label: "Mevcut şifre", autocomplete: "current-password" },
  { name: "newPassword", label: "Yeni şifre", autocomplete: "new-password" },
  { name: "confirmPassword", label: "Yeni şifre (tekrar)", autocomplete: "new-password" },
] as const;

export function PasswordChange({
  disabled,
  unsaved,
  onBusyChange,
}: {
  disabled: boolean;
  unsaved: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="editor-paper password-settings" aria-labelledby="password-heading">
      <h2 id="password-heading">Şifre değiştir</h2>
      <p id="password-help">En az 12 karakter kullanın. Şifreniz değişince tüm oturumlar kapanır; yeni şifrenizle tekrar giriş yaparsınız.</p>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || unsaved || pending) return;
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        setError("");
        if (values.newPassword !== values.confirmPassword) {
          setError("Yeni şifreler eşleşmiyor.");
          return;
        }
        if (values.newPassword === values.currentPassword) {
          setError("Yeni şifreniz mevcut şifrenizden farklı olmalı.");
          return;
        }
        setPending(true);
        onBusyChange(true);
        try {
          await api("password", values);
          form.reset();
          setVisible({});
          onBusyChange(false);
          router.replace("/admin?password=changed");
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Şifre değiştirilemedi. Tekrar deneyin.");
          setPending(false);
          onBusyChange(false);
        }
      }}>
        <fieldset disabled={disabled || unsaved || pending}>
          <div className="password-settings-fields">
            {fields.map(({ name, label, autocomplete }) => (
              <div className="field" key={name}>
                <label htmlFor={name}>{label}</label>
                <div className="password-field">
                  <input
                    id={name}
                    name={name}
                    type={visible[name] ? "text" : "password"}
                    autoComplete={autocomplete}
                    minLength={name === "currentPassword" ? undefined : 12}
                    maxLength={200}
                    required
                    aria-describedby="password-help"
                  />
                  <button
                    type="button"
                    aria-label={`${label}: ${visible[name] ? "gizle" : "göster"}`}
                    aria-pressed={!!visible[name]}
                    onClick={() => setVisible((previous) => ({ ...previous, [name]: !previous[name] }))}
                  >
                    {visible[name] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="primary" type="submit">
            {pending ? "Şifre değiştiriliyor…" : "Şifreyi değiştir"}
          </button>
        </fieldset>
        {unsaved && <p role="status">Önce klinik bilgilerindeki değişiklikleri kaydedin.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
