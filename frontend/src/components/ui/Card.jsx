import { classNames } from '../../utils/helpers';

export default function Card({
  id,
  children,
  header,
  headerAction,
  className,
  noHover = false,
  onClick,
  style,
  ...rest
}) {
  return (
    <div
      id={id}
      className={classNames('glass-card', noHover && 'no-hover', className)}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {header && (
        <div className="glass-card-header">
          <h3 className="glass-card-title">{header}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
