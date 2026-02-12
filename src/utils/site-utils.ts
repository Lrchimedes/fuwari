export function getSiteUrl(request: Request | undefined): string {
	if (request) {
		const url = new URL(request.url);
		return `${url.protocol}//${url.host}`;
	}
	return "https://blogs.panso.icu";
}

export function getFullUrl(request: Request | undefined, path: string): string {
	const siteUrl = getSiteUrl(request);
	return `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
