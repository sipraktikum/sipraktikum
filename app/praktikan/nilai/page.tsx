"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Baris = { judul: string; bobot_nilai: number; nilai: number | null };
type BarisTes = { jadwalLabel: string; pretest: number | null; posttest: number | null };

export default function PraktikanNilaiPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [barisTes, setBarisTes] = useState<BarisTes[]>([]);
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

      // --- Pretest & Posttest ---
      const { data: jadwal } = await supabase
        .from("jadwal_praktikum")
        .select("id, pertemuan_ke, topik")
        .eq("kelas_id", kelasId)
        .order("pertemuan_ke");

      const jadwalIds = (jadwal || []).map((j) => j.id);
      let tesRows: BarisTes[] = [];
      if (jadwalIds.length > 0) {
        const { data: tes } = await supabase
          .from("tes_praktikum")
          .select("id, jadwal_id, jenis")
          .in("jadwal_id", jadwalIds);

        const tesIds = (tes || []).map((t) => t.id);
        let submissions: any[] = [];
        if (tesIds.length > 0) {
          const { data: sub } = await supabase
            .from("tes_submission")
            .select("tes_id, skor")
            .in("tes_id", tesIds)
            .eq("praktikan_id", userData.user.id);
          submissions = sub || [];
        }
        const skorMap = new Map(submissions.map((s) => [s.tes_id, s.skor]));

        tesRows = (jadwal || [])
          .map((j) => {
            const pre = (tes || []).find((t) => t.jadwal_id === j.id && t.jenis === "pretest");
            const post = (tes || []).find((t) => t.jadwal_id === j.id && t.jenis === "posttest");
            return {
              jadwalLabel: `Pertemuan ${j.pertemuan_ke}: ${j.topik}`,
              pretest: pre ? skorMap.get(pre.id) ?? null : null,
              posttest: post ? skorMap.get(post.id) ?? null : null,
              adaPretest: !!pre,
              adaPosttest: !!post,
            };
          })
          .filter((r: any) => r.adaPretest || r.adaPosttest);
      }
      setBarisTes(tesRows);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Nilai</h1>

        {kelasList.length === 0 ? (
          <p className="text-sm text-white/35">Kamu belum tergabung di kelas praktikum manapun.</p>
        ) : (
          <>
            <select className="field mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
              ))}
            </select>

            <div className="surface divide-y divide-white/[0.06] mb-4">
              {baris.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada tugas di kelas ini.</p>}
              {baris.map((r, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">{r.judul}</p>
                    <p className="text-xs text-white/50">Bobot {r.bobot_nilai}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {r.nilai != null ? r.nilai : "Belum dinilai"}
                  </span>
                </div>
              ))}
            </div>

            {barisTes.length > 0 && (
              <>
                <h2 className="text-sm font-medium text-white/70 mb-2 mt-8">Pretest & Posttest</h2>
                <div className="surface divide-y divide-white/[0.06] mb-4">
                  {barisTes.map((r, i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-3">
                      <p className="font-medium text-white text-sm">{r.jadwalLabel}</p>
                      <div className="flex gap-2 shrink-0">
                        <span className={r.pretest != null ? "badge-good" : "badge-neutral"}>
                          Pretest {r.pretest != null ? r.pretest : "-"}
                        </span>
                        <span className={r.posttest != null ? "badge-good" : "badge-neutral"}>
                          Posttest {r.posttest != null ? r.posttest : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {rataRata != null && (
              <div className="rounded-2xl p-4 flex items-center justify-between bg-gradient-to-r from-accent1 to-accent2 text-ink">
                <span className="text-sm font-medium">Rata-rata nilai (tertimbang bobot)</span>
                <span className="text-lg font-semibold">{rataRata}</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}