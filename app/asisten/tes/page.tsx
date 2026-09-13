"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Jadwal = { id: string; pertemuan_ke: number; topik: string };
type Soal = {
  id: string;
  tipe: "pilihan_ganda" | "isian_singkat";
  pertanyaan: string;
  pilihan_a: string | null;
  pilihan_b: string | null;
  pilihan_c: string | null;
  pilihan_d: string | null;
  jawaban_benar: string;
  poin: number;
};
type Tes = { id: string; jenis: "pretest" | "posttest"; judul: string; dibuka: boolean } | null;
type HasilRow = { praktikan_id: string; nama: string; npm: string; skor: number | null; submit_at: string | null };

export default function AsistenTesPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [tab, setTab] = useState<"bank" | "atur" | "hasil">("bank");

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");

  // --- Bank Soal ---
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [tipe, setTipe] = useState<"pilihan_ganda" | "isian_singkat">("pilihan_ganda");
  const [pertanyaan, setPertanyaan] = useState("");
  const [pilihanA, setPilihanA] = useState("");
  const [pilihanB, setPilihanB] = useState("");
  const [pilihanC, setPilihanC] = useState("");
  const [pilihanD, setPilihanD] = useState("");
  const [jawabanBenar, setJawabanBenar] = useState("");
  const [poin, setPoin] = useState(10);

  // --- Atur Tes ---
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [jadwalId, setJadwalId] = useState("");
  const [pretest, setPretest] = useState<Tes>(null);
  const [posttest, setPosttest] = useState<Tes>(null);
  const [soalPretest, setSoalPretest] = useState<Set<string>>(new Set());
  const [soalPosttest, setSoalPosttest] = useState<Set<string>>(new Set());

  // --- Hasil ---
  const [tesUntukHasil, setTesUntukHasil] = useState<{ id: string; label: string }[]>([]);
  const [tesHasilId, setTesHasilId] = useState("");
  const [hasil, setHasil] = useState<HasilRow[]>([]);

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
    muatSoal();
    muatJadwal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId]);

  useEffect(() => {
    if (!jadwalId) { setPretest(null); setPosttest(null); return; }
    muatTes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jadwalId]);

  useEffect(() => {
    if (!jadwalId) { setTesUntukHasil([]); setTesHasilId(""); return; }
    (async () => {
      const { data } = await supabase
        .from("tes_praktikum")
        .select("id, jenis, judul")
        .eq("jadwal_id", jadwalId);
      const opts = (data || []).map((t) => ({ id: t.id, label: `${t.jenis === "pretest" ? "Pretest" : "Posttest"}${t.judul ? " - " + t.judul : ""}` }));
      setTesUntukHasil(opts);
      setTesHasilId(opts[0]?.id || "");
    })();
  }, [jadwalId, pretest, posttest]);

  useEffect(() => {
    if (!tesHasilId) { setHasil([]); return; }
    muatHasil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tesHasilId]);

  async function muatSoal() {
    const { data } = await supabase
      .from("bank_soal")
      .select("id, tipe, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, poin")
      .eq("kelas_id", kelasId)
      .order("created_at");
    setSoalList(data || []);
  }

  async function muatJadwal() {
    const { data } = await supabase
      .from("jadwal_praktikum")
      .select("id, pertemuan_ke, topik")
      .eq("kelas_id", kelasId)
      .order("pertemuan_ke");
    setJadwalList(data || []);
    if (data && data.length > 0) setJadwalId((prev) => prev || data[0].id);
  }

  async function muatTes() {
    const { data } = await supabase
      .from("tes_praktikum")
      .select("id, jenis, judul, dibuka")
      .eq("jadwal_id", jadwalId);

    const pre = (data || []).find((t) => t.jenis === "pretest") || null;
    const post = (data || []).find((t) => t.jenis === "posttest") || null;
    setPretest(pre);
    setPosttest(post);

    if (pre) {
      const { data: ts } = await supabase.from("tes_soal").select("soal_id").eq("tes_id", pre.id);
      setSoalPretest(new Set((ts || []).map((r) => r.soal_id)));
    } else {
      setSoalPretest(new Set());
    }
    if (post) {
      const { data: ts } = await supabase.from("tes_soal").select("soal_id").eq("tes_id", post.id);
      setSoalPosttest(new Set((ts || []).map((r) => r.soal_id)));
    } else {
      setSoalPosttest(new Set());
    }
  }

  async function muatHasil() {
    const { data: anggota } = await supabase
      .from("anggota_kelas")
      .select("praktikan_id, profiles(nama, npm)")
      .eq("kelas_id", kelasId);

    const { data: submission } = await supabase
      .from("tes_submission")
      .select("praktikan_id, skor, submit_at")
      .eq("tes_id", tesHasilId);

    const map = new Map((submission || []).map((s) => [s.praktikan_id, s]));
    const rows: HasilRow[] = (anggota || []).map((a: any) => {
      const s = map.get(a.praktikan_id);
      return {
        praktikan_id: a.praktikan_id,
        nama: a.profiles?.nama || "-",
        npm: a.profiles?.npm || "-",
        skor: s?.skor ?? null,
        submit_at: s?.submit_at ?? null,
      };
    });
    setHasil(rows);
  }

  async function tambahSoal(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("bank_soal").insert({
      kelas_id: kelasId,
      tipe,
      pertanyaan,
      pilihan_a: tipe === "pilihan_ganda" ? pilihanA : null,
      pilihan_b: tipe === "pilihan_ganda" ? pilihanB : null,
      pilihan_c: tipe === "pilihan_ganda" ? pilihanC : null,
      pilihan_d: tipe === "pilihan_ganda" ? pilihanD : null,
      jawaban_benar: jawabanBenar,
      poin,
    });
    setPertanyaan(""); setPilihanA(""); setPilihanB(""); setPilihanC(""); setPilihanD(""); setJawabanBenar(""); setPoin(10);
    muatSoal();
  }

  async function hapusSoal(id: string) {
    await supabase.from("bank_soal").delete().eq("id", id);
    muatSoal();
  }

  async function buatTes(jenis: "pretest" | "posttest") {
    await supabase.from("tes_praktikum").insert({ jadwal_id: jadwalId, jenis, judul: jenis === "pretest" ? "Pretest" : "Posttest" });
    muatTes();
  }

  async function hapusTes(tes: Tes) {
    if (!tes) return;
    await supabase.from("tes_praktikum").delete().eq("id", tes.id);
    muatTes();
  }

  async function toggleDibuka(tes: Tes) {
    if (!tes) return;
    await supabase.from("tes_praktikum").update({ dibuka: !tes.dibuka }).eq("id", tes.id);
    muatTes();
  }

  async function toggleSoalTes(tes: Tes, soalId: string, checked: boolean) {
    if (!tes) return;
    if (checked) {
      await supabase.from("tes_soal").insert({ tes_id: tes.id, soal_id: soalId, urutan: 0 });
    } else {
      await supabase.from("tes_soal").delete().eq("tes_id", tes.id).eq("soal_id", soalId);
    }
    muatTes();
  }

  return (
    <div>
      <Navbar role="asisten" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Bank Soal & Tes</h1>

        <select className="field mb-4" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
          ))}
        </select>

        <div className="flex gap-1 mb-6 bg-white/[0.04] p-1 rounded-full text-sm w-fit">
          {(["bank", "atur", "hasil"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "px-4 py-1.5 rounded-full bg-white/10 text-white font-medium transition" : "px-4 py-1.5 rounded-full text-white/45 transition"}
            >
              {t === "bank" ? "Bank Soal" : t === "atur" ? "Atur Tes" : "Hasil"}
            </button>
          ))}
        </div>

        {tab === "bank" && (
          <>
            <form onSubmit={tambahSoal} className="surface p-4 mb-6 space-y-2">
              <div className="flex gap-2">
                <select className="field w-48" value={tipe} onChange={(e) => setTipe(e.target.value as any)}>
                  <option value="pilihan_ganda">Pilihan ganda</option>
                  <option value="isian_singkat">Isian singkat</option>
                </select>
                <input type="number" className="w-24 field" placeholder="Poin" value={poin} onChange={(e) => setPoin(Number(e.target.value))} />
              </div>
              <textarea className="w-full field" placeholder="Tulis pertanyaan" value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} rows={2} required />

              {tipe === "pilihan_ganda" ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className="field" placeholder="Pilihan A" value={pilihanA} onChange={(e) => setPilihanA(e.target.value)} required />
                  <input className="field" placeholder="Pilihan B" value={pilihanB} onChange={(e) => setPilihanB(e.target.value)} required />
                  <input className="field" placeholder="Pilihan C" value={pilihanC} onChange={(e) => setPilihanC(e.target.value)} />
                  <input className="field" placeholder="Pilihan D" value={pilihanD} onChange={(e) => setPilihanD(e.target.value)} />
                  <select className="field sm:col-span-2" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} required>
                    <option value="">Pilih jawaban benar</option>
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                  </select>
                </div>
              ) : (
                <input
                  className="w-full field"
                  placeholder="Jawaban benar (kalau ada beberapa alternatif, pisahkan dengan | contoh: jakarta|DKI Jakarta)"
                  value={jawabanBenar}
                  onChange={(e) => setJawabanBenar(e.target.value)}
                  required
                />
              )}
              <button className="btn-primary">+ Tambah Soal</button>
            </form>

            <div className="surface divide-y divide-white/[0.06]">
              {soalList.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada soal di bank soal kelas ini.</p>}
              {soalList.map((s) => (
                <div key={s.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white text-sm">{s.pertanyaan}</p>
                    <p className="text-xs text-white/50 mt-1">
                      {s.tipe === "pilihan_ganda" ? (
                        <>A. {s.pilihan_a} &nbsp; B. {s.pilihan_b} {s.pilihan_c && <>&nbsp; C. {s.pilihan_c}</>} {s.pilihan_d && <>&nbsp; D. {s.pilihan_d}</>}</>
                      ) : (
                        <>Isian singkat</>
                      )}
                      {" "}· Jawaban: <span className="text-white/70">{s.jawaban_benar}</span> · {s.poin} poin
                    </p>
                  </div>
                  <button onClick={() => hapusSoal(s.id)} className="btn-danger-ghost">Hapus</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "atur" && (
          <>
            <select className="field mb-6" value={jadwalId} onChange={(e) => setJadwalId(e.target.value)}>
              {jadwalList.length === 0 && <option value="">Belum ada jadwal</option>}
              {jadwalList.map((j) => (
                <option key={j.id} value={j.id}>Pertemuan {j.pertemuan_ke}: {j.topik}</option>
              ))}
            </select>

            {jadwalId && (
              <div className="grid sm:grid-cols-2 gap-4">
                {([{ jenis: "pretest" as const, tes: pretest, selected: soalPretest }, { jenis: "posttest" as const, tes: posttest, selected: soalPosttest }]).map(({ jenis, tes, selected }) => (
                  <div key={jenis} className="surface p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-medium text-white text-sm">{jenis === "pretest" ? "Pretest" : "Posttest"}</h2>
                      {tes ? (
                        <div className="flex items-center gap-2">
                          <span className={tes.dibuka ? "badge-good" : "badge-neutral"}>{tes.dibuka ? "Dibuka" : "Ditutup"}</span>
                          <button onClick={() => toggleDibuka(tes)} className="btn-ghost text-xs px-3 py-1">
                            {tes.dibuka ? "Tutup" : "Buka"}
                          </button>
                          <button onClick={() => hapusTes(tes)} className="btn-danger-ghost">Hapus</button>
                        </div>
                      ) : (
                        <button onClick={() => buatTes(jenis)} className="btn-primary text-xs px-3 py-1.5">+ Buat</button>
                      )}
                    </div>

                    {tes ? (
                      soalList.length === 0 ? (
                        <p className="empty-note">Belum ada soal di bank soal. Tambah dulu di tab Bank Soal.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {soalList.map((s) => (
                            <label key={s.id} className="flex items-start gap-2 text-xs text-white/70">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={selected.has(s.id)}
                                onChange={(e) => toggleSoalTes(tes, s.id, e.target.checked)}
                              />
                              <span>{s.pertanyaan} <span className="text-white/35">({s.poin} poin)</span></span>
                            </label>
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="empty-note">Belum dibuat untuk pertemuan ini.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "hasil" && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              <select className="field" value={jadwalId} onChange={(e) => setJadwalId(e.target.value)}>
                {jadwalList.map((j) => (
                  <option key={j.id} value={j.id}>Pertemuan {j.pertemuan_ke}: {j.topik}</option>
                ))}
              </select>
              <select className="field" value={tesHasilId} onChange={(e) => setTesHasilId(e.target.value)}>
                {tesUntukHasil.length === 0 && <option value="">Belum ada tes</option>}
                {tesUntukHasil.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="surface divide-y divide-white/[0.06]">
              {hasil.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada praktikan / tes belum dipilih.</p>}
              {hasil.map((r) => (
                <div key={r.praktikan_id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">{r.nama}</p>
                    <p className="text-xs text-white/50">{r.npm}</p>
                  </div>
                  {r.skor !== null ? (
                    <span className="badge-good">Skor {r.skor}</span>
                  ) : (
                    <span className="badge-neutral">Belum mengerjakan</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}