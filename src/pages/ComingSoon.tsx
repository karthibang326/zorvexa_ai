import { Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";

/** Placeholder for routes not yet fully built — keeps navigation honest. */
export default function ComingSoon() {
  return (
    <PublicLayout>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Coming Soon</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-400">
          This section is under development.
        </p>
        <Link
          to="/"
          className="mt-10 text-sm font-medium text-blue-400 underline-offset-4 transition-colors hover:text-blue-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          Back to home
        </Link>
      </div>
    </PublicLayout>
  );
}
