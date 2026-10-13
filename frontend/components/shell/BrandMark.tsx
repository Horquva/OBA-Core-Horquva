import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

/** The mark trimmed to its edges (350×345, transparent): width follows height. */
const RATIO = 350 / 345;

/**
 * The Horquva bronze ribbon mark (the same file as horquva.com). Decorative: always
 * sits next to the Horquva / OBA name or inside a labelled control.
 */
export function BrandMark({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={Math.round(height * RATIO)}
      height={height}
      className={cn('shrink-0 select-none object-contain', className)}
      draggable={false}
      priority
    />
  );
}
