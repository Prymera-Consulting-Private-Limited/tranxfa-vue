/**
 * What a customer may upload as an identity document.
 *
 * The multi-file upload accepted any type and checked only size; the single
 * upload checked only a browser-declared image type and no size. The server
 * must enforce both as well; this stops the obvious mistakes before a
 * presigned upload is even requested.
 */

export const MAX_UPLOAD_MB = 10;

export const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * @param {File} file
 * @param {{types?: string[], maxMb?: number}} rules
 * @returns {string|null} a message for the customer, or null when acceptable
 */
export function validateUpload(file, {types = DOCUMENT_TYPES, maxMb = MAX_UPLOAD_MB} = {}) {
    if (! file) {
        return 'Elige un archivo para subir.';
    }
    if (! types.includes(file.type)) {
        return types.includes('application/pdf')
            ? 'Sube una foto en JPEG, PNG o WebP, o un PDF.'
            : 'Sube una foto en JPEG, PNG o WebP.';
    }
    if (file.size > maxMb * 1024 * 1024) {
        return `This file is too large (max ${maxMb} MB). Try a smaller photo or take a new one.`;
    }

    return null;
}

/**
 * @param {string[]} types
 * @returns {string} an `accept` attribute value
 */
export function acceptFor(types) {
    return types.join(',');
}
