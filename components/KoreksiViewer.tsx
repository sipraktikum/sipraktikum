"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  useHighlightContainerContext,
  type Highlight,
  type GhostHighlight,
  type PdfHighlighterUtils,
} from "react-pdf-highlighter-extended";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Komentar = {
  id: string;
  parent_id: string | null;
  halaman: number | null;
  posisi: any;
  teks_terseleksi: string | null;
  isi: string;
  status: string;
  dibuat_oleh: string;
  dibuat_pada: string;
};

function HighlightContainer({
  aktifId,
  onKlik,
}: {
  aktifId: string | null;
  onKlik: (id: string) => void;
}) {
  const { highlight, isScrolledTo } = useHighlightContainerContext();
  return (
    <TextHighlight
      highlight={highlight}
      isScrolledTo={isScrolledTo || highlight.id === aktifId}
      onClick={() => onKlik(highlight.id)}
    />
  );
}

export default function KoreksiViewer({
  pengumpulanId,
  mode,
}: {
  pengumpulanId: string;
  mode: "asisten" | "praktikan";
}) {
  const [supabase] = useState(() => createClient());
  const utilsRef = useRef<PdfHighlighterUtils | null>(null);
  const kartuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [nama, setNama] = useState("");
  const [userId, setUserId] = useState("");
  const [praktikanId, setPraktikanId] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [komentar, setKomentar] = useState<Komentar[]>([]);
  const [error, setError] = useState("");

  const [pending, setPending] = useState<GhostHighlight | null>(null);
  const [teksBaru, setTeksBaru] = useState("");
  const [balasan, setBalasan] = useState<Record<string, string>>({});
  const [aktifId, setAktifId] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const { data, error } = await supabase
      .from("komentar_pdf")
      .select("*")
      .eq("pengumpulan_id", pengumpulanId)
      .order("dibuat_pada");
    if (error) setError("Gagal memuat komentar: " + error.message);
    else setKomentar((data as Komentar[]) || []);
  }, [supabase, pengumpulanId]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setUserId(u.user.id);
        const { data: me } = await supabase.from("profiles").select("nama").eq("id", u.user.id).single();
        setNama(me?.nama || "");
      }
      const { data: p, error: e } = await supabase
        .from("pengumpulan_tugas")
        .select("praktikan_id, file_url")
        .eq("id", pengumpulanId)
        .single();
      if (e || !p) {
        setError(e?.message || "Pengumpulan tidak ditemukan");
        return;
      }
      if (mode === "praktikan" && u.user && p.praktikan_id !== u.user.id) {
        setError("Kamu tidak punya akses ke koreksi ini.");
        return;
      }
      setPraktikanId(p.praktikan_id);
      setFileUrl(p.file_url);
      muat();
    })();

    const ch = supabase
      .channel(`komentar-${pengumpulanId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "komentar_pdf", filter: `pengumpulan_id=eq.${pengumpulanId}` },
        () => muat()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, pengumpulanId, muat, mode]);

  const roots = komentar.filter((k) => !k.parent_id);
  const balasanDari = (id: string) => komentar.filter((k) => k.parent_id === id);

  const toHighlight = (k: Komentar): Highlight => ({
    id: k.id,
    type: "text",
    position: k.posisi,
    content: { text: k.teks_terseleksi || "" },
  });

  const highlights = useMemo(
    () => roots.filter((k) => k.posisi).map(toHighlight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [komentar]
  );

  // Saat highlight di PDF diklik: tandai komentarnya & gulir panel ke kartunya
  function klikHighlight(id: string) {
    setAktifId(id);
    setPending(null);
  }

  useEffect(() => {
    if (!aktifId) return;
    kartuRefs.current[aktifId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [aktifId]);

  // Saat kutipan di panel diklik: tandai & gulir PDF ke highlight-nya
  function klikKutipan(k: Komentar) {
    if (!k.posisi) return;
    setAktifId(k.id);
    utilsRef.current?.scrollToHighlight(toHighlight(k));
  }

  async function simpanKomentar() {
    if (!pending || !teksBaru.trim()) return;
    const { error } = await supabase.from("komentar_pdf").insert({
      pengumpulan_id: pengumpulanId,
      halaman: pending.position.boundingRect.pageNumber,
      posisi: pending.position,
      teks_terseleksi: pending.content.text ?? null,
      isi: teksBaru.trim(),
      dibuat_oleh: userId,
    });
    if (error) return alert("Gagal menyimpan: " + error.message);
    setPending(null);
    setTeksBaru("");
    muat();
  }

  async function kirimBalasan(parent: Komentar) {
    const isi = (balasan[parent.id] || "").trim();
    if (!isi) return;
    const { error } = await supabase.from("komentar_pdf").insert({
      pengumpulan_id: pengumpulanId,
      parent_id: parent.id,
      isi,
      dibuat_oleh: userId,
    });
    if (error) return alert("Gagal membalas: " + error.message);
    setBalasan((b) => ({ ...b, [parent.id]: "" }));
    muat();
  }

  async function toggleSelesai(k: Komentar) {
    await supabase
      .from("komentar_pdf")
      .update({ status: k.status === "open" ? "resolved" : "open" })
      .eq("id", k.id);
    muat();
  }

  async function hapus(id: string) {
    if (!confirm("Hapus komentar ini?")) return;
    await supabase.from("komentar_pdf").delete().eq("id", id);
    if (aktifId === id) setAktifId(null);
    muat();
  }

  const label = (uid: string) => (uid === praktikanId ? "Praktikan" : "Asisten");

  return (
    <div>
      <Navbar role={mode} nama={nama} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="page-title mb-1">
          {mode === "asisten" ? "Koreksi Tugas" : "Hasil Koreksi"}
        </h1>
        {mode === "asisten" ? (
          <p className="text-xs text-white/50 mb-4">
            Blok (seleksi) teks di PDF, lalu tulis komentar di panel kanan.
          </p>
        ) : (
          <p className="text-xs text-white/50 mb-4">
            Klik bagian PDF yang ter-highlight untuk melihat komentar asisten.
          </p>
        )}
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex flex-col lg:flex-row gap-4">
          {/* PDF */}
          <div className="surface lg:w-2/3" style={{ height: "80vh", position: "relative", overflow: "hidden" }}>
            {fileUrl ? (
              <PdfLoader document={fileUrl} beforeLoad={() => <p className="p-4 text-sm text-white/50">Memuat PDF...</p>}>
                {(pdfDocument) => (
                  <PdfHighlighter
                    pdfDocument={pdfDocument}
                    highlights={highlights}
                    utilsRef={(u) => {
                      utilsRef.current = u;
                    }}
                    onSelection={
                      mode === "asisten" ? (sel) => setPending(sel.makeGhostHighlight()) : undefined
                    }
                  >
                    <HighlightContainer aktifId={aktifId} onKlik={klikHighlight} />
                  </PdfHighlighter>
                )}
              </PdfLoader>
            ) : (
              <p className="p-4 text-sm text-white/50">Belum ada file.</p>
            )}
          </div>

          {/* Panel komentar */}
          <div className="lg:w-1/3 space-y-3 overflow-y-auto" style={{ maxHeight: "80vh" }}>
            {pending && mode === "asisten" && (
              <div className="surface p-3 space-y-2">
                <p className="text-xs text-white/50">Komentar untuk teks:</p>
                <p className="text-xs text-white italic line-clamp-3">&ldquo;{pending.content.text}&rdquo;</p>
                <textarea
                  className="w-full field"
                  rows={3}
                  placeholder="Tulis komentar..."
                  value={teksBaru}
                  onChange={(e) => setTeksBaru(e.target.value)}
                />
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={simpanKomentar}>Simpan</button>
                  <button className="btn-danger-ghost" onClick={() => { setPending(null); setTeksBaru(""); }}>
                    Batal
                  </button>
                </div>
              </div>
            )}

            {roots.length === 0 && !pending && (
              <p className="text-sm text-white/35">Belum ada komentar.</p>
            )}

            {roots.map((k) => (
              <div
                key={k.id}
                ref={(el) => {
                  kartuRefs.current[k.id] = el;
                }}
                className={`surface p-3 space-y-2 transition ${
                  k.status === "resolved" ? "opacity-60" : ""
                } ${aktifId === k.id ? "ring-2 ring-white/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">
                    {label(k.dibuat_oleh)} · hal. {k.halaman ?? "-"}
                  </span>
                  <span className={k.status === "open" ? "badge-neutral" : "badge-good"}>
                    {k.status === "open" ? "terbuka" : "selesai"}
                  </span>
                </div>

                {k.teks_terseleksi && (
                  <button
                    className="text-left text-xs text-white/60 italic line-clamp-2"
                    onClick={() => klikKutipan(k)}
                  >
                    &ldquo;{k.teks_terseleksi}&rdquo;
                  </button>
                )}
                <p className="text-sm text-white whitespace-pre-wrap">{k.isi}</p>

                {balasanDari(k.id).map((b) => (
                  <div key={b.id} className="border-l border-white/10 pl-2">
                    <p className="text-xs text-white/50">{label(b.dibuat_oleh)}</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{b.isi}</p>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    className="flex-1 field text-xs py-1.5"
                    placeholder="Balas..."
                    value={balasan[k.id] || ""}
                    onChange={(e) => setBalasan((b) => ({ ...b, [k.id]: e.target.value }))}
                  />
                  <button className="btn-primary" onClick={() => kirimBalasan(k)}>Kirim</button>
                </div>

                {mode === "asisten" && (
                  <div className="flex gap-3">
                    <button className="link-accent text-xs" onClick={() => toggleSelesai(k)}>
                      {k.status === "open" ? "Tandai selesai" : "Buka lagi"}
                    </button>
                    <button className="btn-danger-ghost" onClick={() => hapus(k.id)}>Hapus</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}