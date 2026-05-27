export default function Privacy() {
  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: May 2026</p>
      
      <h2>Data We Collect</h2>
      <p>We collect business email addresses, employee phone numbers, and task information provided by employers using this platform.</p>
      
      <h2>How We Use Data</h2>
      <p>Data is used solely to deliver task notifications via WhatsApp and track task completion status.</p>
      
      <h2>Data Storage</h2>
      <p>All data is stored securely using Supabase (PostgreSQL). We do not sell or share your data with third parties.</p>
      
      <h2>WhatsApp Messaging</h2>
      <p>We use Meta WhatsApp Business API to send task notifications. Message delivery is subject to Meta's terms of service.</p>
      
      <h2>Contact</h2>
      <p>For privacy concerns, contact us at your business email.</p>
    </main>
  );
}