"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import type { jsPDF as JsPdfDoc } from "jspdf";

type FormAanvullen = {
  nama: string;
  npm: string;
  semester: string;
  prodi: string;
  golongan: string; // golongan asal
  praktikum: string;
  tanggalAsal: string; // yyyy-mm-dd
  jamAsal: string;
  tanggalTujuan: string; // yyyy-mm-dd
  jamTujuan: string;
  golonganTujuan: string;
  asistenAsalNama: string;
  asistenAsalNpm: string;
  asistenTujuanNama: string;
  asistenTujuanNpm: string;
  tanggalSurat: string; // yyyy-mm-dd
};

const FORM_KOSONG: FormAanvullen = {
  nama: "",
  npm: "",
  semester: "",
  prodi: "",
  golongan: "",
  praktikum: "",
  tanggalAsal: "",
  jamAsal: "",
  tanggalTujuan: "",
  jamTujuan: "",
  golonganTujuan: "",
  asistenAsalNama: "",
  asistenAsalNpm: "",
  asistenTujuanNama: "",
  asistenTujuanNpm: "",
  tanggalSurat: "",
};

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parseTanggal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatTanggal(iso: string) {
  const d = parseTanggal(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function namaHari(iso: string) {
  return HARI[parseTanggal(iso).getDay()];
}

function formatHariTanggal(iso: string) {
  return `${namaHari(iso)}, ${formatTanggal(iso)}`;
}

function hariIni() {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

// BEGIN PDF
async function buildPdf(f: FormAanvullen): Promise<JsPdfDoc> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const L = 25; // margin kiri
  const W = 160; // lebar teks (25 -> 185)
  const LH = 6.2; // tinggi baris
  const KOLOM2 = L + 85; // posisi x kolom kanan
  const LEBAR_KOLOM = 75;
  let y = 25;

  // ---- Judul ----
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("SURAT PERMOHONAN", 105, y, { align: "center" });
  y += 6.5;
  const judul = doc.splitTextToSize(
    `UNFULLEN PRAKTIKUM ${f.praktikum.toUpperCase()}`,
    W
  ) as string[];
  doc.text(judul, 105, y, { align: "center" });
  y += judul.length * 6.5 + 6;

  // ---- Identitas ----
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text("Yang bertanda tangan dibawah ini:", L, y);
  y += LH + 2;

  const baris = (label: string, nilai: string) => {
    doc.text(label, L, y);
    doc.text(":", L + 38, y);
    const lines = doc.splitTextToSize(nilai, W - 42) as string[];
    doc.text(lines, L + 42, y);
    y += lines.length * LH;
  };

  baris("Nama", f.nama);
  baris("NPM", f.npm);
  baris("Semester", f.semester);
  baris("Program Studi", f.prodi);
  baris("Golongan", f.golongan);
  y += 3;

  // ---- Isi permohonan ----
  const isi1 =
    `Sehubungan dengan surat ini, saya bermaksud untuk mengajukan permohonan ` +
    `mengganti kelas praktikum ${f.praktikum} pada golongan lain. Praktikum yang ` +
    `seharusnya dilaksanakan pada hari ${formatHariTanggal(f.tanggalAsal)}, ` +
    `pukul ${f.jamAsal} diganti pada:`;
  const isi1Lines = doc.splitTextToSize(isi1, W) as string[];
  doc.text(isi1Lines, L, y);
  y += isi1Lines.length * LH + 2;

  baris("Hari/Tanggal", formatHariTanggal(f.tanggalTujuan));
  baris("Pukul", f.jamTujuan);
  baris("Golongan", f.golonganTujuan);
  y += 3;

  const isi2 =
    "Demikian surat permohonan ini saya buat dengan sebenarnya, atas ijin dan " +
    "pengertiannya saya ucapkan terima kasih.";
  const isi2Lines = doc.splitTextToSize(isi2, W) as string[];
  doc.text(isi2Lines, L, y);
  y += isi2Lines.length * LH + 6;

  // ---- Kota & tanggal ----
  doc.text(`Surabaya, ${formatTanggal(f.tanggalSurat)}`, KOLOM2, y);
  y += LH + 4;

  // ---- Mengetahui (dua asisten) ----
  doc.text("Mengetahui,", L, y);
  y += LH;

  const judulAsisten = doc.splitTextToSize(
    `Asisten Praktikum ${f.praktikum}`,
    LEBAR_KOLOM
  ) as string[];

  const blokAsisten = (
    x: number,
    golongan: string,
    nama: string,
    npm: string
  ) => {
    let yy = y;
    doc.text(judulAsisten, x, yy);
    yy += judulAsisten.length * LH;
    doc.text(golongan, x, yy);
    yy += LH + 20; // ruang tanda tangan
    const namaLines = doc.splitTextToSize(nama, LEBAR_KOLOM) as string[];
    doc.text(namaLines, x, yy);
    yy += namaLines.length * LH;
    doc.text(`NPM. ${npm}`, x, yy);
    return yy;
  };

  const yAkhir1 = blokAsisten(
    L,
    `Golongan ${f.golongan} (Unfullen)`,
    f.asistenAsalNama,
    f.asistenAsalNpm
  );
  const yAkhir2 = blokAsisten(
    KOLOM2,
    `Golongan ${f.golonganTujuan}`,
    f.asistenTujuanNama,
    f.asistenTujuanNpm
  );
  y = Math.max(yAkhir1, yAkhir2) + LH + 6;

  // ---- Hormat saya (praktikan) ----
  doc.text("Hormat saya,", KOLOM2, y);
  y += LH + 20;
  const namaPraktikan = doc.splitTextToSize(f.nama, LEBAR_KOLOM) as string[];
  doc.text(namaPraktikan, KOLOM2, y);
  y += namaPraktikan.length * LH;
  doc.text(`NPM. ${f.npm}`, KOLOM2, y);

  return doc;
}
// END PDF

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white " +
  "placeholder:text-white/30 focus:outline-none focus:border-white/30 [color-scheme:dark]";

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <h2 className="font-display font-medium text-white tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-white/40">{desc}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function AanvullenPage() {
  const [form, setForm] = useState<FormAanvullen>(FORM_KOSONG);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Tanggal surat default = hari ini (diisi di client supaya tidak beda dengan server)
  useEffect(() => {
    setForm((p) => (p.tanggalSurat ? p : { ...p, tanggalSurat: hariIni() }));
  }, []);

  const set =
    (k: keyof FormAanvullen) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
    };

  const input = (
    k: keyof FormAanvullen,
    label: string,
    opts?: { type?: string; placeholder?: string; hint?: string }
  ) => (
    <label className="block">
      <span className="mb-1 block text-xs text-white/50">{label}</span>
      <input
        type={opts?.type ?? "text"}
        value={form[k]}
        onChange={set(k)}
        placeholder={opts?.placeholder}
        className={inputCls}
      />
      {opts?.hint && <span className="mt-1 block text-xs text-white/40">{opts.hint}</span>}
    </label>
  );

  async function handleUnduh() {
    const kosong = (Object.keys(form) as (keyof FormAanvullen)[]).some(
      (k) => form[k].trim() === ""
    );
    if (kosong) {
      setError("Semua kolom wajib diisi sebelum surat bisa diunduh.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const doc = await buildPdf(form);
      const npmAman = form.npm.replace(/[^A-Za-z0-9_-]/g, "");
      doc.save(`Surat-Unfullen-${npmAman || "praktikan"}.pdf`);
    } catch {
      setError("PDF gagal dibuat. Coba lagi, atau muat ulang halaman ini.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="font-display text-2xl font-medium text-white tracking-tight">Aanvullen</h1>
        <p className="mt-1 text-sm text-white/50">
          Isi data di bawah, unduh suratnya sebagai PDF, cetak, lalu minta tanda tangan asisten
          praktikum.
        </p>
      </div>

      <Section title="Data praktikan">
        {input("nama", "Nama lengkap")}
        {input("npm", "NPM")}
        {input("semester", "Semester", { placeholder: "contoh: 3" })}
        {input("prodi", "Program studi")}
        {input("golongan", "Golongan asal", { placeholder: "contoh: C" })}
      </Section>

      <Section title="Praktikum yang diganti">
        {input("praktikum", "Nama praktikum")}
      </Section>

      <Section title="Jadwal asal" desc="Jadwal praktikum yang seharusnya kamu ikuti.">
        {input("tanggalAsal", "Tanggal", {
          type: "date",
          hint: form.tanggalAsal ? `Hari: ${namaHari(form.tanggalAsal)}` : undefined,
        })}
        {input("jamAsal", "Pukul", { placeholder: "contoh: 07.00 WIB" })}
      </Section>

      <Section title="Jadwal tujuan" desc="Jadwal di golongan lain yang ingin kamu ikuti.">
        {input("tanggalTujuan", "Tanggal", {
          type: "date",
          hint: form.tanggalTujuan ? `Hari: ${namaHari(form.tanggalTujuan)}` : undefined,
        })}
        {input("jamTujuan", "Pukul", { placeholder: "contoh: 09.00 WIB" })}
        {input("golonganTujuan", "Golongan tujuan", { placeholder: "contoh: D" })}
      </Section>

      <Section
        title="Asisten yang mengetahui"
        desc="Satu asisten dari golongan asal (unfullen) dan satu dari golongan tujuan."
      >
        {input("asistenAsalNama", "Nama asisten golongan asal")}
        {input("asistenAsalNpm", "NPM asisten golongan asal")}
        {input("asistenTujuanNama", "Nama asisten golongan tujuan")}
        {input("asistenTujuanNpm", "NPM asisten golongan tujuan")}
      </Section>

      <Section title="Tanggal surat">
        {input("tanggalSurat", "Tanggal", { type: "date" })}
      </Section>

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        onClick={handleUnduh}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-accent1 to-accent2 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Membuat PDF..." : "Unduh surat (PDF)"}
      </button>
    </div>
  );
}