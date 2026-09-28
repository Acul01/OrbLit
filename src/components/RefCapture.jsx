"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureRefFromUrl } from "@/lib/refTracking";

// Invisible — just reads ?ref=... on the landing page into sessionStorage
// so it survives through signup/checkout to be attached once the user is
// authenticated (see RefAttacher).
export default function RefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureRefFromUrl(searchParams);
  }, [searchParams]);

  return null;
}
