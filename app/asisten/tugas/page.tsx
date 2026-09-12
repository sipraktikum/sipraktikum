"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Tugas = { id: string; judul: string; deskripsi: string; deadline: string; bobot_nilai: number };

export default function TugasPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [tugasList, setTugasList] = useState<Tugas[]>([]);

  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bobot, setBobot] = useState(100);

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
    muatTugas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  async function muatTugas() {
    const { data } = await supabase
      .from("tugas_praktikum")
      .select("id, judul, deskripsi, deadline, bobot_nilai")
      .eq("kelas_id", kelasId)
      .order("deadline");
    setTugasList(data || []);
  }

  async function tambahTugas(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("tugas_praktikum").insert({
      kelas_id: kelasId,
      judul,
      deskripsi,
      deadline,
      bobot_nilai: bobot,
    });
    setJudul("");
    setDeskripsi("");
    setDeadline("");
    setBobot(100);
    muatTugas();
  }

  async function hapusTugas(id: string) {
    await supabase.from("tugas_praktikum").delete().eq("id", id);
    muatTugas();
  }

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Tugas Praktikum</h1>

        <select className="field mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
          ))}
        </select>

        <form onSubmit={tambahTugas} className="surface p-4 mb-6 space-y-2">
          <input className="w-full field" placeholder="Judul tugas" value={judul} onChange={(e) => setJudul(e.target.value)} required />
          <textarea className="w-full field" placeholder="Deskripsi/instruksi tugas" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <input type="datetime-local" className="flex-1 field" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            <input type="number" className="w-28 field" placeholder="Bobot" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
          </div>
          <button className="btn-primary">+ Tambah Tugas</button>
        </form>

        <div className="surface divide-y divide-white/[0.06]">
          {tugasList.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada tugas.</p>}
          {tugasList.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">{t.judul}</p>
                <p className="text-xs text-white/50">Deadline: {new Date(t.deadline).toLocaleString("id-ID")} · Bobot {t.bobot_nilai}</p>
              </div>
              <button onClick={() => hapusTugas(t.id)} className="btn-danger-ghost">Hapus</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
