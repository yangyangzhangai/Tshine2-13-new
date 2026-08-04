// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> docs/PROJECT_MAP.md
import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const FROSTED_HEADER_STYLE: CSSProperties = {
  background: 'rgba(252,250,247,0.38)',
  backdropFilter: 'blur(14px) saturate(150%)',
  WebkitBackdropFilter: 'blur(14px) saturate(150%)',
};

export const Header = ({ className, style, ...props }: HTMLAttributes<HTMLElement>) => (
  <header
    className={cn('app-mobile-page-header', className)}
    style={{ ...FROSTED_HEADER_STYLE, ...style }}
    {...props}
  />
);
