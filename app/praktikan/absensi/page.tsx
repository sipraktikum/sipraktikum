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
  hadir: "badge-good",
  izin: "badge-warn",
  sakit: "badge-warn",
  alpa: "badge-bad",
  belum: "badge-neutral",
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
        <h1 className="page-title mb-4">Riwayat Absensi</h1>
        <div className="surface divide-y divide-white/[0.06]">
          {riwayat.length === 0 && <p className="text-sm text-white/35 p-4">Belum ada data absensi.</p>}
          {riwayat.map((r, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">
                  Pertemuan {r.jadwal_praktikum?.pertemuan_ke}: {r.jadwal_praktikum?.topik}
                </p>
                <p className="text-xs text-white/50">{r.jadwal_praktikum?.tanggal}</p>
              </div>
              <span className={WARNA[r.status] || WARNA.belum}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
