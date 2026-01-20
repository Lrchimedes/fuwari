import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
});

function parseWordPressXML(xmlContent) {
	const posts = [];

	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	let match;

	while ((match = itemRegex.exec(xmlContent)) !== null) {
		const itemContent = match[1];

		const titleMatch = itemContent.match(
			/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/,
		);
		const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);
		const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/);
		const contentMatch = itemContent.match(
			/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/,
		);
		const excerptMatch = itemContent.match(
			/<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/,
		);
		const postDateMatch = itemContent.match(
			/<wp:post_date><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_date>/,
		);
		const postNameMatch = itemContent.match(
			/<wp:post_name><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_name>/,
		);
		const statusMatch = itemContent.match(
			/<wp:status><!\[CDATA\[([\s\S]*?)\]\]><\/wp:status>/,
		);
		const postTypeMatch = itemContent.match(
			/<wp:post_type><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_type>/,
		);

		const categoryMatches = itemContent.matchAll(
			/<category domain="category"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g,
		);
		const tagMatches = itemContent.matchAll(
			/<category domain="post_tag"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g,
		);

		const categories = [];
		for (const catMatch of categoryMatches) {
			categories.push(catMatch[1]);
		}

		const tags = [];
		for (const tagMatch of tagMatches) {
			tags.push(tagMatch[1]);
		}

		if (
			postTypeMatch &&
			postTypeMatch[1] === "post" &&
			statusMatch &&
			statusMatch[1] === "publish"
		) {
			const post = {
				title: titleMatch ? titleMatch[1] : "",
				link: linkMatch ? linkMatch[1] : "",
				pubDate: pubDateMatch ? pubDateMatch[1] : "",
				content: contentMatch ? contentMatch[1] : "",
				excerpt: excerptMatch ? excerptMatch[1] : "",
				postDate: postDateMatch ? postDateMatch[1] : "",
				postName: postNameMatch ? postNameMatch[1] : "",
				status: statusMatch ? statusMatch[1] : "",
				categories: categories,
				tags: tags,
			};

			posts.push(post);
		}
	}

	return posts;
}

