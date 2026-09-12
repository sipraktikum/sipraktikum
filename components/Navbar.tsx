"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({
  role,
  nama,
}: {
  role: "asisten" | "praktikan";
  nama: string;
}) {
  const pathname = usePathname();
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
    <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-ink/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent1 to-accent2" />
            <span className="font-display font-medium text-white tracking-tight">SiPraktikum</span>
          </Link>
          <nav className="hidden sm:flex gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={pathname === l.href ? "pill-link-active" : "pill-link"}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/40 hidden sm:inline">{nama}</span>
          <button onClick={handleLogout} className="pill-link">
            Keluar
          </button>
        </div>
      </div>
      <nav className="flex sm:hidden gap-1 px-3 pb-2 overflow-x-auto">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? "pill-link-active" : "pill-link"}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
