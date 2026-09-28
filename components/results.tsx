"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ChevronsLeftRight } from "lucide-react";
import { results as initialResults, type ResultCase, type Locale, type PageCopy } from "@/content/site";

export function Results({lang, text, data = initialResults}: {lang:Locale; text:PageCopy["results"];data?:ResultCase[]}) {
  const results=data;
  const [selected, setSelected] = useState(0);
  const [amount, setAmount] = useState(50);
  const current = results[selected];
  const select = (index: number) => { setSelected((index+results.length)%results.length); setAmount(50); };
  return <div className="results-content">
    <div className="results-layout">
      <div className="comparison-wrap">
        <div className="comparison" style={{"--amount": `${amount}%`} as CSSProperties} data-testid="comparison" data-position={amount}>
          <Image key={`${current.id}-before`} unoptimized={current.before.startsWith("/api/media/")} src={current.before} alt={`${current.title[lang]} — ${text.before}`} fill sizes="(max-width: 760px) 90vw, 600px" style={{objectPosition:current.position.before}} draggable={false}/>
          <div className="comparison-after" style={{clipPath:`inset(0 ${100-amount}% 0 0)`}}>
            <Image key={`${current.id}-after`} unoptimized={current.after.startsWith("/api/media/")} src={current.after} alt={`${current.title[lang]} — ${text.after}`} fill sizes="(max-width: 760px) 90vw, 600px" style={{objectPosition:current.position.after}} draggable={false}/>
          </div>
          <span className={`comparison-label after-label ${amount < 16 ? "is-hidden" : ""}`}>{text.after}</span>
          <span className={`comparison-label before-label ${amount > 84 ? "is-hidden" : ""}`}>{text.before}</span>
          <div className="comparison-line" aria-hidden="true"><span><ChevronsLeftRight size={22}/></span></div>
          <input className="comparison-input" type="range" min={0} max={100} step={1} value={amount} onChange={e=>setAmount(Number(e.target.value))} aria-label={`${text.slider}: ${current.title[lang]}`} aria-valuetext={`${amount}% ${text.after}, ${100-amount}% ${text.before}`} />
        </div>
        <div className="comparison-help"><ChevronsLeftRight size={18}/><p>{text.hint}</p></div>
      </div>
      <div className="result-story">
        <div aria-live="polite" aria-atomic="true"><h3>{current.title[lang]}</h3><p>{current.description[lang]}</p></div>
        <div className="result-thumbnails" role="group" aria-label={lang === "tr" ? "Sonuç seçimi" : "Choose a result"}>
          {results.map((result, index)=><button key={result.id} className={`result-thumb ${index === selected ? "selected" : ""}`} aria-pressed={index===selected} aria-label={`${text.select}: ${result.title[lang]}`} onClick={()=>select(index)}>
            <Image unoptimized={result.after.startsWith("/api/media/")} src={result.after} alt="" fill sizes="(max-width: 760px) 100px, 160px"/>
          </button>)}
        </div>
        <div className="result-controls"><button onClick={()=>select(selected-1)} aria-label={text.previous}><ArrowLeft size={19}/></button><button onClick={()=>select(selected+1)} aria-label={text.next}><ArrowRight size={19}/></button></div>
      </div>
    </div>
  </div>;
}
