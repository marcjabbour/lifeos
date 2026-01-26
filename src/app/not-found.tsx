import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-6 text-8xl font-bold text-accent-primary">404</div>
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">
          Page Not Found
        </h1>
        <p className="mb-8 max-w-md text-text-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-accent-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
