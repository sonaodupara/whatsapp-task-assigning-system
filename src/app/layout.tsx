import './globals.css';
import Layout from '../components/Layout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}