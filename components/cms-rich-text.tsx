import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import type { RichNode } from "@/lib/cms/types";
export function richText(n: RichNode): string {
  return n.text || n.content?.map(richText).join("") || "";
}
export function headingId(index: number) {
  return `section-${index + 1}`;
}
export function RichText({ body }: { body: RichNode }) {
  let heading = 0;
  const render = (node: RichNode, key: number): ReactNode => {
    const children = node.content?.map(render);
    if (node.type === "text") {
      let out: ReactNode = node.text;
      for (const mark of node.marks || []) {
        if (mark.type === "bold") out = <strong>{out}</strong>;
        if (mark.type === "italic") out = <em>{out}</em>;
        if (mark.type === "strike") out = <s>{out}</s>;
        if (mark.type === "underline") out = <u>{out}</u>;
        if (mark.type === "link")
          out = (
            <a href={String(mark.attrs?.href || "")} rel="noopener noreferrer">
              {out}
            </a>
          );
      }
      return <Fragment key={key}>{out}</Fragment>;
    }
    switch (node.type) {
      case "doc":
        return <Fragment key={key}>{children}</Fragment>;
      case "paragraph":
        return <p key={key}>{children}</p>;
      case "heading": {
        const level = Number(node.attrs?.level) || 2;
        const H = level === 3 ? "h3" : level === 4 ? "h4" : "h2";
        return (
          <H key={key} id={headingId(heading++)}>
            {children}
          </H>
        );
      }
      case "bulletList":
        return <ul key={key}>{children}</ul>;
      case "orderedList":
        return <ol key={key}>{children}</ol>;
      case "listItem":
        return <li key={key}>{children}</li>;
      case "blockquote":
        return <blockquote key={key}>{children}</blockquote>;
      case "hardBreak":
        return <br key={key} />;
      case "horizontalRule":
        return <hr key={key} />;
      case "image":
        return (
          <Image
            key={key}
            src={String(node.attrs?.src)}
            alt={String(node.attrs?.alt || "")}
            width={1200}
            height={800}
            sizes="(max-width:760px) 90vw, 750px"
            unoptimized={String(node.attrs?.src).startsWith("/api/media/")}
            style={{ width: "100%", height: "auto", borderRadius: 16 }}
          />
        );
      case "table":
        return (
          <div className="cms-table" key={key}>
            <table>
              <tbody>{children}</tbody>
            </table>
          </div>
        );
      case "tableRow":
        return <tr key={key}>{children}</tr>;
      case "tableCell":
        return <td key={key}>{children}</td>;
      case "tableHeader":
        return <th key={key}>{children}</th>;
      default:
        return null;
    }
  };
  return <>{render(body, 0)}</>;
}
export function tocItems(body: RichNode) {
  const list: { id: string; label: string }[] = [];
  const walk = (node: RichNode) => {
    if (node.type === "heading")
      list.push({ id: headingId(list.length), label: richText(node) });
    node.content?.forEach(walk);
  };
  walk(body);
  return list;
}
