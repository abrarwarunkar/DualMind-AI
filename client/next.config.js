/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                // Explicitly use 127.0.0.1 instead of localhost to prevent IPv6/IPv4 Node.js proxy socket hangups on Windows
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
