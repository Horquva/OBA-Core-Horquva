import React from "react";

export function Button({ children, variant = "default", size = "md", icon: Icon, onClick, disabled, title, type = "button" }) {
  return (
    <button type={type} className={`btn v-${variant} s-${size}`} onClick={onClick} disabled={disabled} title={title}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
