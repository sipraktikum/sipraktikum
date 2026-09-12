"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"asisten" | "praktikan">("praktikan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [npm, setNpm] = useState("");
  const [kodeKelas, setKodeKelas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email atau password salah.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nama, npm, role } },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Kalau praktikan mengisi kode kelas, langsung daftarkan ke kelas tersebut
    if (role === "praktikan" && kodeKelas.trim() && data.user) {
      const { data: kelas } = await supabase
        .from("kelas_praktikum")
        .select("id")
        .eq("kode_kelas", kodeKelas.trim().toUpperCase())
        .maybeSingle();

      if (kelas) {
        await supabase
          .from("anggota_kelas")
          .insert({ kelas_id: kelas.id, praktikan_id: data.user.id });
      } else {
        setError("Akun berhasil dibuat, tapi kode kelas tidak ditemukan. Kamu bisa join kelas nanti dari dashboard.");
      }
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink relative overflow-hidden flex items-center justify-center px-4">
      <div
        className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #B98CE0, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #E7AC5D, transparent 70%)" }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent1 to-accent2" />
          <span className="font-display text-lg font-medium text-white tracking-tight">SiPraktikum</span>
        </div>

        <div className="surface p-8">
          <h1 className="font-display text-2xl font-medium text-white tracking-tight">
            {mode === "login" ? "Masuk ke akunmu" : "Buat akun baru"}
          </h1>
          <p className="text-sm text-white/45 mt-1 mb-6">
            Kelola absensi, tugas, dan nilai praktikum di satu tempat.
          </p>

          <div className="flex gap-1 mb-6 bg-white/[0.04] p-1 rounded-full text-sm">
            <button
              className={mode === "login" ? "flex-1 py-1.5 rounded-full bg-white/10 text-white font-medium transition" : "flex-1 py-1.5 rounded-full text-white/45 transition"}
              onClick={() => setMode("login")}
            >
              Masuk
            </button>
            <button
              className={mode === "register" ? "flex-1 py-1.5 rounded-full bg-white/10 text-white font-medium transition" : "flex-1 py-1.5 rounded-full text-white/45 transition"}
              onClick={() => setMode("register")}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3">
            {mode === "register" && (
              <>
                <div className="flex gap-2 text-sm mb-1">
                  <button
                    type="button"
                    onClick={() => setRole("praktikan")}
                    className={role === "praktikan" ? "flex-1 py-1.5 rounded-full bg-gradient-to-r from-accent1 to-accent2 text-ink font-medium" : "flex-1 py-1.5 rounded-full border border-white/10 text-white/60"}
                  >
                    Praktikan
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("asisten")}
                    className={role === "asisten" ? "flex-1 py-1.5 rounded-full bg-gradient-to-r from-accent1 to-accent2 text-ink font-medium" : "flex-1 py-1.5 rounded-full border border-white/10 text-white/60"}
                  >
                    Asisten
                  </button>
                </div>
                <input
                  className="field"
                  placeholder="Nama lengkap"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
                <input
                  className="field"
                  placeholder="NPM/NIM"
                  value={npm}
                  onChange={(e) => setNpm(e.target.value)}
                />
                {role === "praktikan" && (
                  <input
                    className="field"
                    placeholder="Kode kelas (opsional, dari asisten)"
                    value={kodeKelas}
                    onChange={(e) => setKodeKelas(e.target.value)}
                  />
                )}
              </>
            )}
            <input
              type="email"
              className="field"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && <p className="text-rose-300/90 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
