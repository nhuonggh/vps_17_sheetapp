"use client";

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { CartProvider } from "@/context/CartContext";

interface ClientProvidersProps {
    children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
            scriptProps={{
                async: true,
                defer: true,
                appendTo: 'head',
            }}
        >
            <CartProvider>
                {children}
            </CartProvider>
        </GoogleReCaptchaProvider>
    );
}
