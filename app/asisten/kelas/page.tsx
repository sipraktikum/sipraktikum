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

    const { data: kelas } = await supabase
      .from("kelas_praktikum")
      .select("id, nama_mata_kuliah, nama_kelas, kode_kelas")
      .order("created_at", { ascending: false });
    setKelasList(kelas || []);

    if (kelas && kelas.length > 0) {
      const { data: anggota } = await supabase
        .from("anggota_kelas")
        .select("kelas_id")
        .in("kelas_id", kelas.map((k) => k.id));
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
        <h1 className="page-title mb-1">Kelas Praktikum</h1>
        <p className="page-subtitle mb-6">
          Buat kelas, lalu bagikan kode kelas ke praktikan supaya mereka bisa join.
        </p>

        <form onSubmit={tambahKelas} className="surface p-4 mb-8 flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 field"
            placeholder="Nama mata kuliah (misal: Basis Data)"
            value={mataKuliah}
            onChange={(e) => setMataKuliah(e.target.value)}
            required
          />
          <input
            className="flex-1 field"
            placeholder="Nama kelas/shift (misal: Shift A)"
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            required
          />
          <button className="btn-primary whitespace-nowrap">
            + Tambah Kelas
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-white/35">Memuat...</p>
        ) : kelasList.length === 0 ? (
          <p className="text-sm text-white/35">Belum ada kelas. Buat kelas pertamamu di atas.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {kelasList.map((k) => (
              <div key={k.id} className="surface p-4">
                <p className="font-medium text-white">{k.nama_mata_kuliah}</p>
                <p className="page-subtitle">{k.nama_kelas}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-white/35">{jumlahAnggota[k.id] || 0} praktikan</span>
                  <span className="badge-mono">
                    {k.kode_kelas}
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
