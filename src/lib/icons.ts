/**
 * Curated icon registry for product attributes.
 *
 * Why a registry instead of dynamic imports?
 * - Stable serialization: we store just the icon name string in JSON.
 * - Tree-shakeable: only these icons end up in the bundle.
 * - Localized labels for the picker.
 */
import {
  Weight,
  Ruler,
  Zap,
  Battery,
  Plug,
  Activity,
  Shield,
  ShieldCheck,
  Clock,
  Gauge,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Cloud,
  Volume2,
  Lightbulb,
  Radio,
  Wifi,
  Bluetooth,
  Lock,
  Key,
  Cpu,
  Cog,
  Wrench,
  Cable,
  Box,
  Package,
  HardDrive,
  Hash,
  Tag,
  Star,
  Award,
  CheckCircle2,
  Settings,
  Sliders,
} from "lucide-react";

export type IconEntry = {
  name: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const ICON_REGISTRY: Record<string, IconEntry> = {
  Weight: { name: "Weight", label: "Masa", icon: Weight },
  Ruler: { name: "Ruler", label: "Długość", icon: Ruler },
  Zap: { name: "Zap", label: "Moc / energia", icon: Zap },
  Battery: { name: "Battery", label: "Akumulator", icon: Battery },
  Plug: { name: "Plug", label: "Zasilanie", icon: Plug },
  Activity: { name: "Activity", label: "Intensywność", icon: Activity },
  Shield: { name: "Shield", label: "Ochrona", icon: Shield },
  ShieldCheck: { name: "ShieldCheck", label: "Klasa IP", icon: ShieldCheck },
  Clock: { name: "Clock", label: "Czas", icon: Clock },
  Gauge: { name: "Gauge", label: "Prędkość", icon: Gauge },
  Thermometer: { name: "Thermometer", label: "Temperatura", icon: Thermometer },
  Droplets: { name: "Droplets", label: "Wodoodporność", icon: Droplets },
  Sun: { name: "Sun", label: "Słońce / UV", icon: Sun },
  Wind: { name: "Wind", label: "Wiatr", icon: Wind },
  Cloud: { name: "Cloud", label: "Pogoda", icon: Cloud },
  Volume2: { name: "Volume2", label: "Hałas / dźwięk", icon: Volume2 },
  Lightbulb: { name: "Lightbulb", label: "Oświetlenie", icon: Lightbulb },
  Radio: { name: "Radio", label: "Pilot / radio", icon: Radio },
  Wifi: { name: "Wifi", label: "Wi-Fi", icon: Wifi },
  Bluetooth: { name: "Bluetooth", label: "Bluetooth", icon: Bluetooth },
  Lock: { name: "Lock", label: "Zamek", icon: Lock },
  Key: { name: "Key", label: "Klucz", icon: Key },
  Cpu: { name: "Cpu", label: "Sterownik", icon: Cpu },
  Cog: { name: "Cog", label: "Mechanika", icon: Cog },
  Wrench: { name: "Wrench", label: "Montaż", icon: Wrench },
  Cable: { name: "Cable", label: "Okablowanie", icon: Cable },
  Box: { name: "Box", label: "Obudowa", icon: Box },
  Package: { name: "Package", label: "Zestaw", icon: Package },
  HardDrive: { name: "HardDrive", label: "Pamięć", icon: HardDrive },
  Hash: { name: "Hash", label: "Liczba", icon: Hash },
  Tag: { name: "Tag", label: "Etykieta", icon: Tag },
  Star: { name: "Star", label: "Wyróżnione", icon: Star },
  Award: { name: "Award", label: "Gwarancja", icon: Award },
  CheckCircle2: { name: "CheckCircle2", label: "W komplecie", icon: CheckCircle2 },
  Settings: { name: "Settings", label: "Ustawienia", icon: Settings },
  Sliders: { name: "Sliders", label: "Konfiguracja", icon: Sliders },
};

export const ICON_LIST: IconEntry[] = Object.values(ICON_REGISTRY);

/** Lookup icon component by stored name. Returns null if unknown. */
export function iconByName(name: string | null | undefined): React.ComponentType<{
  className?: string;
}> | null {
  if (!name) return null;
  return ICON_REGISTRY[name]?.icon ?? null;
}
