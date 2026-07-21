/**
 * Shared category-matching logic for the /categories page, used by both the
 * mobile and desktop views so they can't drift out of sync with each other
 * (they used to duplicate this — desktop had a stub that never matched anything).
 */
export interface CategoryMatchableProduct {
    type: string;
    categories?: { slug: string } | null;
}

export function isMatchSubTab(p: CategoryMatchableProduct, subTabId: string): boolean {
    const catSlug = p.categories?.slug || '';
    const s = subTabId.toLowerCase();
    if (s === 'online') return catSlug.includes('online');
    if (s === 'zoom') return catSlug.includes('zoom');
    if (s === 'appsheet') return catSlug.includes('appsheet') || catSlug.includes('nocode');
    if (s === 'automation') return catSlug.includes('automation') || catSlug.includes('n8n');
    if (s === 'zalo') return catSlug.includes('zalo');
    if (s === 'web') return catSlug.includes('web');
    if (s === 'pc') return catSlug.includes('pc') || catSlug.includes('software');
    if (s === 'automation_service') return catSlug.includes('automation');
    return true;
}
