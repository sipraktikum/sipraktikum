"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Tugas = { id: string; judul: string; bobot_nilai: number };
type Jadwal = { id: string; pertemuan_ke: number; topik: string };
type Tes = { id: string; jenis: string; judul: string; dibuka: boolean };

type Baris = {
  praktikan_id: string;
  nama: string;
  npm: string;
  pengumpulan_id: string | null;
  status: string;
  file_url: string | null;
  nilai: number | null;
};

type BarisTes = {
  praktikan_id: string;
  nama: string;
  npm: string;
  pretest: number | null;
  posttest: number | null;
};

export default function NilaiPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [tab, setTab] = useState<"tugas" | "tes">("tugas");

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");

  // --- Tugas ---
  const [tugasList, setTugasList] = useState<Tugas[]>([]);
  const [tugasId, setTugasId] = useState("");
  const [baris, setBaris] = useState<Baris[]>([]);

  // --- Pretest & Posttest ---
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [jadwalId, setJadwalId] = useState("");
  const [tesPre, setTesPre] = useState<Tes | null>(null);
  const [tesPost, setTesPost] = useState<Tes | null>(null);
  const [barisTes, setBarisTes] = useState<BarisTes[]>([]);

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

  // Muat daftar tugas + jadwal saat kelas berubah
  useEffect(() => {
    if (!kelasId) return;
    (async () => {
      const { data: tugas } = await supabase
        .from("tugas_praktikum")
        .select("id, judul, bobot_nilai")
        .eq("kelas_id", kelasId);
      setTugasList(tugas || []);
      setTugasId(tugas && tugas.length > 0 ? tugas[0].id : "");

      const { data: jadwal } = await supabase
        .from("jadwal_praktikum")
        .select("id, pertemuan_ke, topik")
        .eq("kelas_id", kelasId)
        .order("pertemuan_ke");
      setJadwalList(jadwal || []);
      setJadwalId(jadwal && jadwal.length > 0 ? jadwal[0].id : "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  useEffect(() => {
    if (!tugasId) { setBaris([]); return; }
    muatBaris();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tugasId]);

  useEffect(() => {
    if (!jadwalId) { setBarisTes([]); setTesPre(null); setTesPost(null); return; }
    muatBarisTes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jadwalId]);

  async function ambilAnggota() {
    const { data: anggota, error } = await supabase
      .from("anggota_kelas")
      .select("praktikan_id, profiles(nama, npm)")
      .eq("kelas_id", kelasId);
    if (error) alert("Gagal ambil anggota kelas: " + error.message);
    return anggota || [];
  }

  async function muatBaris() {
    const anggota = await ambilAnggota();

    const { data: pengumpulan, error } = await supabase
      .from("pengumpulan_tugas")
      .select("id, praktikan_id, status, file_url, nilai")
      .eq("tugas_id", tugasId);
    if (error) alert("Gagal ambil pengumpulan tugas: " + error.message);

    const map = new Map((pengumpulan || []).map((p) => [p.praktikan_id, p]));

    const rows: Baris[] = anggota.map((a: any) => {
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

  async function muatBarisTes() {
    const anggota = await ambilAnggota();

    const { data: tes, error: tesError } = await supabase
      .from("tes_praktikum")
      .select("id, jenis, judul, dibuka")
      .eq("jadwal_id", jadwalId);
    if (tesError) alert("Gagal ambil data tes: " + tesError.message);

    const pre = (tes || []).find((t) => t.jenis === "pretest") || null;
    const post = (tes || []).find((t) => t.jenis === "posttest") || null;
    setTesPre(pre);
    setTesPost(post);

    const tesIds = (tes || []).map((t) => t.id);
    let submissions: any[] = [];
    if (tesIds.length > 0) {
      const { data: sub, error: subError } = await supabase
        .from("tes_submission")
        .select("tes_id, praktikan_id, skor")
        .in("tes_id", tesIds);
      if (subError) alert("Gagal ambil skor submission: " + subError.message);
      submissions = sub || [];
    }

    const key = (tesId: string, praktikanId: string) => `${tesId}::${praktikanId}`;
    const skorMap = new Map(submissions.map((s) => [key(s.tes_id, s.praktikan_id), Number(s.skor)]));

    const rows: BarisTes[] = anggota.map((a: any) => ({
      praktikan_id: a.praktikan_id,
      nama: a.profiles?.nama || "-",
      npm: a.profiles?.npm || "-",
      pretest: pre ? skorMap.get(key(pre.id, a.praktikan_id)) ?? null : null,
      posttest: post ? skorMap.get(key(post.id, a.praktikan_id)) ?? null : null,
    }));
    setBarisTes(rows);
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

  async function simpanSkorTes(tesId: string, praktikanId: string, skor: number) {
    const { error } = await supabase
      .from("tes_submission")
      .upsert(
        { tes_id: tesId, praktikan_id: praktikanId, skor },
        { onConflict: "tes_id,praktikan_id" }
      );
    if (error) {
      alert("Gagal menyimpan skor: " + error.message);
      return;
    }
    muatBarisTes();
  }

  const jadwalAktif = jadwalList.find((j) => j.id === jadwalId);

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Nilai</h1>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("tugas")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              tab === "tugas"
                ? "bg-gradient-to-r from-accent1 to-accent2 text-ink"
                : "bg-white/[0.06] text-white/60 hover:text-white"
            }`}
          >
            Tugas
          </button>
          <button
            onClick={() => setTab("tes")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              tab === "tes"
                ? "bg-gradient-to-r from-accent1 to-accent2 text-ink"
                : "bg-white/[0.06] text-white/60 hover:text-white"
            }`}
          >
            Pretest &amp; Posttest
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <select className="field" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
            ))}
          </select>

          {tab === "tugas" ? (
            <select className="field" value={tugasId} onChange={(e) => setTugasId(e.target.value)}>
              {tugasList.length === 0 && <option value="">Belum ada tugas</option>}
              {tugasList.map((t) => (
                <option key={t.id} value={t.id}>{t.judul}</option>
              ))}
            </select>
          ) : (
            <select className="field" value={jadwalId} onChange={(e) => setJadwalId(e.target.value)}>
              {jadwalList.length === 0 && <option value="">Belum ada jadwal</option>}
              {jadwalList.map((j) => (
                <option key={j.id} value={j.id}>Pertemuan {j.pertemuan_ke}: {j.topik}</option>
              ))}
            </select>
          )}
        </div>

        {/* ===== TAB TUGAS ===== */}
        {tab === "tugas" && (
          <>
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
          </>
        )}

        {/* ===== TAB PRETEST & POSTTEST ===== */}
        {tab === "tes" && (
          <>
            {jadwalList.length === 0 ? (
              <p className="text-sm text-white/35">Belum ada jadwal praktikum di kelas ini.</p>
            ) : !tesPre && !tesPost ? (
              <p className="text-sm text-white/35">
                Belum ada pretest/posttest yang dibuat untuk {jadwalAktif ? `Pertemuan ${jadwalAktif.pertemuan_ke}` : "pertemuan ini"}.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tesPre && (
                    <span className={tesPre.dibuka ? "badge-good" : "badge-neutral"}>
                      Pretest{tesPre.judul ? `: ${tesPre.judul}` : ""} · {tesPre.dibuka ? "dibuka" : "ditutup"}
                    </span>
                  )}
                  {tesPost && (
                    <span className={tesPost.dibuka ? "badge-good" : "badge-neutral"}>
                      Posttest{tesPost.judul ? `: ${tesPost.judul}` : ""} · {tesPost.dibuka ? "dibuka" : "ditutup"}
                    </span>
                  )}
                </div>

                <div className="surface divide-y divide-white/[0.06]">
                  <div className="p-4 flex items-center justify-between gap-3 text-xs text-white/40">
                    <span>Praktikan</span>
                    <div className="flex gap-2 shrink-0">
                      <span className="w-20 text-center">Pretest</span>
                      <span className="w-20 text-center">Posttest</span>
                    </div>
                  </div>

                  {barisTes.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada praktikan di kelas ini.</p>}

                  {barisTes.map((row) => (
                    <div key={row.praktikan_id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white text-sm">{row.nama}</p>
                        <p className="text-xs text-white/50">{row.npm}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <input
                          key={`pre-${row.praktikan_id}-${row.pretest ?? "x"}`}
                          type="number"
                          min={0}
                          max={100}
                          disabled={!tesPre}
                          defaultValue={row.pretest ?? undefined}
                          placeholder={tesPre ? "Pre" : "-"}
                          className="w-20 field text-xs py-1.5 disabled:opacity-30"
                          onBlur={(e) => {
                            if (!tesPre || e.target.value === "") return;
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v) && v !== row.pretest) simpanSkorTes(tesPre.id, row.praktikan_id, v);
                          }}
                        />
                        <input
                          key={`post-${row.praktikan_id}-${row.posttest ?? "x"}`}
                          type="number"
                          min={0}
                          max={100}
                          disabled={!tesPost}
                          defaultValue={row.posttest ?? undefined}
                          placeholder={tesPost ? "Post" : "-"}
                          className="w-20 field text-xs py-1.5 disabled:opacity-30"
                          onBlur={(e) => {
                            if (!tesPost || e.target.value === "") return;
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v) && v !== row.posttest) simpanSkorTes(tesPost.id, row.praktikan_id, v);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/35 mt-3">
                  Skor otomatis terisi dari hasil tes praktikan. Ketik untuk mengubah, lalu klik di luar kolom untuk menyimpan.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}