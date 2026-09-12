"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({
  role,
  nama,
}: {
  role: "asisten" | "praktikan";
  nama: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const asistenLinks = [
    { href: "/asisten/kelas", label: "Kelas" },
    { href: "/asisten/jadwal", label: "Jadwal" },
    { href: "/asisten/absensi", label: "Absensi" },
    { href: "/asisten/tugas", label: "Tugas" },
    { href: "/asisten/nilai", label: "Nilai" },
  ];
  const praktikanLinks = [
    { href: "/praktikan/jadwal", label: "Jadwal" },
    { href: "/praktikan/absensi", label: "Absensi" },
    { href: "/praktikan/tugas", label: "Tugas" },
    { href: "/praktikan/nilai", label: "Nilai" },
  ];

  const links = role === "asisten" ? asistenLinks : praktikanLinks;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-900">SiPraktikum</span>
          <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-slate-900">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 hidden sm:inline">{nama}</span>
          <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
            Keluar
          </button>
        </div>
      </div>
      <nav className="flex sm:hidden gap-3 text-xs text-slate-600 px-4 pb-2 overflow-x-auto">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-slate-900">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
