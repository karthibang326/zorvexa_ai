import { useEffect } from "react";

/** Opens the user's mail client — used for /careers, /sales shortcuts */
export default function MailtoRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.href = href;
  }, [href]);

  return (
    <div className="min-h-screen bg-[#080a0e] text-slate-400 grid place-items-center px-4 text-sm">
      Opening your email client…
    </div>
  );
}
