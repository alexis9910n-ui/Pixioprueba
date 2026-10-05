import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import * as Icons from 'lucide-react';

export type IconComponent = ComponentType<LucideProps>;

const iconMap = Icons as unknown as Record<string, IconComponent>;

export function getIcon(name: string): IconComponent {
  return iconMap[name] || iconMap.Hammer || iconMap.Square;
}
