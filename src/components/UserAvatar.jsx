const UserAvatar = ({ url, nombre, size = 28, accent = '#00e5ff' }) => {
  const initial = nombre?.charAt(0)?.toUpperCase() ?? '?';
  const style   = { width: size, height: size, minWidth: size };

  if (url) {
    return (
      <img
        src={url}
        alt={nombre ?? ''}
        className="rounded-full object-cover shrink-0"
        style={{ ...style, border: `1px solid ${accent}33` }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{
        ...style,
        background: `${accent}18`,
        border: `1px solid ${accent}33`,
        color: accent,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initial}
    </div>
  );
};

export default UserAvatar;
