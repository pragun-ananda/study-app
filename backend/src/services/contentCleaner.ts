import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { CleanContentResult } from "../types.js";

export interface CleanContentOptions {
  finalUrl?: string;
  contentType?: string;
}

const UNWANTED_TAGS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "canvas",
  "svg",
  "template",
  "nav",
  "footer",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "dialog",
  "audio",
  "video",
  "source",
  "track",
  "embed",
  "object",
  "applet"
];

const UNWANTED_SELECTORS = [
  "[aria-hidden='true']",
  "[role='banner']",
  "[role='navigation']",
  "[role='dialog']",
  "[role='alert']",
  ".cookie-banner",
  ".cookie-consent",
  ".ad-banner",
  ".advertisement",
  ".social-share",
  ".share-buttons",
  ".sidebar-nav",
  ".nav-menu"
];

/**
 * Determines whether raw content is already plain text or Markdown
 * and can bypass full HTML DOM parsing.
 */
export function isMarkdownOrPlainText(content: string, contentType?: string): boolean {
  if (contentType) {
    const mime = contentType.split(";")[0].trim().toLowerCase();
    if (
      mime === "text/markdown" ||
      mime === "text/x-markdown" ||
      mime === "text/plain"
    ) {
      // If content contains full HTML page structures, process as HTML despite generic text/plain header
      if (
        content.includes("<html") ||
        content.includes("<!DOCTYPE") ||
        (content.includes("<body") && content.includes("</div>"))
      ) {
        return false;
      }
      return true;
    }
    if (
      mime === "text/html" ||
      mime === "application/xhtml+xml" ||
      mime === "application/xml"
    ) {
      return false;
    }
  }

  // Heuristic: Check if content has HTML structural tags
  const hasHtmlTag = /<\/?(?:html|head|body|div|p|span|article|section|header|footer|nav|main|aside|h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|pre|code|a|img|b|i|strong|em|math)\b/i.test(
    content
  );
  return !hasHtmlTag;
}

/**
 * Normalizes relative URLs (href and src attributes) in the DOM tree
 * against the canonical finalUrl from Step 1.
 */
function resolveRelativeUrls(document: any, baseUrl: string): void {
  // Normalize anchor links
  const anchors = document.querySelectorAll("a");
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const href = a.getAttribute("href");
    if (
      href &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:") &&
      !href.startsWith("javascript:") &&
      !href.startsWith("data:")
    ) {
      try {
        const absoluteHref = new URL(href, baseUrl).toString();
        a.setAttribute("href", absoluteHref);
      } catch {
        // Leave malformed URL intact
      }
    }
  }

  // Normalize image sources
  const images = document.querySelectorAll("img");
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) {
      try {
        const absoluteSrc = new URL(src, baseUrl).toString();
        img.setAttribute("src", absoluteSrc);
      } catch {
        // Leave malformed URL intact
      }
    }
  }
}

