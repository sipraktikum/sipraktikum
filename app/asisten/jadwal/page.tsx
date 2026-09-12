"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Jadwal = {
  id: string;
  pertemuan_ke: number;
  topik: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
};

export default function JadwalPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);

  const [pertemuanKe, setPertemuanKe] = useState(1);
  const [topik, setTopik] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase.from("profiles").select("nama").eq("id", userData.user.id).single();
        setNama(profile?.nama || "");
      }
      const { data: kelas } = await supabase.from("kelas_praktikum").select("id, nama_mata_kuliah, nama_kelas");
      setKelasList(kelas || []);
      if (kelas && kelas.length > 0) setKelasId(kelas[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kelasId) return;
    muatJadwal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  async function muatJadwal() {
    const { data, error } = await supabase
      .from("jadwal_praktikum")
      .select("id, pertemuan_ke, topik, tanggal, jam_mulai, jam_selesai")
      .eq("kelas_id", kelasId)
      .order("pertemuan_ke");
    if (error) console.error("Gagal muat jadwal_praktikum:", error);
    setJadwalList(data || []);
  }

  async function tambahJadwal(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("jadwal_praktikum").insert({
      kelas_id: kelasId,
      pertemuan_ke: pertemuanKe,
      topik,
      tanggal,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
    });
    if (error) {
      console.error("Gagal tambah jadwal:", error);
      alert("Gagal menambah jadwal: " + error.message);
      return;
    }
    setTopik("");
    setTanggal("");
    setJamMulai("");
    setJamSelesai("");
    setPertemuanKe((n) => n + 1);
    muatJadwal();
  }

  async function hapusJadwal(id: string) {
    await supabase.from("jadwal_praktikum").delete().eq("id", id);
    muatJadwal();
  }

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-4">Jadwal Praktikum</h1>

        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-6"
          value={kelasId}
          onChange={(e) => setKelasId(e.target.value)}
        >
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama_mata_kuliah} - {k.nama_kelas}
            </option>
          ))}
        </select>

        {kelasId && (
          <>
            <form onSubmit={tambahJadwal} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid sm:grid-cols-5 gap-2">
              <input type="number" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Pertemuan ke" value={pertemuanKe} onChange={(e) => setPertemuanKe(Number(e.target.value))} required />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2" placeholder="Topik" value={topik} onChange={(e) => setTopik(e.target.value)} required />
              <input type="date" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
              <div className="flex gap-1">
                <input type="time" className="border border-slate-200 rounded-lg px-2 py-2 text-sm w-full" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} required />
                <input type="time" className="border border-slate-200 rounded-lg px-2 py-2 text-sm w-full" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} required />
              </div>
              <button className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium sm:col-span-5">
                + Tambah Pertemuan
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {jadwalList.length === 0 && <p className="text-sm text-slate-400 p-4">Belum ada jadwal.</p>}
              {jadwalList.map((j) => (
                <div key={j.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Pertemuan {j.pertemuan_ke}: {j.topik}</p>
                    <p className="text-xs text-slate-500">{j.tanggal} · {j.jam_mulai.slice(0,5)}–{j.jam_selesai.slice(0,5)}</p>
                  </div>
                  <button onClick={() => hapusJadwal(j.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}