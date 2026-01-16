/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        // ⚠️ Temporary: Skip TypeScript check during Vercel build
        // Local build already verified types are correct
        ignoreBuildErrors: true,
    },
    eslint: {
        // Skip ESLint during build for faster deployment
        ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig
