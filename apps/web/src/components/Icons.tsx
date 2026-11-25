type IconProps = { size?: number };

export function IconSearch({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconAccount({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 19.5c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconBag({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 8h11l-.7 11.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6.5 8Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9 8V6.8A3 3 0 0 1 12 3.8 3 3 0 0 1 15 6.8V8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconHeart({ filled = false, size = 16 }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 19.2s-6.4-3.9-6.4-8.2A3.4 3.4 0 0 1 12 8.2a3.4 3.4 0 0 1 6.4 2.8c0 4.3-6.4 8.2-6.4 8.2Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
