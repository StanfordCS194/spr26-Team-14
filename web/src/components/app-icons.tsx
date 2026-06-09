import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function CaretDownIcon(props: IconProps) {
  return <Icon {...props}><path d="m6 9 6 6 6-6" /></Icon>;
}

export function BinocularsIcon(props: IconProps) {
  return <Icon {...props}><path d="M7 6h3l1 4" /><path d="M17 6h-3l-1 4" /><path d="M5 11h14" /><circle cx="7" cy="15" r="3" /><circle cx="17" cy="15" r="3" /></Icon>;
}

export function BuildingsIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 21V5l8-2v18" /><path d="M12 9h8v12" /><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" /></Icon>;
}

export function ChartLineUpIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 19h16" /><path d="M5 15l4-4 3 3 7-8" /><path d="M15 6h4v4" /></Icon>;
}

export function CheckCircleIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.2 2.2 4.8-5.2" /></Icon>;
}

export function GearSixIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></Icon>;
}

export function LightbulbIcon(props: IconProps) {
  return <Icon {...props}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8 14a6 6 0 1 1 8 0c-.8.7-1 1.5-1 2H9c0-.5-.2-1.3-1-2Z" /></Icon>;
}

export function LinkSimpleIcon(props: IconProps) {
  return <Icon {...props}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 1 0 7.1 7.1l1.1-1.1" /></Icon>;
}

export function PlusIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
}

export function PlusCircleIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Icon>;
}

export function PlayIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 5v14l11-7-11-7Z" /></Icon>;
}

export function ShieldCheckIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 3 5 6v5c0 4.5 2.9 8.4 7 10 4.1-1.6 7-5.5 7-10V6l-7-3Z" /><path d="m8.8 12.2 2 2 4.4-4.6" /></Icon>;
}

export function ThumbsDownIcon(props: IconProps) {
  return <Icon {...props}><path d="M7 3v11" /><path d="M7 14H4a2 2 0 0 1-2-2v-1l2-6a3 3 0 0 1 3-2h8.5a2 2 0 0 1 2 1.7l1 6A2 2 0 0 1 16.5 13H14l.5 4a3 3 0 0 1-3 4L7 14Z" /></Icon>;
}

export function ThumbsUpIcon(props: IconProps) {
  return <Icon {...props}><path d="M7 21V10" /><path d="M7 10h3l-.5-4a3 3 0 0 1 3-4l4.5 7h3a2 2 0 0 1 2 2v1l-2 6a3 3 0 0 1-3 2H7Z" /></Icon>;
}

export function TrophyIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 5" /><path d="M16 6h3a3 3 0 0 1-3 5" /><path d="M12 13v4M9 21h6M8 17h8" /></Icon>;
}
