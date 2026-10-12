// The OrbLit mark, same artwork as the favicon (public/orblit_favicon.svg).
// clipRight keeps only the left portion of the square, so the empty black
// padding to the right of the orbit can be dropped and the wordmark can
// sit next to the mark.
export default function OrbitIcon({ size = 22, clipRight = 1 }) {
  const img = (
    <img
      src="/orblit_favicon.svg"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, maxWidth: "none", display: "block" }}
      aria-hidden="true"
    />
  );
  if (clipRight >= 1) return img;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        width: size * clipRight,
        height: size,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {img}
    </span>
  );
}
