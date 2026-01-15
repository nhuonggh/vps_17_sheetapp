import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export interface ValidationResult {
    errors: string[];
    sanitized: Record<string, any>;
    isValid: boolean;
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
    if (!email || typeof email !== 'string') {
        return { valid: false, sanitized: '', error: 'Email is required' };
    }

    const trimmed = email.trim();

    if (!validator.isEmail(trimmed)) {
        return { valid: false, sanitized: '', error: 'Invalid email format' };
    }

    const normalized = validator.normalizeEmail(trimmed) || trimmed;

    return { valid: true, sanitized: normalized };
}

/**
 * Validate name (letters, spaces, hyphens only)
 */
export function validateName(name: string): { valid: boolean; sanitized: string; error?: string } {
    if (!name || typeof name !== 'string') {
        return { valid: false, sanitized: '', error: 'Name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 50) {
        return { valid: false, sanitized: '', error: 'Name must be between 2-50 characters' };
    }

    // Allow letters (including Vietnamese), spaces, and hyphens
    const namePattern = /^[a-zA-ZÀ-ỹ\s-]+$/;
    if (!namePattern.test(trimmed)) {
        return { valid: false, sanitized: '', error: 'Name can only contain letters, spaces, and hyphens' };
    }

    const sanitized = DOMPurify.sanitize(trimmed);

    return { valid: true, sanitized };
}

/**
 * Validate and sanitize message/content
 */
export function validateMessage(message: string, maxLength = 1000): { valid: boolean; sanitized: string; error?: string } {
    if (!message || typeof message !== 'string') {
        return { valid: false, sanitized: '', error: 'Message is required' };
    }

    const trimmed = message.trim();

    if (trimmed.length < 10) {
        return { valid: false, sanitized: '', error: 'Message must be at least 10 characters' };
    }

    if (trimmed.length > maxLength) {
        return { valid: false, sanitized: '', error: `Message must not exceed ${maxLength} characters` };
    }

    // Check for spam keywords
    const spamKeywords = [
        'viagra', 'casino', 'lottery', 'winner', 'click here',
        'buy now', 'limited time', 'act now', 'cheap',
    ];

    const lowerContent = trimmed.toLowerCase();
    const foundSpam = spamKeywords.find(keyword => lowerContent.includes(keyword));

    if (foundSpam) {
        return { valid: false, sanitized: '', error: 'Spam content detected' };
    }

    // Sanitize HTML but keep basic formatting
    const sanitized = DOMPurify.sanitize(trimmed, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: [],
    });

    return { valid: true, sanitized };
}

/**
 * Validate phone number (Vietnamese format)
 */
export function validatePhone(phone: string): { valid: boolean; sanitized: string; error?: string } {
    if (!phone || typeof phone !== 'string') {
        return { valid: false, sanitized: '', error: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Vietnamese phone: 10 digits starting with 0, or 9 digits starting with 3-9
    const phonePattern = /^(0[3-9]\d{8}|[3-9]\d{8})$/;

    if (!phonePattern.test(cleaned)) {
        return { valid: false, sanitized: '', error: 'Invalid phone number format' };
    }

    return { valid: true, sanitized: cleaned };
}

/**
 * Comprehensive validation for form inputs
 */
export function validateFormInput(input: {
    email?: string;
    name?: string;
    phone?: string;
    message?: string;
}): ValidationResult {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    // Validate email
    if (input.email !== undefined) {
        const emailResult = validateEmail(input.email);
        if (!emailResult.valid) {
            errors.push(emailResult.error || 'Invalid email');
        } else {
            sanitized.email = emailResult.sanitized;
        }
    }

    // Validate name
    if (input.name !== undefined) {
        const nameResult = validateName(input.name);
        if (!nameResult.valid) {
            errors.push(nameResult.error || 'Invalid name');
        } else {
            sanitized.name = nameResult.sanitized;
        }
    }

    // Validate phone
    if (input.phone !== undefined) {
        const phoneResult = validatePhone(input.phone);
        if (!phoneResult.valid) {
            errors.push(phoneResult.error || 'Invalid phone');
        } else {
            sanitized.phone = phoneResult.sanitized;
        }
    }

    // Validate message
    if (input.message !== undefined) {
        const messageResult = validateMessage(input.message);
        if (!messageResult.valid) {
            errors.push(messageResult.error || 'Invalid message');
        } else {
            sanitized.message = messageResult.sanitized;
        }
    }

    return {
        errors,
        sanitized,
        isValid: errors.length === 0,
    };
}

/**
 * Sanitize HTML content for display
 */
export function sanitizeHtml(html: string, allowedTags?: string[]): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
    });
}
