export default function AcceptProjectTest() {
  // Minimal component with no hooks to test if routing works at all
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '32px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          تست صفحه پذیرش پروژه
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '8px' }}>
          URL: {window.location.href}
        </p>
        <p style={{ color: '#6b7280' }}>
          صفحه با موفقیت بارگذاری شد
        </p>
      </div>
    </div>
  );
}
