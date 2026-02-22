import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export const metadata = {
    title: 'DualMind — Two Minds. One Truth.',
    description:
        'Dual-LLM research platform powered by Groq (Llama 3.3 70B & GPT-OSS 120B). Knowledge graphs, research chains, academic paper search, hallucination detection, and grounded summaries.',
    keywords: 'DualMind, AI research, dual LLM, Groq, Llama, GPT-OSS, knowledge graph, research assistant, academic papers, arXiv',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" data-theme="dark" suppressHydrationWarning>
            <body>
                <AuthProvider>
                    <Navbar />
                    <main>{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
