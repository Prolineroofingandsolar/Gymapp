"use client";

/**
 * Destructive-action guard: renders a submit button that asks for explicit
 * confirmation (native dialog — reliable, accessible) before the form submits.
 */
export function ConfirmSubmit({ children, message, className = "btn-danger" }: {
  children: React.ReactNode; message: string; className?: string;
}) {
  return (
    <button type="submit" className={className}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
