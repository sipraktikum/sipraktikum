"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Jadwal = { id: string; pertemuan_ke: number; topik: string; tanggal: string; jam_mulai: string; jam_selesai: string };

export default function PraktikanJadwalPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [kodeJoin, setKodeJoin] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);

  async function muatKelas() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase.from("profiles").select("nama").eq("id", userData.user.id).single();
    setNama(profile?.nama || "");

    const { data: anggota, error: anggotaError } = await supabase
      .from("anggota_kelas")
      .select("kelas_praktikum(id, nama_mata_kuliah, nama_kelas)")
      .eq("praktikan_id", userData.user.id);
    if (anggotaError) console.error("Gagal muat anggota_kelas (praktikan):", anggotaError);

    const kelas = (anggota || []).map((a: any) => a.kelas_praktikum).filter(Boolean);
    setKelasList(kelas);
    if (kelas.length > 0) setKelasId(kelas[0].id);
  }

  useEffect(() => {
    muatKelas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kelasId) return;
    (async () => {
      const { data, error } = await supabase.from("jadwal_praktikum").select("id, pertemuan_ke, topik, tanggal, jam_mulai, jam_selesai").eq("kelas_id", kelasId).order("pertemuan_ke");
      if (error) console.error("Gagal muat jadwal (praktikan):", error);
      setJadwalList(data || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  async function joinKelas(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: kelas } = await supabase.from("kelas_praktikum").select("id").eq("kode_kelas", kodeJoin.trim().toUpperCase()).maybeSingle();
    if (!kelas) {
      setPesan("Kode kelas tidak ditemukan.");
      return;
    }
    const { error } = await supabase.from("anggota_kelas").insert({ kelas_id: kelas.id, praktikan_id: userData.user.id });
    if (error) {
      console.error("Gagal join kelas:", error);
      setPesan(
        error.code === "23505"
          ? "Kamu sudah tergabung di kelas ini."
          : `Gagal join kelas: ${error.message}`
      );
    } else {
      setPesan("Berhasil join kelas!");
      setKodeJoin("");
      muatKelas();
    }
  }

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-4">Jadwal Praktikum</h1>

        <form onSubmit={joinKelas} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-2 items-start">
          <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Masukkan kode kelas dari asisten" value={kodeJoin} onChange={(e) => setKodeJoin(e.target.value)} />
          <button className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">Join Kelas</button>
        </form>
        {pesan && <p className="text-xs text-slate-500 mb-4 -mt-4">{pesan}</p>}

        {kelasList.length === 0 ? (
          <p className="text-sm text-slate-400">Kamu belum tergabung di kelas praktikum manapun.</p>
        ) : (
          <>
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
              ))}
            </select>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {jadwalList.length === 0 && <p className="text-sm text-slate-400 p-4">Belum ada jadwal.</p>}
              {jadwalList.map((j) => (
                <div key={j.id} className="p-4">
                  <p className="font-medium text-slate-900 text-sm">Pertemuan {j.pertemuan_ke}: {j.topik}</p>
                  <p className="text-xs text-slate-500">{j.tanggal} · {j.jam_mulai.slice(0,5)}–{j.jam_selesai.slice(0,5)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}