"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type ReviewItem = {
  jawaban_id: string;
  pertanyaan: string;
  jawaban_praktikan: string;
  jawaban_benar: string;
  skor_kemiripan: number | null;
  nama: string;
  npm: string;
  jenis: string;
  jadwal_label: string;
};

export default function ReviewJawabanPage() {
  const supabase = createClient();
  const [namaAslab, setNamaAslab] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [prosesId, setProsesId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase.from("profiles").select("nama").eq("id", userData.user.id).single();
        setNamaAslab(profile?.nama || "");
      }
      const { data: kelas } = await supabase.from("kelas_praktikum").select("id, nama_mata_kuliah, nama_kelas");
      setKelasList(kelas || []);
      if (kelas && kelas.length > 0) setKelasId(kelas[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kelasId) return;
    muatReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  async function muatReview() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("daftar_perlu_review", { p_kelas_id: kelasId });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setItems(data || []);
  }

  async function koreksi(jawabanId: string, benar: boolean) {
    setProsesId(jawabanId);
    setError(null);
    const { error } = await supabase.rpc("koreksi_jawaban_tes", { p_jawaban_id: jawabanId, p_benar: benar });
    setProsesId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.filter((it) => it.jawaban_id !== jawabanId));
  }

  return (
    <div>
      <Navbar role="asisten" nama={namaAslab} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-1">Review Jawaban</h1>
        <p className="text-xs text-white/50 mb-4">
          Jawaban isian singkat yang mirip kunci jawaban tapi belum diputuskan sistem secara otomatis.
        </p>

        <select className="field mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
          ))}
        </select>

        {error && <p className="text-xs text-rose-300/90 mb-4">{error}</p>}

        {loading ? (
          <p className="text-sm text-white/35">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/35">Tidak ada jawaban yang perlu direview di kelas ini. 🎉</p>
        ) : (
          <div className="surface divide-y divide-white/[0.06]">
            {items.map((it) => (
              <div key={it.jawaban_id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/50">
                    {it.nama} ({it.npm}) · {it.jadwal_label} · {it.jenis === "pretest" ? "Pretest" : "Posttest"}
                  </p>
                  {it.skor_kemiripan != null && (
                    <span className="badge-neutral">{Math.round(it.skor_kemiripan * 100)}% mirip</span>
                  )}
                </div>
                <p className="text-sm text-white mb-2">{it.pertanyaan}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mb-3">
                  <p><span className="text-white/40">Jawaban praktikan: </span><span className="text-white">{it.jawaban_praktikan || "(kosong)"}</span></p>
                  <p><span className="text-white/40">Kunci jawaban: </span><span className="text-white/70">{it.jawaban_benar}</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => koreksi(it.jawaban_id, true)}
                    disabled={prosesId === it.jawaban_id}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Tandai Benar
                  </button>
                  <button
                    onClick={() => koreksi(it.jawaban_id, false)}
                    disabled={prosesId === it.jawaban_id}
                    className="btn-danger-ghost text-xs px-3 py-1.5"
                  >
                    Tandai Salah
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}