"use client";

import dynamic from "next/dynamic";

const KoreksiViewer = dynamic(() => import("@/components/KoreksiViewer"), {
  ssr: false,
  loading: () => <p className="p-8 text-sm text-white/50">Memuat...</p>,
});

export default function Page({ params }: { params: { id: string } }) {
  return <KoreksiViewer pengumpulanId={params.id} mode="asisten" />;
}