/**
 * Creates and configures a TurndownService with GitHub-Flavored Markdown
 * and custom rules for code blocks and LaTeX math formulas.
 */
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    hr: "---",
    bulletListMarker: "-"
  });

  // Enable GFM plugin (tables, strikethrough, task lists)
  turndown.use(gfm);

  // Custom Rule: Syntax-Highlighted Code Blocks
  turndown.addRule("fencedCodeBlock", {
    filter: (node): boolean => {
      const cls = (node as any).getAttribute?.("class") || "";
      if (cls.includes("math-latex")) return false;

      return Boolean(
        node.nodeName === "PRE" ||
        (node.nodeName === "CODE" &&
          node.parentNode &&
          node.parentNode.nodeName !== "PRE" &&
          node.textContent &&
          node.textContent.indexOf("\n") !== -1)
      );
    },
    replacement: (_content, node) => {
      let language = "";
      let rawCode = "";

      if (node.nodeName === "PRE") {
        const codeNode = (node as any).querySelector
          ? (node as any).querySelector("code")
          : node.firstChild && node.firstChild.nodeName === "CODE"
            ? node.firstChild
            : null;
        const target = codeNode || node;
        const classAttr =
          ((target as any).getAttribute?.("class") || "") +
          " " +
          ((node as any).getAttribute?.("class") || "");
        const match = classAttr.match(
          /(?:lang|language|highlight[_-]source)[_-]([a-zA-Z0-9_-]+)/i
        );
        language = match ? match[1] : "";
        rawCode = target.textContent || "";
      } else {
        const classAttr = (node as any).getAttribute?.("class") || "";
        const match = classAttr.match(/(?:lang|language)[_-]([a-zA-Z0-9_-]+)/i);
        language = match ? match[1] : "";
        rawCode = node.textContent || "";
      }

      const cleanedCode = rawCode.replace(/^\n+|\n+$/g, "");
      return "\n\n```" + language + "\n" + cleanedCode + "\n```\n\n";
    }
  });

  // Custom Rule: LaTeX / KaTeX / MathJax formulas
  turndown.addRule("mathFormulas", {
    filter: (node): boolean => {
      const className = (node as any).getAttribute?.("class") || "";
      return Boolean(
        className.includes("math-latex") ||
        className.includes("math") ||
        className.includes("katex") ||
        className.includes("MathJax") ||
        (node as any).hasAttribute?.("data-latex") ||
        (node as any).hasAttribute?.("data-tex") ||
        node.nodeName === "MATH"
      );
    },
    replacement: (_content, node) => {
      const el = node as any;
      const annotation = el.querySelector?.("annotation[encoding='application/x-tex']");
      const tex =
        annotation?.textContent?.trim() ||
        el.getAttribute?.("data-latex") ||
        el.getAttribute?.("data-tex") ||
        el.textContent?.trim() ||
        "";

      if (!tex) return "";

      const isBlock =
        node.nodeName === "PRE" ||
        node.nodeName === "DIV" ||
        tex.startsWith("$$") ||
        el.getAttribute?.("display") === "block";

      if (isBlock) {
        const cleanTex = tex.startsWith("$$")
          ? tex
          : "$$ " + tex.replace(/^\$\$|\$\$$/g, "").trim() + " $$";
        return "\n\n" + cleanTex + "\n\n";
      } else {
        const cleanTex = tex.startsWith("$")
          ? tex
          : "$ " + tex.replace(/^\$|\$$/g, "").trim() + " $";
        return " " + cleanTex + " ";
      }
    }
  });

  return turndown;
}

/**
 * Converts raw fetched document content (HTML, plain text, markdown)
 * into clean, standardized GitHub-Flavored Markdown.
 */
