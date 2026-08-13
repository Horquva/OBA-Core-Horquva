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
      ariaBusy: loading
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
      focusVisible: true
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
      polite: true
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
      polite: false
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
