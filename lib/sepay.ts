/**
 * SePay integration — Luồng A (Webhook + VietQR).
 * Docs: https://developer.sepay.vn (see project skill `sepay` for the full reference).
 *
 * Which gateway is live is an admin/ops decision, not a per-customer choice — controlled
 * by PAYMENT_PROVIDER so switching providers is a config change, not a code change.
 */

import crypto from 'crypto';

export type PaymentProvider = 'payos' | 'sepay';

export function getActivePaymentProvider(): PaymentProvider {
    return process.env.PAYMENT_PROVIDER === 'sepay' ? 'sepay' : 'payos';
}

export function isSepayConfigured(): boolean {
    return !!(
        process.env.SEPAY_ACCOUNT_NUMBER &&
        process.env.SEPAY_BANK_NAME &&
        process.env.SEPAY_ACCOUNT_HOLDER &&
        process.env.SEPAY_WEBHOOK_SECRET
    );
}

export function getSepayBankInfo() {
    return {
        bankName: process.env.SEPAY_BANK_NAME || '',
        accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
        accountHolder: process.env.SEPAY_ACCOUNT_HOLDER || '',
    };
}

/**
 * Prefix for the payment code embedded in the QR transfer content, e.g. "DH" + a numeric
 * order code -> "DH1755000000". Keep in sync with the prefix configured at
 * my.sepay.vn -> Cấu hình Công ty -> Cấu trúc mã thanh toán so SePay's own `code` extraction
 * (used as the primary match in the webhook) actually fires.
 */
export function getSepayPaymentCodePrefix(): string {
    return process.env.SEPAY_PAYMENT_CODE_PREFIX || 'DH';
}

/**
 * Build a VietQR image URL (SePay's free qr endpoint) prefilled with bank/account/amount/
 * content so the customer's banking app auto-fills the transfer instead of typing by hand.
 */
export function generateSepayQrUrl(params: {
    amount: number;
    paymentCode: string;
}): string {
    const { bankName, accountNumber, accountHolder } = getSepayBankInfo();
    const query = new URLSearchParams({
        acc: accountNumber,
        bank: bankName,
        amount: String(params.amount),
        des: params.paymentCode,
        template: 'compact',
        showinfo: 'true',
    });
    if (accountHolder) {
        query.set('holder', accountHolder);
    }
    return `https://vietqr.app/img?${query.toString()}`;
}

const REPLAY_WINDOW_SECONDS = 300;

/**
 * Verify SePay's HMAC-SHA256 webhook signature. Must run against the raw request body —
 * SePay signs the exact bytes it sent, so re-serializing a parsed object will not match.
 */
export function verifySepayWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    timestampHeader: string | null
): { valid: boolean; reason?: string } {
    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) {
        return { valid: false, reason: 'sepay_not_configured' };
    }
    if (!signatureHeader || !timestampHeader) {
        return { valid: false, reason: 'missing_signature' };
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > REPLAY_WINDOW_SECONDS) {
        return { valid: false, reason: 'expired' };
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return { valid: false, reason: 'signature_mismatch' };
    }

    return { valid: true };
}

export interface SepayWebhookPayload {
    id: number;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    subAccount: string | null;
    code: string | null;
    content: string;
    transferType: 'in' | 'out';
    transferAmount: number;
    accumulated?: number;
    referenceCode?: string;
}
