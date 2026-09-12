"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = {
  id: string;
  nama_mata_kuliah: string;
  nama_kelas: string;
  kode_kelas: string;
};

function buatKodeKelas() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let kode = "";
  for (let i = 0; i < 6; i++) kode += chars[Math.floor(Math.random() * chars.length)];
  return kode;
}

export default function KelasPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mataKuliah, setMataKuliah] = useState("");
  const [namaKelas, setNamaKelas] = useState("");
  const [loading, setLoading] = useState(true);
  const [jumlahAnggota, setJumlahAnggota] = useState<Record<string, number>>({});

  async function muatData() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", userData.user.id)
        .single();
      setNama(profile?.nama || "");
    }

    const { data: kelas, error: kelasError } = await supabase
      .from("kelas_praktikum")
      .select("id, nama_mata_kuliah, nama_kelas, kode_kelas")
      .order("created_at", { ascending: false });
    if (kelasError) console.error("Gagal muat kelas_praktikum:", kelasError);
    setKelasList(kelas || []);

    if (kelas && kelas.length > 0) {
      const { data: anggota, error: anggotaError } = await supabase
        .from("anggota_kelas")
        .select("kelas_id")
        .in("kelas_id", kelas.map((k) => k.id));
      if (anggotaError) console.error("Gagal muat anggota_kelas:", anggotaError);
      const counts: Record<string, number> = {};
      (anggota || []).forEach((a) => {
        counts[a.kelas_id] = (counts[a.kelas_id] || 0) + 1;
      });
      setJumlahAnggota(counts);
    }
    setLoading(false);
  }

  useEffect(() => {
    muatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tambahKelas(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("kelas_praktikum").insert({
      nama_mata_kuliah: mataKuliah,
      nama_kelas: namaKelas,
      kode_kelas: buatKodeKelas(),
      asisten_id: userData.user.id,
    });

    setMataKuliah("");
    setNamaKelas("");
    muatData();
  }

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Kelas Praktikum</h1>
        <p className="text-sm text-slate-500 mb-6">
          Buat kelas, lalu bagikan kode kelas ke praktikan supaya mereka bisa join.
        </p>

        <form onSubmit={tambahKelas} className="bg-white border border-slate-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Nama mata kuliah (misal: Basis Data)"
            value={mataKuliah}
            onChange={(e) => setMataKuliah(e.target.value)}
            required
          />
          <input
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Nama kelas/shift (misal: Shift A)"
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            required
          />
          <button className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
            + Tambah Kelas
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-slate-400">Memuat...</p>
        ) : kelasList.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada kelas. Buat kelas pertamamu di atas.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {kelasList.map((k) => (
              <div key={k.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-medium text-slate-900">{k.nama_mata_kuliah}</p>
                <p className="text-sm text-slate-500">{k.nama_kelas}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{jumlahAnggota[k.id] || 0} praktikan</span>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                    Kode: {k.kode_kelas}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}