import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DevAI - Autonomous Coding Agent',
  description: 'A Cursor-like coding agent that connects to Ollama DeepSeek Coder for autonomous development',
  keywords: ['coding', 'AI', 'agent', 'development', 'ollama', 'deepseek'],
  authors: [{ name: 'DevAI Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
}