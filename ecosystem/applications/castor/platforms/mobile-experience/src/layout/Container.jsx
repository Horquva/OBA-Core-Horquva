import React from 'react';
import './layout.css';

/**
 * Container — constrains max-width, applies responsive horizontal padding, centers content.
 * Ref: specs/01-responsive-layout-infrastructure.md §3
 *
 * Never hard-code max-width/padding in feature components — compose with Container instead.
 */
export function Container({ as: Tag = 'div', fluid = false, className = '', children, ...rest }) {
  const classes = ['cx-container', fluid ? 'cx-container--fluid' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

export default Container;
