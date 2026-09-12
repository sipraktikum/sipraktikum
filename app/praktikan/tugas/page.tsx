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

    const { data: anggota, error: anggotaError } = await supabase
      .from("anggota_kelas")
      .select("kelas_praktikum(id, nama_mata_kuliah, nama_kelas)")
      .eq("praktikan_id", userData.user.id);
    if (anggotaError) console.error("Gagal muat anggota_kelas:", anggotaError);
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
    const { data: tugas, error: tugasError } = await supabase
      .from("tugas_praktikum")
      .select("id, judul, deskripsi, deadline, bobot_nilai")
      .eq("kelas_id", kelasId)
      .order("deadline");
    if (tugasError) console.error("Gagal muat tugas_praktikum:", tugasError);
    setTugasList(tugas || []);

    const { data: pengumpulan, error: pengumpulanError } = await supabase
      .from("pengumpulan_tugas")
      .select("id, tugas_id, file_url, status, nilai, catatan_asisten")
      .eq("praktikan_id", userId);
    if (pengumpulanError) console.error("Gagal muat pengumpulan_tugas:", pengumpulanError);
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
    // path harus diawali userId (folder pertama) supaya lolos RLS policy storage.objects
    const path = `${userId}/${tugas.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("tugas-praktikum").upload(path, file);

    if (uploadError) {
      console.error("Gagal upload file:", uploadError);
      setPesan("Gagal upload file: " + uploadError.message);
      setUploading(null);
      return;
    }

    // PENTING: bucket "tugas-praktikum" itu PRIVATE (public: false), jadi getPublicUrl()
    // tidak akan bisa diakses. Yang disimpan di file_url adalah PATH-nya saja
    // (bukan URL publik) — signed URL sementara di-generate saat mau ditampilkan/dibuka.
    const status = new Date() > new Date(tugas.deadline) ? "terlambat" : "tepat_waktu";

    const existing = pengumpulanMap[tugas.id];
    let dbError;
    if (existing) {
      const { error } = await supabase.from("pengumpulan_tugas").update({
        file_url: path,
        waktu_kumpul: new Date().toISOString(),
        status,
      }).eq("id", existing.id);
      dbError = error;
    } else {
      const { error } = await supabase.from("pengumpulan_tugas").insert({
        tugas_id: tugas.id,
        praktikan_id: userId,
        file_url: path,
        waktu_kumpul: new Date().toISOString(),
        status,
      });
      dbError = error;
    }
    if (dbError) {
      console.error("Gagal simpan data pengumpulan:", dbError);
      setPesan("File terupload tapi gagal menyimpan data: " + dbError.message);
    }

    setUploading(null);
    muatTugas();
  }

  async function bukaFile(path: string) {
    const { data, error } = await supabase.storage.from("tugas-praktikum").createSignedUrl(path, 60);
    if (error || !data) {
      console.error("Gagal buat signed URL:", error);
      setPesan("Gagal membuka file: " + (error?.message || "unknown error"));
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-4">Tugas Praktikum</h1>

        {kelasList.length === 0 ? (
          <p className="text-sm text-slate-400">Kamu belum tergabung di kelas praktikum manapun.</p>
        ) : (
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-6" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama_mata_kuliah} - {k.nama_kelas}</option>
            ))}
          </select>
        )}

        {pesan && <p className="text-xs text-red-500 mb-4">{pesan}</p>}

        <div className="space-y-3">
          {tugasList.length === 0 && kelasList.length > 0 && (
            <p className="text-sm text-slate-400">Belum ada tugas di kelas ini.</p>
          )}
          {tugasList.map((t) => {
            const p = pengumpulanMap[t.id];
            const lewatDeadline = new Date() > new Date(t.deadline);
            return (
              <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{t.judul}</p>
                    {t.deskripsi && <p className="text-xs text-slate-500 mt-1">{t.deskripsi}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      Deadline: {new Date(t.deadline).toLocaleString("id-ID")} · Bobot {t.bobot_nilai}
                    </p>
                  </div>
                  {p?.nilai != null && (
                    <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">Nilai: {p.nilai}</span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer ${uploading === t.id ? "opacity-50" : "border-slate-300 hover:bg-slate-50"}`}>
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
                    <button onClick={() => bukaFile(p.file_url!)} className="text-xs text-blue-600 underline">
                      Lihat file terkumpul
                    </button>
                  )}
                  {p && (
                    <span className={`text-xs px-2 py-1 rounded-full ${p.status === "terlambat" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                      {p.status}
                    </span>
                  )}
                  {!p && lewatDeadline && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600">Sudah lewat deadline</span>
                  )}
                </div>
                {p?.catatan_asisten && (
                  <p className="text-xs text-slate-500 mt-2 italic">Catatan asisten: {p.catatan_asisten}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}