// dashboard/src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'SabiWork — Economic Intelligence',
  description: 'Real-time economic intelligence dashboard',
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className="bg-background text-foreground antialiased overflow-hidden h-screen">
        {children}
      </body>
    </html>
  );
}
