export function onRequest(context) {
	const url = new URL(context.request.url);
	const origin = `${url.protocol}//${url.host}`;
	
	context.locals.siteUrl = origin;
	
	return context.next();
}
