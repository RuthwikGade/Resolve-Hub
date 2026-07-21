import { classNames } from '../../utils/helpers';

export default function Button({
  id,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  type = 'button',
  className,
  onClick,
  ...rest
}) {
  const cls = classNames(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    className,
  );

  return (
    <button
      id={id}
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && <span className="btn-spinner" />}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      {children}
      {!loading && iconRight && <span className="btn-icon">{iconRight}</span>}
    </button>
  );
}