function convertWordPressToMarkdown(content) {
	let markdown = content;

	markdown = markdown.replace(/<!-- wp:paragraph[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:paragraph -->/g, "");
	markdown = markdown.replace(/<!-- wp:heading[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:heading -->/g, "");
	markdown = markdown.replace(/<!-- wp:image[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:image -->/g, "");
	markdown = markdown.replace(/<!-- wp:list[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:list -->/g, "");
	markdown = markdown.replace(/<!-- wp:list-item[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:list-item -->/g, "");
	markdown = markdown.replace(/<!-- wp:quote[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:quote -->/g, "");
	markdown = markdown.replace(/<!-- wp:code[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:code -->/g, "");
	markdown = markdown.replace(/<!-- wp:preformatted[^>]* -->/g, "");
	markdown = markdown.replace(/<!-- \/wp:preformatted -->/g, "");

	markdown = markdown.replace(/<p class="has-[^"]*"[^>]*>/g, "<p>");
	markdown = markdown.replace(/<p>/g, "\n\n");
	markdown = markdown.replace(/<\/p>/g, "\n\n");

	markdown = markdown.replace(/<h([1-6]) class="[^"]*"[^>]*>/g, "\n\n# ");
	markdown = markdown.replace(/<h([1-6])>/g, (_match, level) => {
		return `\n\n${("#".repeat(Number.parseInt(level, 10)), 10)} `;
	});
	markdown = markdown.replace(/<\/h[1-6]>/g, "\n\n");

	markdown = markdown.replace(/<strong[^>]*>/g, "**");
	markdown = markdown.replace(/<\/strong>/g, "**");
	markdown = markdown.replace(/<b[^>]*>/g, "**");
	markdown = markdown.replace(/<\/b>/g, "**");

	markdown = markdown.replace(/<em[^>]*>/g, "*");
	markdown = markdown.replace(/<\/em>/g, "*");
	markdown = markdown.replace(/<i[^>]*>/g, "*");
	markdown = markdown.replace(/<\/i>/g, "*");

	markdown = markdown.replace(
		/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g,
		"[$2]($1)",
	);

	markdown = markdown.replace(/<img src="([^"]*)"[^>]*>/g, "\n\n![]($1)\n\n");

	markdown = markdown.replace(
		/<figure class="wp-block-image">[\s\S]*?<img src="([^"]*)"[^>]*>[\s\S]*?<\/figure>/g,
		"\n\n![]($1)\n\n",
	);

	markdown = markdown.replace(/<blockquote[^>]*>/g, "\n\n> ");
	markdown = markdown.replace(/<\/blockquote>/g, "\n\n");

	markdown = markdown.replace(/<ul[^>]*>/g, "\n\n");
	markdown = markdown.replace(/<\/ul>/g, "\n\n");
	markdown = markdown.replace(/<ol[^>]*>/g, "\n\n");
	markdown = markdown.replace(/<\/ol>/g, "\n\n");
	markdown = markdown.replace(/<li[^>]*>/g, "\n- ");
	markdown = markdown.replace(/<\/li>/g, "");

	markdown = markdown.replace(/<code[^>]*>/g, "`");
	markdown = markdown.replace(/<\/code>/g, "`");

	markdown = markdown.replace(/<pre[^>]*>/g, "\n\n```\n");
	markdown = markdown.replace(/<\/pre>/g, "\n```\n\n");

	markdown = markdown.replace(/<br\s*\/?>/g, "\n");
	markdown = markdown.replace(/<hr\s*\/?>/g, "\n\n---\n\n");

	markdown = markdown.replace(/&nbsp;/g, " ");
	markdown = markdown.replace(/&lt;/g, "<");
	markdown = markdown.replace(/&gt;/g, ">");
	markdown = markdown.replace(/&amp;/g, "&");
	markdown = markdown.replace(/&quot;/g, '"');

	markdown = markdown.replace(/\n{3,}/g, "\n\n");
	markdown = markdown.trim();

	return markdown;
}

function formatDate(dateString) {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function sanitizeFilename(filename) {
	try {
		filename = decodeURIComponent(filename);
	} catch (_e) {
		console.warn(`Failed to decode filename: ${filename}`);
	}

	return filename
		.replace(/[<>:"/\\|?*]/g, "")
		.replace(/\s+/g, "-")
		.replace(/--+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function generateFrontmatter(post) {
	const title = post.title || "Untitled";
	const published = post.postDate
		? formatDate(post.postDate)
		: formatDate(post.pubDate);
	const description = post.excerpt || "";
	const tags =
		post.tags && post.tags.length > 0 ? JSON.stringify(post.tags) : "[]";
	const category =
		post.categories && post.categories.length > 0 ? post.categories[0] : "";

	return `---
title: ${title}
published: ${published}
description: "${description}"
image: ''
tags: ${tags}
category: "${category}"
draft: false
lang: 'zh_CN'
---
`;
}

function _extractImages(content) {
	const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
	const images = [];
	let match;

	while ((match = imageRegex.exec(content)) !== null) {
		images.push(match[1]);
	}

	return images;
}

function importWordPressPosts() {
	const xmlFilePath = path.join(__dirname, "../WordPress.2026-01-20.xml");
	const postsDir = path.join(__dirname, "../src/content/posts");

	if (!fs.existsSync(xmlFilePath)) {
		console.error(`Error: WordPress export file not found at ${xmlFilePath}`);
		process.exit(1);
	}

	const xmlContent = fs.readFileSync(xmlFilePath, "utf-8");
	const posts = parseWordPressXML(xmlContent);

	console.log(`Found ${posts.length} published posts`);

	let successCount = 0;
	let skipCount = 0;

	posts.forEach((post, index) => {
		if (!post.title || !post.content) {
			console.log(`Skipping post ${index + 1}: Missing title or content`);
			skipCount++;
			return;
		}

		const markdownContent = convertWordPressToMarkdown(post.content);
		const frontmatter = generateFrontmatter(post);
		const fullContent = `${frontmatter}\n${markdownContent}`;

		let filename = sanitizeFilename(post.title);
		if (!filename.endsWith(".md")) {
			filename += ".md";
		}

		const filePath = path.join(postsDir, filename);

		if (fs.existsSync(filePath)) {
			console.log(`Skipping existing file: ${filename}`);
			skipCount++;
			return;
		}

		fs.writeFileSync(filePath, fullContent, "utf-8");
		console.log(`Imported: ${filename} (${post.title})`);
		successCount++;
	});

	console.log("\nImport complete!");
	console.log(`Successfully imported: ${successCount} posts`);
	console.log(`Skipped: ${skipCount} posts`);
}

importWordPressPosts();
