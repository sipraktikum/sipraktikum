"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Kelas = { id: string; nama_mata_kuliah: string; nama_kelas: string };
type Tugas = {
  id: string;
  judul: string;
  deskripsi: string;
  deadline: string;
  bobot_nilai: number;
};
type Pengumpulan = {
  id: string;
  tugas_id: string;
  file_url: string | null;
  status: string;
  nilai: number | null;
  catatan_asisten: string | null;
};

export default function PraktikanTugasPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [nama, setNama] = useState("");
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [tugasList, setTugasList] = useState<Tugas[]>([]);
  const [pengumpulanMap, setPengumpulanMap] = useState<Record<string, Pengumpulan>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  async function muatAwal() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUserId(userData.user.id);
    const { data: profile } = await supabase.from("profiles").select("nama").eq("id", userData.user.id).single();
    setNama(profile?.nama || "");

    const { data: anggota } = await supabase
      .from("anggota_kelas")
      .select("kelas_praktikum(id, nama_mata_kuliah, nama_kelas)")
      .eq("praktikan_id", userData.user.id);
    const kelas = (anggota || []).map((a: any) => a.kelas_praktikum).filter(Boolean);
    setKelasList(kelas);
    if (kelas.length > 0) setKelasId(kelas[0].id);
  }

  useEffect(() => {
    muatAwal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function muatTugas() {
    if (!kelasId || !userId) return;
    const { data: tugas } = await supabase
      .from("tugas_praktikum")
      .select("id, judul, deskripsi, deadline, bobot_nilai")
      .eq("kelas_id", kelasId)
      .order("deadline");
    setTugasList(tugas || []);

    const { data: pengumpulan } = await supabase
      .from("pengumpulan_tugas")
      .select("id, tugas_id, file_url, status, nilai, catatan_asisten")
      .eq("praktikan_id", userId);
    const map: Record<string, Pengumpulan> = {};
    (pengumpulan || []).forEach((p) => { map[p.tugas_id] = p; });
    setPengumpulanMap(map);
  }

  useEffect(() => {
    muatTugas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, userId]);

  async function kumpulkanTugas(tugas: Tugas, file: File) {
    setUploading(tugas.id);
    setPesan(null);
    const path = `${userId}/${tugas.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("tugas-praktikum").upload(path, file);

    if (uploadError) {
      setPesan("Gagal upload file: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("tugas-praktikum").getPublicUrl(path);
    const status = new Date() > new Date(tugas.deadline) ? "terlambat" : "tepat_waktu";

    const existing = pengumpulanMap[tugas.id];
    if (existing) {
      await supabase.from("pengumpulan_tugas").update({
        file_url: publicUrl.publicUrl,
        waktu_kumpul: new Date().toISOString(),
        status,
      }).eq("id", existing.id);
    } else {
      await supabase.from("pengumpulan_tugas").insert({
        tugas_id: tugas.id,
        praktikan_id: userId,
        file_url: publicUrl.publicUrl,
        waktu_kumpul: new Date().toISOString(),
        status,
      });
    }

    setUploading(null);
    muatTugas();
  }

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="page-title mb-4">Tugas Praktikum</h1>

        {kelasList.length === 0 ? (
          <p className="text-sm text-white/35">Kamu belum tergabung di kelas praktikum manapun.</p>
        ) : (
          <select className="field mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
            ))}
          </select>
        )}

        {pesan && <p className="text-xs text-rose-300/90 mb-4">{pesan}</p>}

        <div className="space-y-3">
          {tugasList.length === 0 && kelasList.length > 0 && (
            <p className="text-sm text-white/35">Belum ada tugas di kelas ini.</p>
          )}
          {tugasList.map((t) => {
            const p = pengumpulanMap[t.id];
            const lewatDeadline = new Date() > new Date(t.deadline);
            return (
              <div key={t.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white text-sm">{t.judul}</p>
                    {t.deskripsi && <p className="text-xs text-white/50 mt-1">{t.deskripsi}</p>}
                    <p className="text-xs text-white/35 mt-1">
                      Deadline: {new Date(t.deadline).toLocaleString("id-ID")} · Bobot {t.bobot_nilai}
                    </p>
                  </div>
                  {p?.nilai != null && (
                    <span className="text-sm font-semibold text-white whitespace-nowrap">Nilai: {p.nilai}</span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition ${uploading === t.id ? "opacity-50 border-white/10 text-white/50" : "border-white/15 text-white/75 hover:border-white/30 hover:text-white"}`}>
                    {uploading === t.id ? "Mengunggah..." : p?.file_url ? "Ganti file" : "Upload file"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading === t.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) kumpulkanTugas(t, file);
                      }}
                    />
                  </label>
                  {p?.file_url && (
                    <a href={p.file_url} target="_blank" className="link-accent text-xs">Lihat file terkumpul</a>
                  )}
                  {p && (
                    <span className={p.status === "terlambat" ? "badge-bad" : "badge-good"}>
                      {p.status}
                    </span>
                  )}
                  {!p && lewatDeadline && (
                    <span className="badge-bad">Sudah lewat deadline</span>
                  )}
                </div>
                {p?.catatan_asisten && (
                  <p className="text-xs text-white/50 mt-2 italic">Catatan asisten: {p.catatan_asisten}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
