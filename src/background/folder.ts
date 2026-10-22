// Save downloads into a user-chosen subfolder of the Firefox download directory.
//
// Firefox's downloads API only accepts paths *relative* to the download
// directory: no absolute paths, no "..", and no characters that are illegal in
// file names. Everything here exists to turn the user's setting plus the
// generated file name into a path Firefox will accept.

// Characters Windows forbids in file names (Firefox rejects them on every OS),
// plus control characters.
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
const MAX_SEGMENT_LENGTH = 120;

/** Make one path segment (a folder or file name) safe, or return '' to drop it. */
export function sanitizeSegment(segment: string): string {
    let s = segment.replace(ILLEGAL_CHARS, '_').trim();
    // Leading dots would make hidden files/folders; trailing dots and spaces are
    // stripped silently by Windows and rejected by Firefox.
    s = s.replace(/^\.+/, '').replace(/[. ]+$/, '');
    if (s.length > MAX_SEGMENT_LENGTH) s = s.slice(0, MAX_SEGMENT_LENGTH).replace(/[. ]+$/, '');
    return s;
}

/**
 * Turn the folder setting into a clean relative path such as "Instagram/natgeo".
 * Accepts "/" or "\" as separators and expands {username}.
 * Returns '' when no folder should be used.
 */
export function resolveFolder(setting: unknown, username?: string): string {
    if (typeof setting !== 'string') return '';
    const user = sanitizeSegment(username || '') || 'unknown';
    return setting
        .replace(/{username}/gi, user)
        .split(/[\\/]+/)
        .map(sanitizeSegment)
        .filter((seg) => seg && seg !== '..')
        .join('/');
}

/** Build the full relative path Firefox will save to, e.g. "Instagram/natgeo/natgeo-123.jpg". */
export function buildDownloadPath(folder: string, filename: string): string {
    const name = sanitizeSegment(filename) || 'download';
    return folder ? `${folder}/${name}` : name;
}

export async function getFolderSetting(username?: string): Promise<string> {
    const { setting_download_folder } = await browser.storage.sync.get('setting_download_folder');
    return resolveFolder(setting_download_folder, username);
}

// Blob URLs we created, keyed by download id, so they can be freed once the
// download finishes (freeing them earlier would cancel the download).
const pendingBlobUrls = new Map<number, string>();

if (browser.downloads?.onChanged) {
    browser.downloads.onChanged.addListener((delta) => {
        const state = delta.state?.current;
        if (state !== 'complete' && state !== 'interrupted') return;
        const url = pendingBlobUrls.get(delta.id);
        if (url) {
            URL.revokeObjectURL(url);
            pendingBlobUrls.delete(delta.id);
        }
    });
}

/**
 * Save a blob to <download dir>/<folder>/<filename>.
 * Throws if the downloads API is unavailable or rejects the path, so the
 * caller can fall back to the extension's original save method.
 */
export async function saveBlobToFolder(blob: Blob, filename: string, folder: string): Promise<number> {
    if (!browser.downloads?.download) throw new Error('downloads API not available');
    const url = URL.createObjectURL(blob);
    try {
        const id = await browser.downloads.download({
            url,
            filename: buildDownloadPath(folder, filename),
            conflictAction: 'uniquify', // never overwrite: adds (1), (2)...
            saveAs: false, // the whole point is to skip the Save dialog
        });
        pendingBlobUrls.set(id, url);
        return id;
    } catch (e) {
        URL.revokeObjectURL(url);
        throw e;
    }
}
