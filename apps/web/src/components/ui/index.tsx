import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

// Thin, dependency-free UI kit over the token classes in globals.css.
// Every portal surface composes these instead of re-rolling raw Tailwind,
// so the visual language stays consistent as pages evolve.

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "rounded-full bg-[color:var(--danger)] font-semibold text-white transition hover:brightness-110",
};

const buttonSizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cx(buttonVariantClass[variant], buttonSizeClass[size], "disabled:opacity-50", className)}
      {...props}
    />
  );
}

// ---------- Card ----------

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("clinical-card p-5", className)} {...props} />;
}

// ---------- Fields ----------

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("field px-3 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx("field px-3 py-2.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("field px-3 py-2.5", className)} {...props} />;
}

export function FieldLabel({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

// ---------- Badge ----------

type BadgeTone = "safe" | "info" | "warn" | "danger" | "neutral";

const badgeToneClass: Record<BadgeTone, string> = {
  safe: "status-pill status-safe",
  info: "status-pill status-info",
  warn: "status-pill status-warn",
  danger: "status-pill status-danger",
  neutral: "status-pill bg-[color:var(--surface-muted)] text-[color:var(--muted)]",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={badgeToneClass[tone]}>{children}</span>;
}

// ---------- Stat ----------

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>}
    </div>
  );
}

// ---------- Alert ----------

type AlertTone = "error" | "success" | "warning";

const alertToneClass: Record<AlertTone, string> = {
  error: "alert alert-error",
  success: "alert alert-success",
  warning: "alert alert-warning",
};

export function Alert({
  tone,
  children,
  className,
}: {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p role={tone === "error" ? "alert" : "status"} aria-live="polite" className={cx(alertToneClass[tone], className)}>
      {children}
    </p>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="clinical-card flex flex-col items-center gap-2 p-8 text-center">
      <p className="font-semibold text-[color:var(--secondary)]">{title}</p>
      {hint && <p className="max-w-sm text-sm text-[color:var(--muted)]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------- Icon tile (category / feature grids) ----------

export function IconTile({
  icon,
  label,
  sublabel,
  href,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  href?: string;
  onClick?: () => void;
}) {
  const Comp = href ? "a" : "button";
  return (
    <Comp
      href={href}
      onClick={onClick}
      type={href ? undefined : "button"}
      className="clinical-card service-pop flex flex-col items-center gap-2.5 p-5 text-center"
    >
      <span className="icon-tile size-14">{icon}</span>
      <span className="text-sm font-semibold text-[color:var(--secondary)]">{label}</span>
      {sublabel && <span className="text-xs text-[color:var(--muted)]">{sublabel}</span>}
    </Comp>
  );
}

// ---------- Skeleton ----------

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton", className)} />;
}

export function SkeletonGrid({ count, itemClassName }: { count: number; itemClassName?: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={itemClassName ?? "h-28"} />
      ))}
    </>
  );
}
