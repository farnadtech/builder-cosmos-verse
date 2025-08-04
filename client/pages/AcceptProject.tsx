export default function AcceptProject() {
  return (
    <div style={{
      padding: '50px',
      textAlign: 'center',
      backgroundColor: '#f0f8ff',
      minHeight: '100vh',
      fontSize: '24px',
      color: '#333'
    }}>
      <h1 style={{ color: 'red', fontSize: '48px' }}>✅ AcceptProject کامپوننت کار می‌کند!</h1>
      <p style={{ marginTop: '30px', fontSize: '20px' }}>
        اگر این متن را می‌بینید، یعنی کامپوننت AcceptProject با موفقیت لود شده است.
      </p>
      <div style={{ 
        backgroundColor: 'yellow', 
        padding: '20px', 
        margin: '20px',
        border: '2px solid red',
        borderRadius: '10px'
      }}>
        <p>این یک تست ساده است</p>
        <p>URL Current: {window.location.pathname}</p>
      </div>
    </div>
  );
}
