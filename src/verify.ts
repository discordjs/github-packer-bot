/*
ISC License

Copyright (c) 2020 Gregor Martynus

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

See: https://github.com/gr2m/cloudflare-worker-github-app-example/blob/5a0d0bec9c096f5a922acbbaa9fe2da882093985/LICENSE
*/

export async function verifyWebhookSignature(payload: string, signature: string, secret: string) {
	const algorithm = { name: 'HMAC', hash: 'SHA-256' } as const;
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', enc.encode(secret), algorithm, false, ['sign', 'verify']);

	const signed = await crypto.subtle.sign(algorithm.name, key, enc.encode(payload));

	const hex = [...new Uint8Array(signed)].map((x) => x.toString(16).padStart(2, '0')).join('');
	const expectedSignature = `sha256=${hex}`;
	if (!safeCompare(expectedSignature, signature)) {
		throw new Error('Signature does not match event payload and secret');
	}
}

/**
 * Prevents timing attacks by comparing two strings in constant time.
 */
function safeCompare(expected: string, actual: string) {
	const lenExpected = expected.length;
	let result = 0;

	if (lenExpected !== actual.length) {
		// eslint-disable-next-line no-param-reassign
		actual = expected;
		result = 1;
	}

	for (let index = 0; index < lenExpected; index++) {
		// eslint-disable-next-line unicorn/prefer-code-point
		result |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
	}

	return result === 0;
}
