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

    // PENTING: kalau "Confirm email" aktif di Supabase Auth settings, signUp() TIDAK
    // langsung memberi session aktif (data.session == null) walau data.user sudah ada.
    // Tanpa session, insert ke anggota_kelas akan ditolak RLS (auth.uid() masih kosong)
    // dan gagal TANPA error yang terlihat kalau tidak dicek. Makanya praktikan yang
    // isi kode kelas saat daftar tidak pernah benar-benar ter-join.
    if (!data.session) {
      setLoading(false);
      setError(
        "Akun berhasil dibuat. Cek email kamu untuk konfirmasi dulu, lalu login dan join kelas lewat halaman Jadwal."
      );
      return;
    }

    // Kalau praktikan mengisi kode kelas, langsung daftarkan ke kelas tersebut.
    // Pakai RPC (bukan select langsung ke kelas_praktikum) karena RLS memblokir
    // select tabel itu sebelum user resmi jadi anggota kelas.
    if (role === "praktikan" && kodeKelas.trim() && data.user) {
      const { data: kelasRows, error: kelasError } = await supabase.rpc(
        "cari_kelas_by_kode",
        { p_kode: kodeKelas.trim().toUpperCase() }
      );
      const kelas = kelasRows?.[0];

      if (kelasError) console.error("Gagal cari kelas:", kelasError);

      if (kelas) {
        const { error: joinError } = await supabase
          .from("anggota_kelas")
          .insert({ kelas_id: kelas.id, praktikan_id: data.user.id });
        if (joinError) console.error("Gagal join kelas saat daftar:", joinError);
      } else {
        setError("Akun berhasil dibuat, tapi kode kelas tidak ditemukan. Kamu bisa join kelas nanti dari dashboard.");
      }
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900">SiPraktikum</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {mode === "login" ? "Masuk ke akunmu" : "Buat akun baru"}
        </p>

        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg text-sm">
          <button
            className={`flex-1 py-1.5 rounded-md transition ${mode === "login" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}
            onClick={() => setMode("login")}
          >
            Masuk
          </button>
          <button
            className={`flex-1 py-1.5 rounded-md transition ${mode === "register" ? "bg-white shadow-sm font-medium" : "text-slate-500"}`}
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
                  className={`flex-1 py-1.5 rounded-lg border ${role === "praktikan" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}
                >
                  Praktikan
                </button>
                <button
                  type="button"
                  onClick={() => setRole("asisten")}
                  className={`flex-1 py-1.5 rounded-lg border ${role === "asisten" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}
                >
                  Asisten
                </button>
              </div>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Nama lengkap"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="NPM/NIM"
                value={npm}
                onChange={(e) => setNpm(e.target.value)}
              />
              {role === "praktikan" && (
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Kode kelas (opsional, dari asisten)"
                  value={kodeKelas}
                  onChange={(e) => setKodeKelas(e.target.value)}
                />
              )}
            </>
          )}
          <input
            type="email"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>
      </div>
    </div>
  );
}
