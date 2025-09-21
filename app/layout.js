import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'Sortie - AI Video Location Scanner',
  description: 'AI-powered video location scanner with interactive map',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              font-family: ${inter.style.fontFamily}, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffc27e;
            }
            
            h1 {
              font-family: ${inter.style.fontFamily}, sans-serif;
              font-weight: 600;
              font-size: 70px;
              color: #18204aff;
              margin: 0;
              padding: 0;
              animation: slideInFromTop 0.5s ease-out forwards;
            }
            
            @keyframes slideInFromTop {
              0% {
                transform: translateY(-20px);
                opacity: 0;
              }
              100% {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
