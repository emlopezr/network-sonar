import type { MonitorProviderSeed } from "../types/api";

export const monitorProviderCatalog: MonitorProviderSeed[] = [
  {
    target: "1.1.1.1",
    company: "Cloudflare",
    label: "Cloudflare Resolver 1.1.1.1"
  },
  {
    target: "1.0.0.1",
    company: "Cloudflare",
    label: "Cloudflare Resolver 1.0.0.1"
  },
  {
    target: "8.8.8.8",
    company: "Google",
    label: "Google Public DNS 8.8.8.8"
  },
  {
    target: "8.8.4.4",
    company: "Google",
    label: "Google Public DNS 8.8.4.4"
  },
  {
    target: "9.9.9.9",
    company: "Quad9",
    label: "Quad9 Secure DNS 9.9.9.9"
  },
  {
    target: "149.112.112.112",
    company: "Quad9",
    label: "Quad9 Secure DNS 149.112.112.112"
  },
  {
    target: "208.67.222.222",
    company: "OpenDNS",
    label: "OpenDNS Resolver 208.67.222.222"
  },
  {
    target: "208.67.220.220",
    company: "OpenDNS",
    label: "OpenDNS Resolver 208.67.220.220"
  }
];
