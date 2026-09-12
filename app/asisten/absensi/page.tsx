"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Jadwal = { id: string; pertemuan_ke: number; topik: string };
type Baris = { praktikan_id: string; nama: string; npm: string; status: string; absensi_id: string | null };

const STATUS_OPSI = ["belum", "hadir", "izin", "sakit", "alpa"];

export default function AbsensiPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [jadwalId, setJadwalId] = useState("");
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
      const { data } = await supabase.from("jadwal_praktikum").select("id, pertemuan_ke, topik").eq("kelas_id", kelasId).order("pertemuan_ke");
      setJadwalList(data || []);
      if (data && data.length > 0) setJadwalId(data[0].id);
      else setJadwalId("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  useEffect(() => {
    if (!jadwalId) { setBaris([]); return; }
    muatBaris();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jadwalId]);

  async function muatBaris() {
    const { data: anggota } = await supabase
      .from("anggota_kelas")
      .select("praktikan_id, profiles(nama, npm)")
      .eq("kelas_id", kelasId);

    const { data: absensi } = await supabase
      .from("absensi")
      .select("id, praktikan_id, status")
      .eq("jadwal_id", jadwalId);

    const absensiMap = new Map((absensi || []).map((a) => [a.praktikan_id, a]));

    const rows: Baris[] = (anggota || []).map((a: any) => {
      const abs = absensiMap.get(a.praktikan_id);
      return {
        praktikan_id: a.praktikan_id,
        nama: a.profiles?.nama || "-",
        npm: a.profiles?.npm || "-",
        status: abs?.status || "belum",
        absensi_id: abs?.id || null,
      };
    });
    setBaris(rows);
  }

  async function ubahStatus(row: Baris, status: string) {
    if (row.absensi_id) {
      await supabase.from("absensi").update({ status, waktu_absen: new Date().toISOString() }).eq("id", row.absensi_id);
    } else {
      await supabase.from("absensi").insert({
        jadwal_id: jadwalId,
        praktikan_id: row.praktikan_id,
        status,
        waktu_absen: new Date().toISOString(),
      });
    }
    muatBaris();
  }

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Absensi</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <select className="field" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
            ))}
          </select>
          <select className="field" value={jadwalId} onChange={(e) => setJadwalId(e.target.value)}>
            {jadwalList.length === 0 && <option value="">Belum ada jadwal</option>}
            {jadwalList.map((j) => (
              <option key={j.id} value={j.id}>Pertemuan {j.pertemuan_ke}: {j.topik}</option>
            ))}
          </select>
        </div>

        <div className="surface divide-y divide-white/[0.06]">
          {baris.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada praktikan di kelas ini.</p>}
          {baris.map((row) => (
            <div key={row.praktikan_id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white text-sm">{row.nama}</p>
                <p className="text-xs text-white/50">{row.npm}</p>
              </div>
              <select
                className="field text-xs py-1.5"
                value={row.status}
                onChange={(e) => ubahStatus(row, e.target.value)}
              >
                {STATUS_OPSI.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
