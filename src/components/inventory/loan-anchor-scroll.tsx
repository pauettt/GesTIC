"use client";

import { useEffect } from "react";

/** Reprèn el salt si el navegador ha rebut la secció després, via streaming. */
export function LoanAnchorScroll({ sectionId }: { sectionId: string }) {
  useEffect(() => {
    function scrollToLoan() {
      const section = document.getElementById(sectionId);
      const target = document.getElementById(window.location.hash.slice(1));
      if (target && section?.contains(target)) {
        target.scrollIntoView({ block: "start", inline: "nearest" });
      }
    }

    const frame = requestAnimationFrame(scrollToLoan);
    window.addEventListener("hashchange", scrollToLoan);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToLoan);
    };
  }, [sectionId]);

  return null;
}