export function cleanHtmlToMarkdown(
  rawContent: string,
  options?: CleanContentOptions
): CleanContentResult {
  if (!rawContent || typeof rawContent !== "string") {
    return {
      cleanedContent: "",
      cleanedLength: 0
    };
  }

  // 1. Check if content is already plain text or Markdown
  if (isMarkdownOrPlainText(rawContent, options?.contentType)) {
    const normalized = rawContent.replace(/\r\n/g, "\n").trim();
    return {
      cleanedContent: normalized,
      cleanedLength: Buffer.byteLength(normalized, "utf8")
    };
  }

  // 2. Wrap partial HTML if needed for robust linkedom parsing
  const fullHtml = rawContent.toLowerCase().includes("<html")
    ? rawContent
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${rawContent}</body></html>`;

  let document: any;
  try {
    const parsed = parseHTML(fullHtml);
    document = parsed.document;
  } catch {
    // If DOM parsing fails on severe malformed input, fallback to raw text
    const fallbackText = rawContent.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
    return {
      cleanedContent: fallbackText,
      cleanedLength: Buffer.byteLength(fallbackText, "utf8")
    };
  }

  // 3. Pre-sanitization: Strip unwanted tags and tracking elements
  for (const tag of UNWANTED_TAGS) {
    const elements = document.querySelectorAll(tag);
    for (let i = 0; i < elements.length; i++) {
      elements[i].remove();
    }
  }

  for (const selector of UNWANTED_SELECTORS) {
    try {
      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        elements[i].remove();
      }
    } catch {
      // Ignore selector syntax issues
    }
  }

  // Strip 1x1 tracking pixels and large base64 image data blobs
  const imgs = document.querySelectorAll("img");
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const w = img.getAttribute("width");
    const h = img.getAttribute("height");
    const src = img.getAttribute("src") || "";
    if (w === "1" || h === "1" || w === "0" || h === "0") {
      img.remove();
    } else if (src.startsWith("data:image/") && src.length > 200) {
      img.remove();
    }
  }

  // Pre-process math elements into safe pre/code tags with class="math-latex"
  const mathEls = document.querySelectorAll("math, [class*='math'], [class*='katex'], [class*='MathJax'], [data-latex], [data-tex]");
  for (let i = 0; i < mathEls.length; i++) {
    const el = mathEls[i];
    const annotation = el.querySelector ? el.querySelector("annotation[encoding='application/x-tex']") : null;
    const tex =
      (annotation && annotation.textContent.trim()) ||
      (el.getAttribute && (el.getAttribute("data-latex") || el.getAttribute("data-tex"))) ||
      el.textContent.trim();

    if (tex) {
      const isBlock = el.nodeName === "DIV" || (el.getAttribute && el.getAttribute("display") === "block") || tex.startsWith("$$");
      const replacement = document.createElement(isBlock ? "pre" : "code");
      replacement.className = "math-latex";
      replacement.textContent = isBlock
        ? (tex.startsWith("$$") ? tex : "$$ " + tex.replace(/^\$\$|\$\$$/g, "").trim() + " $$")
        : (tex.startsWith("$") ? tex : "$ " + tex.replace(/^\$|\$$/g, "").trim() + " $");
      el.replaceWith(replacement);
    }
  }

  // 4. Resolve relative URLs against canonical finalUrl if provided
  if (options?.finalUrl) {
    resolveRelativeUrls(document, options.finalUrl);
  }

  // Extract fallback document title
  const docTitle =
    document.querySelector("title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    undefined;

  // 5. Article extraction via Mozilla Readability (keepClasses: true to preserve code/math classes)
  let articleContentHtml: string | null = null;
  let articleTitle: string | undefined = docTitle;
  let articleByline: string | undefined = undefined;
  let articleExcerpt: string | undefined = undefined;

  try {
    const reader = new Readability(document, {
      charThreshold: 20,
      keepClasses: true
    });
    const article = reader.parse();
    if (article && article.content && article.content.trim()) {
      articleContentHtml = article.content;
      if (article.title) articleTitle = article.title.trim();
      if (article.byline) articleByline = article.byline.trim();
      if (article.excerpt) articleExcerpt = article.excerpt.trim();
    }
  } catch {
    // Readability parse failure; fallback to body HTML
  }

  // Fallback if Readability returned null (e.g. cheat-sheets, tables without p tags)
  const targetHtml =
    articleContentHtml || (document.body ? document.body.innerHTML : fullHtml);

  // 6. AST Markdown Transformation via Turndown
  const turndown = createTurndownService();
  let markdown = "";
  try {
    markdown = turndown.turndown(targetHtml);
  } catch {
    // Fallback if turndown errors
    markdown = targetHtml.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
  }

  // 7. Post-processing: Prepend title heading if not already present, normalize newlines
  let processedMarkdown = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (articleTitle && !processedMarkdown.startsWith("# ") && !processedMarkdown.startsWith("## ")) {
    processedMarkdown = `# ${articleTitle}\n\n${processedMarkdown}`;
  }

  const cleanedContent = processedMarkdown.trim();
  const cleanedLength = Buffer.byteLength(cleanedContent, "utf8");

  return {
    cleanedContent,
    cleanedLength,
    title: articleTitle,
    byline: articleByline,
    excerpt: articleExcerpt
  };
}
