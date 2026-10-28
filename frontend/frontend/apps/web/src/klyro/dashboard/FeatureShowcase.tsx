import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { KlyroMark } from "../shell/KlyroLogo"
import { FEATURE_ART } from "./featureShowcaseArt"
import { createFeatureRotation, FEATURE_DURATION, type FeatureRotationState } from "./featureRotation"
import "./featureShowcase.css"

// Amends v12: News / Updates. `status` is the single source of truth for what is shipped.
// Only "available" slides describe current behaviour; "planned" slides are roadmap items.
type FeatureStatus = "available" | "planned"
type Feature = { id: keyof typeof FEATURE_ART; name: string; status: FeatureStatus; title: string; accent: string; text: string; action?: { label: string; href: string } }
const features: readonly Feature[] = [
  { id: "workflow", name: "How it works", status: "available", title: "From brief to release, one clear path.", accent: "clear", text: "Define the pack, engineer it in Cutter Studio with exact millimetre geometry, check it in Validation Centre, then export a PDF proof, editable or Illustrator-compatible SVG, or project JSON.", action: { label: "Open Cutter Studio", href: "/cutter" } },
  { id: "sandbox", name: "Sandbox Mode", status: "available", title: "Room for trials and bespoke work.", accent: "bespoke", text: "Sandbox Mode in Cutter Studio lets you set your own dimensions and construction for trials and bespoke projects. Save the result as a custom cutter and import it again later as JSON.", action: { label: "Try Sandbox Mode", href: "/cutter?studio=start" } },
  { id: "legends", name: "Legends", status: "planned", title: "Make every guide unmistakably yours.", accent: "yours.", text: "Planned: job-specific legend templates with dates, customers, dimensions, eyemark keys, disclaimers and your logo, placed in Cutter Studio and carried into exports. Legend styling is not available yet." },
  { id: "artwork", name: "Artwork", status: "planned", title: "Brand-led artwork, built on the cutter.", accent: "artwork,", text: "Planned for Artwork Studio: place brand assets on cutter geometry, build colour palettes, run preflight and produce reliable print proofs. Explore the interactive preview to see where it is heading.", action: { label: "See the Artwork preview", href: "/artwork" } },
  { id: "upcoming", name: "Roadmap", status: "planned", title: "What’s next for Klyro.", accent: "next", text: "Planned: Lidding and 3 Side Pouch pack types, saved preferences and presets, a brand asset library, and Vector PDF, DXF, native Illustrator and repro-ready exports. None of these are released yet." },
]
const STATUS_LABEL: Record<FeatureStatus, string> = { available: "Available now", planned: "Coming soon" }

