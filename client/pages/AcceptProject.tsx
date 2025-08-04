import { useParams } from "react-router-dom";

export default function AcceptProject() {
  const params = useParams();
  
  console.log("🚀 AcceptProject component rendered!");
  console.log("🚀 URL params:", params);
  
  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      minHeight: '100vh',
      color: 'black',
      fontSize: '24px'
    }}>
      <h1>AcceptProject Component Loaded!</h1>
      <p>Invite Token: {params.inviteToken}</p>
      <p>All params: {JSON.stringify(params)}</p>
      <p>Testing component rendering...</p>
    </div>
  );
}
