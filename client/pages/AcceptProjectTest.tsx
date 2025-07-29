import { useParams } from "react-router-dom";

export default function AcceptProjectTest() {
  console.log('🧪 AcceptProjectTest component loading...');
  
  const params = useParams();
  const { inviteToken } = params;
  
  console.log('📋 URL params:', params);
  console.log('🔑 Extracted inviteToken:', inviteToken);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">تست صفحه پذیرش پروژه</h1>
        <p className="text-gray-600 mb-2">Token: {inviteToken || 'وجود ندارد'}</p>
        <p className="text-gray-600">URL: {window.location.href}</p>
        <pre className="text-xs bg-gray-100 p-2 mt-4 rounded">
          {JSON.stringify(params, null, 2)}
        </pre>
      </div>
    </div>
  );
}
