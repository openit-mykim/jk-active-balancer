import type { ReactElement, ReactNode } from "react";

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }): ReactElement {
  return (
    <section className={`card ${className ?? ""}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  );
}

/** Centered icon + title + body, as jbd-bms-manager shows when nothing is connected. */
export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }): ReactElement {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-body">{body}</div>
      {children}
    </div>
  );
}

export function Metric({ label, value, sub, band }: { label: string; value: string; sub?: string; band?: string }): ReactElement {
  return (
    <div className={`metric ${band ? `band-${band}` : ""}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }): ReactElement {
  return (
    <div className="row-kv">
      <span className="row-label">{label}</span>
      <span className="row-value">{value}</span>
    </div>
  );
}

/** Settings-style list item: icon, title, supporting text, trailing control. */
export function ListItem(props: { icon: ReactNode; title: string; body?: string; trailing?: ReactNode; onClick?: () => void }): ReactElement {
  const content = (
    <>
      <span className="li-icon" aria-hidden="true">
        {props.icon}
      </span>
      <span className="li-text">
        <span className="li-title">{props.title}</span>
        {props.body && <span className="li-body">{props.body}</span>}
      </span>
      {props.trailing && <span className="li-trailing">{props.trailing}</span>}
    </>
  );
  return props.onClick ? (
    <button type="button" className="list-item" onClick={props.onClick}>
      {content}
    </button>
  ) : (
    <div className="list-item">{content}</div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): ReactElement {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="toggle-track" />
    </label>
  );
}

export function Segmented<V extends string>(props: { value: V; options: ReadonlyArray<{ value: V; label: string }>; onChange: (v: V) => void }): ReactElement {
  return (
    <div className="segmented" role="tablist">
      {props.options.map((o) => (
        <button
          type="button"
          role="tab"
          key={o.value}
          aria-selected={props.value === o.value}
          className={props.value === o.value ? "selected" : ""}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function download(name: string, type: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fmt = (value: number | undefined, digits = 3): string => (value === undefined ? "-" : value.toFixed(digits));
