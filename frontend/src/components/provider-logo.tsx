import { Server } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { MonitorProviderCompany } from "../types/monitor";

const providerLogoSources: Record<MonitorProviderCompany, string> = {
  Cloudflare: "/provider-logos/cloudflare.png",
  Google: "/provider-logos/google.png",
  Quad9: "/provider-logos/quad9.png",
  OpenDNS: "/provider-logos/opendns.png"
};

function DefaultProviderLogo() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" rx="24" fill="#10151d" />
      <path
        d="M24 35.5 48 21l24 14.5v25L48 75 24 60.5Zm24-5.1-14 8.4v18.3l14 8.4 14-8.4V38.8Z"
        fill="#8bb4ff"
      />
      <circle cx="48" cy="48" r="8.5" fill="#dce8ff" />
    </svg>
  );
}

function CustomProviderLogo() {
  return (
    <span className="provider-logo__custom-icon">
      <Server aria-hidden="true" strokeWidth={1.8} />
    </span>
  );
}

function ProviderBrandLogo({
  src,
  fallback
}: {
  src: string | null;
  fallback: ReactNode;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  if (!src || hasImageError) {
    return fallback;
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasImageError(true)}
    />
  );
}

export function ProviderLogo({
  company,
  logoUrl = null
}: {
  company: MonitorProviderCompany | null;
  logoUrl?: string | null;
}) {
  const source = logoUrl ?? (company ? providerLogoSources[company] : null);
  const variant = company ? company.toLowerCase() : "custom";
  const fallback = company ? <DefaultProviderLogo /> : <CustomProviderLogo />;

  return (
    <span className={`provider-logo provider-logo--${variant}`} aria-hidden="true">
      <ProviderBrandLogo src={source} fallback={fallback} />
    </span>
  );
}
