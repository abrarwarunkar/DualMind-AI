import './globals.css';

export default function RootLayout({ children }) {
    return (
        <html lang="en" data-theme="dark" suppressHydrationWarning>
            <body>{children}</body>
        </html>
    );
}