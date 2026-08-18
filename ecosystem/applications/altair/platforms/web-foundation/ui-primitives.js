export function Button({ variant = 'primary', disabled = false, loading = false, label, type = 'button' }) {
  return {
    variant,
    disabled,
    loading,
    label,
    type,
    accessibility: {
      role: 'button',
      focusVisible: true,
      ariaBusy: loading,
      ariaLabel: label || 'Action button'
    }
  };
}

export function InputField({ label, name, value, placeholder, required = false, variant = 'default', type = 'text' }) {
  return {
    label,
    name,
    value,
    placeholder,
    required,
    variant,
    type,
    accessibility: {
      label,
      role: 'textbox',
      required,
      focusVisible: true,
      ariaLabel: label || name || 'Input field'
    }
  };
}

export function EmptyState({ title, description, actionLabel, actionHandler }) {
  return {
    title,
    description,
    actionLabel,
    actionHandler,
    accessibility: {
      role: 'status',
      polite: true,
      ariaLabel: title || 'Empty state'
    }
  };
}

export function ErrorState({ title, message, retryLabel, retryHandler }) {
  return {
    title,
    message,
    retryLabel,
    retryHandler,
    accessibility: {
      role: 'alert',
      polite: false,
      ariaLabel: title || 'Error state'
    }
  };
}

export function SkeletonRow({ width = '100%', height = '1rem' }) {
  return {
    width,
    height,
    style: {
      display: 'block',
      background: '#eef3ff',
      borderRadius: '0.5rem',
      opacity: 0.8
    }
  };
}
