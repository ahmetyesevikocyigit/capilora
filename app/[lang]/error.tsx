"use client";
import { useParams } from "next/navigation";
export default function ErrorPage({reset}: {reset:()=>void}) {
  const {lang} = useParams();
  return <main className="error-page"><h1>{lang==="en" ? "Let’s try that again." : "Bir kez daha deneyelim."}</h1><button className="button button-teal" onClick={reset}>{lang==="en" ? "Try again" : "Yeniden dene"}</button></main>;
}
