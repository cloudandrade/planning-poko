export function SiteFooter() {
  return (
    <footer
      className="text-center py-2 px-2 flex-shrink-0"
      style={{
        fontFamily: 'inherit',
        color: 'rgba(255, 255, 255, 0.26)',
        backgroundColor: 'var(--dark)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        letterSpacing: '0.01em',
      }}
    >
      <div style={{ fontSize: '10px', lineHeight: 1.35 }}>
        Desenvolvido por Jan ☁️ Andrade
      </div>
      <div
        style={{
          fontSize: '8px',
          lineHeight: 1.35,
          marginTop: '2px',
          opacity: 0.9,
        }}
      >
        All rights reserved.
      </div>
    </footer>
  );
}
