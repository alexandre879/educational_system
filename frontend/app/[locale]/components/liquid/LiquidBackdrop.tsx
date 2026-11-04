/** The slowly drifting aurora behind every page; the glass surfaces blur and tint it. */
export default function LiquidBackdrop() {
  return (
    <div className="lg-backdrop" aria-hidden="true">
      <div className="lg-blob lg-blob-1" />
      <div className="lg-blob lg-blob-2" />
      <div className="lg-blob lg-blob-3" />
      <div className="lg-blob lg-blob-4" />
      <div className="lg-blob lg-blob-pointer" />
      <div className="lg-grain" />
      <div className="lg-vignette" />
    </div>
  );
}
