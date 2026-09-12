"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Tugas = { id: string; judul: string; bobot_nilai: number };
type Baris = {
  praktikan_id: string;
  nama: string;
  npm: string;
  pengumpulan_id: string | null;
  status: string;
  file_url: string | null;
  nilai: number | null;
};

export default function NilaiPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [tugasList, setTugasList] = useState<Tugas[]>([]);
  const [tugasId, setTugasId] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);

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
    (async () => {
      const { data } = await supabase.from("tugas_praktikum").select("id, judul, bobot_nilai").eq("kelas_id", kelasId);
      setTugasList(data || []);
      if (data && data.length > 0) setTugasId(data[0].id);
      else setTugasId("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  useEffect(() => {
    if (!tugasId) { setBaris([]); return; }
    muatBaris();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tugasId]);

  async function muatBaris() {
    const { data: anggota } = await supabase
      .from("anggota_kelas")
      .select("praktikan_id, profiles(nama, npm)")
      .eq("kelas_id", kelasId);

    const { data: pengumpulan } = await supabase
      .from("pengumpulan_tugas")
      .select("id, praktikan_id, status, file_url, nilai")
      .eq("tugas_id", tugasId);

    const map = new Map((pengumpulan || []).map((p) => [p.praktikan_id, p]));

    const rows: Baris[] = (anggota || []).map((a: any) => {
      const p = map.get(a.praktikan_id);
      return {
        praktikan_id: a.praktikan_id,
        nama: a.profiles?.nama || "-",
        npm: a.profiles?.npm || "-",
        pengumpulan_id: p?.id || null,
        status: p?.status || "belum",
        file_url: p?.file_url || null,
        nilai: p?.nilai ?? null,
      };
    });
    setBaris(rows);
  }

  async function simpanNilai(row: Baris, nilai: number) {
    if (row.pengumpulan_id) {
      await supabase.from("pengumpulan_tugas").update({ nilai, dinilai_at: new Date().toISOString() }).eq("id", row.pengumpulan_id);
    } else {
      await supabase.from("pengumpulan_tugas").insert({
        tugas_id: tugasId,
        praktikan_id: row.praktikan_id,
        nilai,
        status: "belum",
        dinilai_at: new Date().toISOString(),
      });
    }
    muatBaris();
  }

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Nilai</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <select className="field" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
            ))}
          </select>
          <select className="field" value={tugasId} onChange={(e) => setTugasId(e.target.value)}>
            {tugasList.length === 0 && <option value="">Belum ada tugas</option>}
            {tugasList.map((t) => (
              <option key={t.id} value={t.id}>{t.judul}</option>
            ))}
          </select>
        </div>

        <div className="surface divide-y divide-white/[0.06]">
          {baris.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada praktikan di kelas ini.</p>}
          {baris.map((row) => (
            <div key={row.praktikan_id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white text-sm">{row.nama}</p>
                <p className="text-xs text-white/50">
                  {row.npm} · status: {row.status}
                  {row.file_url && (
                    <> · <a href={row.file_url} target="_blank" className="link-accent">lihat file</a></>
                  )}
                </p>
              </div>
              <input
                type="number"
                min={0}
                max={100}
                defaultValue={row.nilai ?? undefined}
                placeholder="Nilai"
                className="w-20 field text-xs py-1.5"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && e.target.value !== "") simpanNilai(row, v);
                }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-white/35 mt-3">Ketik nilai lalu klik di luar kolom untuk menyimpan.</p>
      </main>
    </div>
  );
}
