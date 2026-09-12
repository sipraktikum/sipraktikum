"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

type Riwayat = {
  status: string;
  waktu_absen: string | null;
  jadwal_praktikum: { pertemuan_ke: number; topik: string; tanggal: string } | null;
};

const WARNA: Record<string, string> = {
  hadir: "text-green-600 bg-green-50",
  izin: "text-amber-600 bg-amber-50",
  sakit: "text-amber-600 bg-amber-50",
  alpa: "text-red-600 bg-red-50",
  belum: "text-slate-400 bg-slate-50",
};

export default function PraktikanAbsensiPage() {
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase.from("profiles").select("nama").eq("id", userData.user.id).single();
      setNama(profile?.nama || "");

      const { data } = await supabase
        .from("absensi")
        .select("status, waktu_absen, jadwal_praktikum(pertemuan_ke, topik, tanggal)")
        .eq("praktikan_id", userData.user.id);
      setRiwayat((data as any) || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Navbar role="praktikan" nama={nama} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900 mb-4">Riwayat Absensi</h1>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {riwayat.length === 0 && <p className="text-sm text-slate-400 p-4">Belum ada data absensi.</p>}
          {riwayat.map((r, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 text-sm">
                  Pertemuan {r.jadwal_praktikum?.pertemuan_ke}: {r.jadwal_praktikum?.topik}
                </p>
                <p className="text-xs text-slate-500">{r.jadwal_praktikum?.tanggal}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${WARNA[r.status] || WARNA.belum}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
