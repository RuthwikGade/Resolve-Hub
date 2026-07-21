import { classNames } from '../../utils/helpers';

export default function Badge({ id, children, variant = 'primary', className, ...rest }) {
  return (
    <span
      id={id}
      className={classNames('badge', `badge-${variant}`, className)}
      {...rest}
    >
      {children}
    </span>
  );
}
