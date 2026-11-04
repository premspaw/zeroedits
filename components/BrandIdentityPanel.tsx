"use client";

import { useState } from "react";
import { ArrowUpRight, Globe2, LoaderCircle, Palette, Type } from "lucide-react";
import { useZeeBrain } from "@/lib/zee-brain";

export default function BrandIdentityPanel() {
  const { brain, updateBrain } = useZeeBrain();
  const profile = brain.brandProfile;
  const [isReadingSite, setIsReadingSite] = useState(false);
  const [siteMessage, setSiteMessage] = useState("");

  const patchProfile = (patch: Partial<typeof profile>) => {
    updateBrain((previous) => ({
      ...previous,
      brandProfile: { ...previous.brandProfile, ...patch },
    }));
  };

  const readWebsite = async () => {
    if (!profile.websiteUrl.trim() || isReadingSite) return;
    setIsReadingSite(true);
    setSiteMessage("");
    try {
      const response = await fetch("/api/you/brand-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: profile.websiteUrl.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "I couldn’t read that website. Check the link and try again.");
      }
      patchProfile({
        websiteUrl: payload.data.websiteUrl,
        name: payload.data.name || profile.name,
        description: payload.data.description || profile.description,
        colors: payload.data.colors?.length ? payload.data.colors.slice(0, 5) : profile.colors,
        fonts: payload.data.fonts?.length ? payload.data.fonts.slice(0, 4) : profile.fonts,
        keywords: payload.data.keywords || [],
        pageTitle: payload.data.pageTitle || "",
        pageHeadings: payload.data.pageHeadings || [],
        analyzedAt: payload.data.analyzedAt,
      });
      setSiteMessage(`Read ${payload.data.pageHeadings?.length || 0} page headings and found ${payload.data.colors?.length || 0} brand colors.`);
    } catch (error: any) {
      setSiteMessage(error?.message || "Website analysis failed.");
    } finally {
      setIsReadingSite(false);
    }
  };

  const updateColor = (index: number, color: string) => {
    const colors = [...(profile.colors || [])];
    colors[index] = color.toUpperCase();
    patchProfile({ colors });
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e8e1d7] bg-[#fffdfa] shadow-[0_18px_55px_rgba(44,35,25,0.07)]">
      <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative overflow-hidden bg-[#20211d] p-6 text-[#f6f1e9] sm:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#e76b45]/25 blur-3xl" />
          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.17em] text-white/75">
              <Palette size={13} className="text-[#f0b36f]" /> Your brand, in the mix
            </div>
            <h2 className="max-w-md font-serif text-3xl leading-[1.08] sm:text-[40px]">
              Make every story feel like it came from you.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Add your site or set the details yourself. Your colors, type, language, and real memories will travel with you into Script.
            </p>
            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/60">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10"><ArrowUpRight size={15} /></span>
              <span>{profile.websiteUrl ? `Inspired by ${profile.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "Private to this creative workspace"}</span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 lg:p-8">
          <label htmlFor="brand-website" className="text-xs font-semibold text-[#25231f]">Website</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Globe2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#837b70]" />
              <input
                id="brand-website"
                type="url"
                value={profile.websiteUrl}
                onChange={(event) => patchProfile({ websiteUrl: event.target.value })}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void readWebsite(); } }}
                placeholder="https://yourwebsite.com"
                className="h-11 w-full rounded-xl border border-[#e6dfd4] bg-[#fbf9f5] pl-10 pr-3 text-sm text-[#292722] outline-none transition focus:border-[#a6573d] focus:ring-2 focus:ring-[#a6573d]/10"
              />
            </div>
            <button
              type="button"
              onClick={() => void readWebsite()}
              disabled={isReadingSite || !profile.websiteUrl.trim()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#a6573d] px-4 text-xs font-semibold text-white transition hover:bg-[#8f4933] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReadingSite ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
              {isReadingSite ? "Reading site" : "Read my site"}
            </button>
          </div>
          {siteMessage && <p aria-live="polite" className="mt-2 text-xs text-[#746d63]">{siteMessage}</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#25231f]">Brand / studio name
              <input value={profile.name} onChange={(event) => patchProfile({ name: event.target.value })} placeholder="Name your creative world" className="mt-2 h-10 w-full rounded-xl border border-[#e6dfd4] bg-white px-3 text-sm font-normal outline-none focus:border-[#a6573d]" />
            </label>
            <label className="text-xs font-semibold text-[#25231f]">Type style
              <div className="relative mt-2">
                <Type size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#837b70]" />
                <input value={(profile.fonts || []).join(", ")} onChange={(event) => patchProfile({ fonts: event.target.value.split(",").map((font) => font.trim()).filter(Boolean) })} placeholder="Inter, Instrument Serif" className="h-10 w-full rounded-xl border border-[#e6dfd4] bg-white pl-9 pr-3 text-sm font-normal outline-none focus:border-[#a6573d]" />
              </div>
            </label>
          </div>

          <label className="mt-4 block text-xs font-semibold text-[#25231f]">What should your brand sound like?
            <textarea value={profile.voiceNotes} onChange={(event) => patchProfile({ voiceNotes: event.target.value })} rows={2} placeholder="Warm and candid, precise but never corporate…" className="mt-2 w-full resize-y rounded-xl border border-[#e6dfd4] bg-white px-3 py-2.5 text-sm font-normal leading-5 outline-none focus:border-[#a6573d]" />
          </label>

          <details className="mt-5 rounded-2xl border border-[#e8e1d7] bg-[#faf8f4] p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[#423a32]">Brand dynamics and what Zee should learn</summary>
            <p className="mt-1.5 text-[10px] leading-4 text-[#82796f]">These details help Zee understand who you serve, what you stand for, and how to shape each story.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-semibold text-[#51483e]">Who do you want to reach?
                <textarea rows={2} value={profile.audience} onChange={(event) => patchProfile({ audience: event.target.value })} placeholder="People building their first product, independent creators..." className="mt-1.5 w-full resize-y rounded-xl border border-[#e6dfd4] bg-white px-3 py-2 text-xs font-normal leading-5 outline-none focus:border-[#a6573d]" />
              </label>
              <label className="text-[10px] font-semibold text-[#51483e]">What change do you help them make?
                <textarea rows={2} value={profile.brandPromise} onChange={(event) => patchProfile({ brandPromise: event.target.value })} placeholder="The result your work or content helps people reach..." className="mt-1.5 w-full resize-y rounded-xl border border-[#e6dfd4] bg-white px-3 py-2 text-xs font-normal leading-5 outline-none focus:border-[#a6573d]" />
              </label>
              <label className="text-[10px] font-semibold text-[#51483e]">What is distinctive about your point of view?
                <textarea rows={2} value={profile.differentiator} onChange={(event) => patchProfile({ differentiator: event.target.value })} placeholder="Experience, approach, belief, or lived perspective..." className="mt-1.5 w-full resize-y rounded-xl border border-[#e6dfd4] bg-white px-3 py-2 text-xs font-normal leading-5 outline-none focus:border-[#a6573d]" />
              </label>
              <label className="text-[10px] font-semibold text-[#51483e]">What are you building or documenting now?
                <textarea rows={2} value={profile.creativeGoals} onChange={(event) => patchProfile({ creativeGoals: event.target.value })} placeholder="Current work, a personal chapter, a series, or a long-term goal..." className="mt-1.5 w-full resize-y rounded-xl border border-[#e6dfd4] bg-white px-3 py-2 text-xs font-normal leading-5 outline-none focus:border-[#a6573d]" />
              </label>
              <label className="text-[10px] font-semibold text-[#51483e]">Recurring themes
                <input value={profile.contentPillars} onChange={(event) => patchProfile({ contentPillars: event.target.value })} placeholder="Craft, family, lessons, behind the scenes..." className="mt-1.5 h-10 w-full rounded-xl border border-[#e6dfd4] bg-white px-3 text-xs font-normal outline-none focus:border-[#a6573d]" />
              </label>
              <label className="text-[10px] font-semibold text-[#51483e]">Boundaries and things to avoid
                <input value={profile.boundaries} onChange={(event) => patchProfile({ boundaries: event.target.value })} placeholder="Topics, claims, or wording Zee should not use..." className="mt-1.5 h-10 w-full rounded-xl border border-[#e6dfd4] bg-white px-3 text-xs font-normal outline-none focus:border-[#a6573d]" />
              </label>
            </div>
          </details>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#25231f]">Brand colors</span>
              <span className="text-[10px] text-[#8b8378]">Tap a swatch to fine-tune</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {(profile.colors?.length ? profile.colors : ["#A6573D", "#20211D", "#F5F1E8"]).slice(0, 5).map((color, index) => (
                <label key={`${index}-${color}`} className="group flex items-center gap-2 rounded-xl border border-[#e8e1d7] bg-white p-1.5 pr-3 transition hover:border-[#c8b4a2]">
                  <input aria-label={`Brand color ${index + 1}`} type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#a6573d"} onChange={(event) => updateColor(index, event.target.value)} className="h-8 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                  <span className="font-mono text-[10px] uppercase text-[#5d574f]">{color}</span>
                </label>
              ))}
            </div>
          </div>

          {(profile.description || profile.keywords?.length || profile.pageHeadings?.length) ? (
            <div className="mt-5 rounded-2xl border border-[#eee7dd] bg-[#faf7f1] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a5d42]">Website notes</div>
              {profile.description && <p className="mt-2 text-xs leading-5 text-[#5d574f]">{profile.description}</p>}
              {!!profile.keywords?.length && <div className="mt-3 flex flex-wrap gap-1.5">{profile.keywords.slice(0, 8).map((word) => <span key={word} className="rounded-full bg-white px-2.5 py-1 text-[10px] text-[#726a60]">{word}</span>)}</div>}
            </div>
          ) : null}
          <p className="mt-4 text-[10px] leading-4 text-[#968e83]">Site reading is used to suggest brand language and visual style. You can edit every field before using it.</p>
        </div>
      </div>
    </section>
  );
}
