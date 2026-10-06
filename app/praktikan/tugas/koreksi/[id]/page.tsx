"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const KoreksiViewer = dynamic(() => import("@/components/KoreksiViewer"), {
  ssr: false,
  loading: () => <p className="p-8 text-sm text-white/50">Memuat...</p>,
});

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <KoreksiViewer pengumpulanId={id} mode="praktikan" />;
}