"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Jadwal = { id: string; pertemuan_ke: number; topik: string };
type TesInfo = { id: string; judul: string; dibuka: boolean; skor: number | null } | null;
type Soal = {
  soal_id: string;
  urutan: number;
  tipe: "pilihan_ganda" | "isian_singkat";
  pertanyaan: string;
  pilihan_a: string | null;
  pilihan_b: string | null;
  pilihan_c: string | null;
  pilihan_d: string | null;
  poin: number;
  waktu_detik: number;
};
type DetailSoal = {
  soal_id: string;
  pertanyaan: string;
  jawaban_kamu: string;
  jawaban_benar: string;
  benar: boolean;
  poin_didapat: number;
  poin_maks: number;
};

const WAKTU_CADANGAN = 60;

function formatWaktu(detik: number) {
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PraktikanTesPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [testsMap, setTestsMap] = useState<Record<string, { pretest: TesInfo; posttest: TesInfo }>>({});
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "taking" | "review">("list");
  const [activeTesId, setActiveTesId] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // --- Pewaktu per soal ---
  const [idx, setIdx] = useState(0); // nomor soal yang sedang tampil (mulai dari 0)
  const [sisa, setSisa] = useState(0); // sisa detik untuk soal yang sedang tampil
  const deadlineRef = useRef(0); // waktu (ms) kapan soal ini habis
  const sedangKirimRef = useRef(false); // penjaga supaya jawaban tidak terkirim dua kali
  const lanjutRef = useRef<() => void>(() => {});

  const [hasilSkor, setHasilSkor] = useState<number | null>(null);
  const [hasilDetail, setHasilDetail] = useState<DetailSoal[]>([]);

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
    muatSemua();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  // Fungsi "lanjut" selalu diperbarui supaya pewaktu memakai jawaban terbaru
  useEffect(() => {
    lanjutRef.current = lanjut;
  });

  // Pewaktu: cek tiap 250 ms berdasarkan jam sebenarnya (tidak melambat kalau tab di background)
  useEffect(() => {
    if (mode !== "taking") return;
    let sudahHabis = false;
    const timer = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSisa(s);
      if (s <= 0 && !sudahHabis) {
        sudahHabis = true;
        clearInterval(timer);
        lanjutRef.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [mode, idx]);

  async function muatSemua() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: jadwal } = await supabase
      .from("jadwal_praktikum")
      .select("id, pertemuan_ke, topik")
      .eq("kelas_id", kelasId)
      .order("pertemuan_ke");
    setJadwalList(jadwal || []);

    const jadwalIds = (jadwal || []).map((j) => j.id);
    if (jadwalIds.length === 0) { setTestsMap({}); return; }

    const { data: tes } = await supabase
      .from("tes_praktikum")
      .select("id, jadwal_id, jenis, judul, dibuka")
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

    const map: Record<string, { pretest: TesInfo; posttest: TesInfo }> = {};
    for (const j of jadwal || []) {
      const pre = (tes || []).find((t) => t.jadwal_id === j.id && t.jenis === "pretest");
      const post = (tes || []).find((t) => t.jadwal_id === j.id && t.jenis === "posttest");
      map[j.id] = {
        pretest: pre ? { id: pre.id, judul: pre.judul, dibuka: pre.dibuka, skor: skorMap.get(pre.id) ?? null } : null,
        posttest: post ? { id: post.id, judul: post.judul, dibuka: post.dibuka, skor: skorMap.get(post.id) ?? null } : null,
      };
    }
    setTestsMap(map);
  }

  // Menampilkan soal ke-i dan menyalakan waktunya
  function mulaiSoal(i: number, list: Soal[]) {
    const detik = Math.max(1, Number(list[i]?.waktu_detik) || WAKTU_CADANGAN);
    deadlineRef.current = Date.now() + detik * 1000;
    setIdx(i);
    setSisa(detik);
  }

  async function mulaiTes(tes: TesInfo, label: string) {
    if (!tes) return;
    const yakin = window.confirm(
      "Tes akan dimulai dan waktu langsung berjalan.\n\n" +
        "Setiap soal punya batas waktu sendiri. Kalau waktu habis, kamu otomatis pindah ke soal berikutnya, " +
        "dan soal yang sudah lewat tidak bisa dibuka lagi.\n\nMulai sekarang?"
    );
    if (!yakin) return;

    setError(null);
    const { data, error } = await supabase.rpc("ambil_soal_tes", { p_tes_id: tes.id });
    if (error) {
      setError(error.message);
      return;
    }
    const soal: Soal[] = data || [];
    if (soal.length === 0) {
      setError("Tes ini belum punya soal.");
      return;
    }
    sedangKirimRef.current = false;
    setSoalList(soal);
    setJawaban({});
    setActiveTesId(tes.id);
    setActiveLabel(label);
    mulaiSoal(0, soal);
    setMode("taking");
  }

  // Dipanggil tombol "Lanjut" atau otomatis saat waktu soal habis
  function lanjut() {
    if (idx < soalList.length - 1) {
      mulaiSoal(idx + 1, soalList);
    } else {
      submitTes();
    }
  }

  async function submitTes() {
    if (sedangKirimRef.current) return;
    sedangKirimRef.current = true;
    setSubmitting(true);
    setError(null);
    const payload = soalList.map((s) => ({ soal_id: s.soal_id, jawaban: jawaban[s.soal_id] || "" }));
    const { data, error } = await supabase.rpc("submit_tes", { p_tes_id: activeTesId, p_jawaban: payload });
    setSubmitting(false);
    if (error) {
      sedangKirimRef.current = false;
      setError(error.message);
      return;
    }
    setHasilSkor(data.skor);
    setHasilDetail(data.detail || []);
    setMode("review");
    muatSemua();
  }

  async function lihatHasil(tes: TesInfo, label: string) {
    if (!tes) return;
    setError(null);
    const { data, error } = await supabase.rpc("lihat_hasil_tes", { p_tes_id: tes.id });
    if (error) {
      setError(error.message);
      return;
    }
    setActiveTesId(tes.id);
    setActiveLabel(label);
    setHasilSkor(data.skor);
    setHasilDetail(data.detail || []);
    setMode("review");
  }

  function kembali() {
    setMode("list");
    setError(null);
  }

  function Chip({ tes, jenis, jadwalLabel }: { tes: TesInfo; jenis: "pretest" | "posttest"; jadwalLabel: string }) {
    const label = jenis === "pretest" ? "Pretest" : "Posttest";
    if (!tes) return <span className="badge-neutral">{label}: belum ada</span>;
    if (tes.skor !== null) {
      return (
        <button onClick={() => lihatHasil(tes, `${jadwalLabel} · ${label}`)} className="badge-good hover:brightness-110 transition">
          {label}: skor {tes.skor}
        </button>
      );
    }
    if (!tes.dibuka) return <span className="badge-neutral">{label}: belum dibuka</span>;
    return (
      <button onClick={() => mulaiTes(tes, `${jadwalLabel} · ${label}`)} className="badge-warn hover:brightness-110 transition">
        {label}: kerjakan sekarang
      </button>
    );
  }

  const soalAktif = mode === "taking" ? soalList[idx] : undefined;
  const totalWaktu = soalAktif ? Math.max(1, Number(soalAktif.waktu_detik) || WAKTU_CADANGAN) : 1;
  const waktuHabis = sisa <= 0;
  const soalTerakhir = idx === soalList.length - 1;

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Pretest & Posttest</h1>

        {mode === "list" && (
          <>
            {kelasList.length === 0 ? (
              <p className="text-sm text-white/35">Kamu belum tergabung di kelas praktikum manapun.</p>
            ) : (
              <>
                <select className="field mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
                  ))}
                </select>

                {error && <p className="text-xs text-rose-300/90 mb-4">{error}</p>}

                <div className="surface divide-y divide-white/[0.06]">
                  {jadwalList.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada jadwal.</p>}
                  {jadwalList.map((j) => {
                    const label = `Pertemuan ${j.pertemuan_ke}`;
                    const t = testsMap[j.id];
                    return (
                      <div key={j.id} className="p-4">
                        <p className="font-medium text-white text-sm mb-2">{label}: {j.topik}</p>
                        <div className="flex flex-wrap gap-2">
                          <Chip tes={t?.pretest ?? null} jenis="pretest" jadwalLabel={label} />
                          <Chip tes={t?.posttest ?? null} jenis="posttest" jadwalLabel={label} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {mode === "taking" && soalAktif && (
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-medium text-white text-sm">{activeLabel}</h2>
                <p className="text-xs text-white/50 mt-0.5">Soal {idx + 1} dari {soalList.length}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-medium tabular-nums ${sisa <= 10 ? "text-rose-300" : "text-white"}`}>
                  {formatWaktu(sisa)}
                </p>
                <p className="text-xs text-white/35">sisa waktu</p>
              </div>
            </div>

            <div className="h-1 w-full rounded-full bg-white/10 mb-6 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent1 to-accent2 transition-[width] duration-300 ease-linear"
                style={{ width: `${Math.min(100, (sisa / totalWaktu) * 100)}%` }}
              />
            </div>

            {error && <p className="text-xs text-rose-300/90 mb-4">{error}</p>}

            <div key={soalAktif.soal_id}>
              <p className="text-sm text-white mb-2">
                {idx + 1}. {soalAktif.pertanyaan} <span className="text-white/35 text-xs">({soalAktif.poin} poin)</span>
              </p>
              {soalAktif.tipe === "pilihan_ganda" ? (
                <div className="space-y-1.5">
                  {[["a", soalAktif.pilihan_a], ["b", soalAktif.pilihan_b], ["c", soalAktif.pilihan_c], ["d", soalAktif.pilihan_d]]
                    .filter(([, v]) => v)
                    .map(([key, val]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-white/70">
                        <input
                          type="radio"
                          name={soalAktif.soal_id}
                          value={key as string}
                          disabled={waktuHabis}
                          checked={jawaban[soalAktif.soal_id] === key}
                          onChange={() => setJawaban((prev) => ({ ...prev, [soalAktif.soal_id]: key as string }))}
                        />
                        {(key as string).toUpperCase()}. {val}
                      </label>
                    ))}
                </div>
              ) : (
                <input
                  className="field"
                  placeholder="Ketik jawabanmu"
                  autoFocus
                  disabled={waktuHabis}
                  value={jawaban[soalAktif.soal_id] || ""}
                  onChange={(e) => setJawaban((prev) => ({ ...prev, [soalAktif.soal_id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") lanjut();
                  }}
                />
              )}
            </div>

            <button onClick={lanjut} disabled={submitting} className="btn-primary mt-6">
              {submitting ? "Mengirim..." : soalTerakhir ? "Kumpulkan Jawaban" : "Lanjut"}
            </button>
            <p className="text-xs text-white/35 mt-3">Soal yang sudah lewat tidak bisa dibuka lagi.</p>
          </div>
        )}

        {mode === "review" && (
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-medium text-white text-sm">{activeLabel}</h2>
                <p className="text-xs text-white/50">Skor: {hasilSkor}</p>
              </div>
              <button onClick={kembali} className="pill-link">Kembali</button>
            </div>

            <div className="space-y-3">
              {hasilDetail.map((d, i) => (
                <div key={d.soal_id} className="border-t border-white/[0.06] pt-3">
                  <p className="text-sm text-white">{i + 1}. {d.pertanyaan}</p>
                  <p className="text-xs mt-1">
                    <span className={d.benar ? "text-emerald-300" : "text-rose-300"}>Jawabanmu: {d.jawaban_kamu || "(kosong)"}</span>
                    {!d.benar && <span className="text-white/50"> · Jawaban benar: {d.jawaban_benar}</span>}
                    <span className="text-white/35"> · {d.poin_didapat}/{d.poin_maks} poin</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}