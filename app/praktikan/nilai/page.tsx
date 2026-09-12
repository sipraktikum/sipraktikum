"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Baris = { judul: string; bobot_nilai: number; nilai: number | null };

export default function PraktikanNilaiPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [rataRata, setRataRata] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase.from("profiles").select("nama").eq("id", userData.user.id).single();
      setNama(profile?.nama || "");

      const { data: anggota } = await supabase
        .from("anggota_kelas")
        .select("kelas_praktikum(id, nama_mata_kuliah, nama_kelas)")
        .eq("praktikan_id", userData.user.id);
      const kelas = (anggota || []).map((a: any) => a.kelas_praktikum).filter(Boolean);
      setKelasList(kelas);
      if (kelas.length > 0) setKelasId(kelas[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kelasId) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: tugas } = await supabase
        .from("tugas_praktikum")
        .select("id, judul, bobot_nilai")
        .eq("kelas_id", kelasId);

      const { data: pengumpulan } = await supabase
        .from("pengumpulan_tugas")
        .select("tugas_id, nilai")
        .eq("praktikan_id", userData.user.id);

      const nilaiMap = new Map((pengumpulan || []).map((p) => [p.tugas_id, p.nilai]));

      const rows: Baris[] = (tugas || []).map((t) => ({
        judul: t.judul,
        bobot_nilai: t.bobot_nilai,
        nilai: nilaiMap.get(t.id) ?? null,
      }));
      setBaris(rows);

      const dinilai = rows.filter((r) => r.nilai != null);
      if (dinilai.length > 0) {
        const totalBobot = dinilai.reduce((s, r) => s + r.bobot_nilai, 0);
        const totalNilai = dinilai.reduce((s, r) => s + (r.nilai! * r.bobot_nilai), 0);
        setRataRata(totalBobot > 0 ? Math.round((totalNilai / totalBobot) * 10) / 10 : null);
      } else {
        setRataRata(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-4">Nilai</h1>

        {kelasList.length === 0 ? (
          <p className="text-sm text-slate-400">Kamu belum tergabung di kelas praktikum manapun.</p>
        ) : (
          <>
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
              ))}
            </select>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 mb-4">
              {baris.length === 0 && <p className="text-sm text-slate-400 p-4">Belum ada tugas di kelas ini.</p>}
              {baris.map((r, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{r.judul}</p>
                    <p className="text-xs text-slate-500">Bobot {r.bobot_nilai}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {r.nilai != null ? r.nilai : "Belum dinilai"}
                  </span>
                </div>
              ))}
            </div>

            {rataRata != null && (
              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm">Rata-rata nilai (tertimbang bobot)</span>
                <span className="text-lg font-semibold">{rataRata}</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
