"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p>Something went wrong loading the cards. If you&apos;re offline, reconnect and retry.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xs bg-accent px-6 py-3 font-semibold text-accent-foreground"
      >
        Retry
      </button>
    </div>
  );
}
