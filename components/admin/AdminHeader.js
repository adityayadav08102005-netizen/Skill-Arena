import Reveal from "@/components/common/Reveal";

/** Page header used by every admin page (server component, so it can take an icon). */
export default function AdminHeader({ icon: Icon, title, sub, children }) {
  return (
    <Reveal>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight">
            {Icon && <Icon size={22} className="text-arena-600" aria-hidden="true" />} {title}
          </h1>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {children}
      </header>
    </Reveal>
  );
}