export function FeatureShowcase() {
  const root = useRef<HTMLElement>(null)
  const rotation = useRef<ReturnType<typeof createFeatureRotation> | null>(null)
  const [state, setState] = useState<FeatureRotationState>({ index: 0, duration: FEATURE_DURATION, playing: false, cycle: 0 })
  useEffect(() => {
    const element = root.current!
    const controller = createFeatureRotation(features.length, setState, {
      now: () => performance.now(),
      set: (callback, delay) => window.setTimeout(callback, delay),
      clear: id => window.clearTimeout(id),
    })
    rotation.current = controller
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMotion = () => controller.pause("motion", motion.matches)
    const onVisibility = () => controller.pause("hidden", document.hidden)
    const scrollHost=element.closest(".klyro-main")
    let scrollTimer:number|undefined
    const onScroll=()=>{
      controller.pause("scroll",true)
      window.clearTimeout(scrollTimer)
      scrollTimer=window.setTimeout(()=>controller.pause("scroll",false),180)
    }
    scrollHost?.addEventListener("scroll",onScroll,{passive:true})
    onMotion()
    onVisibility()
    // Detect focus/pointer already inside when mounted, not just future events.
    controller.pause("pointer", element.matches(":hover"))
    controller.pause("focus", element.contains(document.activeElement))
    const observer = new IntersectionObserver(([entry]) => controller.pause("offscreen", !entry.isIntersecting || entry.intersectionRatio < .25), { threshold: .25 })
    observer.observe(element)
    document.addEventListener("visibilitychange", onVisibility)
    motion.addEventListener("change", onMotion)
    return () => {
      controller.dispose()
      window.clearTimeout(scrollTimer)
      scrollHost?.removeEventListener("scroll",onScroll)
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      motion.removeEventListener("change", onMotion)
      rotation.current = null
    }
  }, [])
  const select = (position: number) => rotation.current?.select(position)
  return (
    <section ref={root} className="klyro-feature-showcase" aria-roledescription="carousel" aria-label="Klyro news and updates"
      style={{ "--feature-duration": `${state.duration}ms` } as CSSProperties}
      data-playing={state.playing} tabIndex={0}
      onMouseEnter={() => rotation.current?.pause("pointer", true)}
      onMouseLeave={() => rotation.current?.pause("pointer", false)}
      onFocusCapture={() => rotation.current?.pause("focus", true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) rotation.current?.pause("focus", false) }}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault()
          rotation.current?.step(event.key === "ArrowRight" ? 1 : -1)
        }
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault()
          select(event.key === "Home" ? 0 : features.length - 1)
        }
      }}>
      <div className="klyro-feature-brand"><KlyroMark /><span>News &amp; updates<small>What’s live in Klyro today, and what’s coming</small></span></div>
      <div className="klyro-feature-slides" aria-live={state.playing ? "off" : "polite"}>
        {features.map((feature, position) => (
          <article key={feature.id} id={`klyro-feature-${feature.id}`} className={`klyro-feature-slide${state.index === position ? " is-active" : ""}`}
            aria-roledescription="slide" aria-label={`${position + 1} of ${features.length}: ${feature.name}, ${STATUS_LABEL[feature.status]}`} aria-hidden={state.index !== position}>
            <div className="klyro-feature-copy" key={state.index === position ? state.cycle : feature.id}>
              <div className="klyro-feature-eyebrow">
                <span className={`klyro-feature-status is-${feature.status}`}>{STATUS_LABEL[feature.status]}</span>
                {feature.name} · {position + 1} of {features.length}
              </div>
              <h2 className="klyro-feature-headline">{feature.title.split(" ").map((word, i) => (
                <span className={`w${word === feature.accent ? " accent" : ""}`} key={i} style={{ "--i": i } as CSSProperties}>{word}{" "}</span>
              ))}</h2>
              <p className="klyro-feature-body">{feature.text}</p>
              {feature.action && (
                <a className="klyro-feature-action" href={feature.action.href} tabIndex={state.index === position ? undefined : -1}>
                  {feature.action.label} <ArrowRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
            {/* Trusted, static SVG adapted from the supplied concept; no scripts or external assets. */}
            <div className="klyro-feature-art" dangerouslySetInnerHTML={{ __html: FEATURE_ART[feature.id] }} />
          </article>
        ))}
      </div>
      <div className="klyro-feature-controls">
        <button type="button" className="klyro-feature-arrow" aria-label="Previous feature" onClick={() => rotation.current?.step(-1)}><ArrowLeft size={17} aria-hidden="true" /></button>
        <div className="klyro-feature-tabs" role="group" aria-label="Choose a feature">
          {features.map((feature, position) => (
            <button type="button" key={feature.id} aria-controls={`klyro-feature-${feature.id}`}
              aria-current={state.index === position ? "true" : undefined}
              aria-label={`${feature.name} (${STATUS_LABEL[feature.status]})`}
              data-status={feature.status}
              onClick={() => select(position)}>{feature.name}{state.index === position && <span key={state.cycle} className="klyro-feature-progress" aria-hidden="true" />}</button>
          ))}
        </div>
        <button type="button" className="klyro-feature-arrow" aria-label="Next feature" onClick={() => rotation.current?.step(1)}><ArrowRight size={17} aria-hidden="true" /></button>
      </div>
    </section>
  )
}
