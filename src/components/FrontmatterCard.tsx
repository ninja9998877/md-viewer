const HIDDEN = new Set(["title"]);

export function FrontmatterCard({ data }: { data: Record<string, string> }) {
  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  const titleKey = keys.find((k) => k.toLowerCase() === "title");
  const title = titleKey ? data[titleKey] : undefined;
  const rest = keys.filter((k) => !HIDDEN.has(k.toLowerCase()) && data[k]);

  return (
    <header className="matter">
      {title ? <div className="matter__title">{title}</div> : null}
      {rest.length > 0 ? (
        <dl className="matter__grid">
          {rest.map((key) => (
            <div key={key} className="matter__row">
              <dt>{key}</dt>
              <dd>{data[key]}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
