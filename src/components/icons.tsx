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
