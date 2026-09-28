import Image from "next/image";

// The OrbLit mark — same asset as the favicon/apple-icon
// (src/app/icon.png, apple-icon.png), used inline wherever the wordmark
// needs a logo glyph in front of it.
export default function OrbitIcon({ size = 22 }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
      aria-hidden="true"
      priority
    />
  );
}
