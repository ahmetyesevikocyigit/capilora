export function PageHeading({ title, light }: { title: string; light?: string }) {
  return <header className="page-heading">
    <h1>{light ? <><strong>{title}</strong>{" "}<span>{light}</span></> : title}</h1>
  </header>;
}
