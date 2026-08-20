import React from "react";

export default function Logo({ size = 34 }) {
  return (
    <img
      src="/icon.png"
      width={size}
      height={size}
      alt="Alicerce Renatosx"
      style={{ borderRadius: size * 0.22, objectFit: "cover", display: "block" }}
    />
  );
}
