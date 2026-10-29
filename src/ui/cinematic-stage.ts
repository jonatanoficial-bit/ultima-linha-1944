/** Keep the last decoded frame while the next image loads, including on slow connections. */
export class CinematicStage {
  readonly element = document.createElement("div");
  private revision = 0;
  private current = "";
  private requested = "";
  private images = new Map<string, Promise<HTMLImageElement>>();
  constructor() { this.element.className = "cinematic-stage"; }
  private load(url: string) {
    let pending = this.images.get(url);
    if (!pending) {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      pending = image.decode().then(() => image).catch(error => { this.images.delete(url); throw error; });
      this.images.set(url, pending);
    }
    return pending;
  }
  async show(url: string, alt: string, ready: (ok: boolean) => void) {
    const revision = ++this.revision;
    this.requested = url;
    if (this.current === url) { ready(true); return; }
    try {
      const loaded = await this.load(url);
      if (revision !== this.revision) return;
      const image = loaded.cloneNode() as HTMLImageElement;
      image.alt = alt;
      image.className = "cinematic-image";
      const previous = this.element.querySelectorAll("img");
      this.element.append(image);
      for (const old of previous) old.setAttribute("aria-hidden", "true");
      // Only remove the captured old frames; a later transition owns its new frame.
      window.setTimeout(() => previous.forEach(old => old.remove()), 950);
      this.current = url;
      ready(true);
    } catch { if (revision === this.revision) ready(false); }
  }
  prefetch(url?: string) { if (url && url !== this.requested) void this.load(url).catch(() => {}); }
  leave() { ++this.revision; }
}
