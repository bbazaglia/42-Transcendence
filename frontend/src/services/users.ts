import { PublicUser } from '../components/users';

/**
 * Fetch the public profile for a user ID.
 * Throws an Error when response is not ok (includes server-sent message when available).
 */
export async function fetchUserProfile(userId: number): Promise<PublicUser> {
    const resp = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        credentials: 'include'
    });

    if (resp.ok) {
        const data = await resp.json();
        // Extract user from wrapper object
        return data.user;
    }

    // Attempt to read backend error JSON, fallback to status text.
    let msg = `Request failed: ${resp.status}`;
    try {
        const err = await resp.json();
        if (err && typeof err.message === 'string') msg = err.message;
    } catch {
        msg = resp.statusText || msg;
    }

    throw new Error(msg);
}
