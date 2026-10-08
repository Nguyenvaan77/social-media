export default function Avatar({
  person,
  size = 'md',
  online = false,
  className = '',
}) {
  const initials =
    person?.initials ||
    person?.name
      ?.split(' ')
      .map((part) => part[0])
      .slice(-2)
      .join('') ||
    '?'
  return (
    <span
      className={`avatar avatar--${size} avatar--${person?.color || 'blue'} ${className}`}
      aria-label={person?.name || 'Người dùng'}
    >
      {initials}
      {online && <span className="avatar__online" />}
    </span>
  )
}
