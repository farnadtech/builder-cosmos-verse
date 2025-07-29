export default function AcceptProjectMinimal() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'red',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      zIndex: 9999
    }}>
      AcceptProject Minimal Test - Route Works!
      <div style={{ position: 'absolute', top: '20px', left: '20px', fontSize: '16px' }}>
        URL: {window.location.href}
      </div>
    </div>
  );
}
