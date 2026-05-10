// Reusable avatar — shows photo if set, otherwise initials
export default function Avatar({ user, size = 40, fontSize = '.82rem', className = '', style = {} }) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const base = {
    width: size, height: size, borderRadius: '50%',
    flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,#5b2d8e,#c9a84c)',
    color: '#fff', fontWeight: 700, fontSize,
    ...style,
  };

  if (user?.avatar) {
    return (
      <div style={base} className={className}>
        <img src={user.avatar} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return <div style={base} className={className}>{initials}</div>;
}
