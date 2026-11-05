type IconProps = { className?: string };

export function CheckIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5 9.2 17 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7l10 10M17 7 7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MenuIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function PencilIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.5L16.5 5a1.8 1.8 0 0 0-2.5 0L4 15.5V20z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CoffeeIcon({ className = "coffee-icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden="true">
      <g transform="rotate(-22 17 20)">
        <ellipse cx="15.5" cy="27.2" rx="9.2" ry="2.1" fill="#f2c14e" />
        <path d="M6.4 12.2h14.6v8.2a4.8 4.8 0 0 1-4.8 4.8h-5a4.8 4.8 0 0 1-4.8-4.8v-8.2z" fill="#ef6f4d" />
        <path d="M7.6 14.6h12.2" fill="none" stroke="#ffd7a8" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M8.4 16.6c2.4 1 4.4.2 6.6 1 1.8.6 3.2.2 4.8-.4"
          fill="none"
          stroke="#7a3418"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12.4 20.2c0-.9 1.5-1.4 1.5-.2 0-1.2 1.5-.7 1.5.2 0 1.2-1.5 2.2-1.5 2.2s-1.5-1-1.5-2.2z"
          fill="#fff6ea"
        />
        <path
          d="M21 14.4h2.3a3.1 3.1 0 0 1 0 6.2H21"
          fill="none"
          stroke="#2aa9a1"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path d="M11.2 9.4c1.1-1.3 1.1-2.1 0-3.2" fill="none" stroke="#f2c14e" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15.8 8.8c1.1-1.3 1.1-2.1 0-3.2" fill="none" stroke="#7a5cff" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function DollarIcon({ className = "dollar-icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 20" aria-hidden="true">
      <rect x="1" y="1" width="30" height="18" rx="2.2" fill="#1f8a4c" stroke="#0d5a30" strokeWidth="1.2" />
      <circle cx="16" cy="10" r="5.1" fill="none" stroke="#e7ffef" strokeWidth="1.3" />
      <path
        d="M16 6.1v7.8M14.2 8c.4-.7 1.1-1 2-1 1.2 0 1.9.5 1.9 1.35 0 .85-.7 1.2-2 1.55-1.35.35-2.1.75-2.1 1.7 0 .9.85 1.5 2 1.5 1 0 1.7-.35 2.1-1"
        fill="none"
        stroke="#e7ffef"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 13.2V3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7.2 12 3.2l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7 10.2H6.2A1.8 1.8 0 0 0 4.4 12v6.4A1.8 1.8 0 0 0 6.2 20.2h11.6a1.8 1.8 0 0 0 1.8-1.8V12a1.8 1.8 0 0 0-1.8-1.8H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ContrastIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" fill="#ffffff" stroke="#14202b" strokeWidth="1.4" />
      <path d="M12 3.6a8.4 8.4 0 0 0 0 16.8z" fill="#14202b" />
    </svg>
  );
}

export function InfoIcon({ className = "info-icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#1a73c7" />
      <circle cx="10" cy="6.15" r="1.15" fill="#ffffff" />
      <rect x="9.05" y="8.35" width="1.9" height="6.15" rx="0.95" fill="#ffffff" />
    </svg>
  );
}

export function AlertIcon({ className = "icon" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8v5M12 16.5h.01M4.5 19h15L12 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
