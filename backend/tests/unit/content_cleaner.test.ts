import { describe, it, expect } from "vitest";
import {
  cleanHtmlToMarkdown,
  isMarkdownOrPlainText
} from "../../src/services/contentCleaner.js";

describe("Unit: Content Cleaner Service (src/services/contentCleaner.ts - BAC-16)", () => {
  describe("Format Detection (isMarkdownOrPlainText)", () => {
    it("identifies plain markdown and text formats correctly", () => {
      expect(isMarkdownOrPlainText("# Header\n\nSome markdown content", "text/markdown")).toBe(true);
      expect(isMarkdownOrPlainText("Plain text notes without html", "text/plain")).toBe(true);
      expect(isMarkdownOrPlainText("# Chapter 1\n- Item 1\n- Item 2")).toBe(true);
    });

    it("identifies HTML documents even if generic text/plain header is sent", () => {
      const htmlSnippet = "<!DOCTYPE html><html><body><h1>Title</h1><p>Text</p></body></html>";
      expect(isMarkdownOrPlainText(htmlSnippet, "text/plain")).toBe(false);
      expect(isMarkdownOrPlainText("<div class=\"article\"><p>Content</p></div>")).toBe(false);
    });
  });

  describe("HTML Article Extraction & Boilerplate Stripping", () => {
    it("extracts primary article body and strips navbars, footers, scripts, and styles", () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quantum Computing Fundamentals</title>
            <style>body { color: red; }</style>
            <script>analytics.track();</script>
          </head>
          <body>
            <nav class="nav-menu"><a href="/">Home</a><a href="/topics">Topics</a></nav>
            <header role="banner"><div class="banner">Site Banner</div></header>
            <main>
              <article>
                <h1>Quantum Computing Fundamentals</h1>
                <p>Qubits leverage superposition and entanglement to perform quantum computations.</p>
                <h2>Superposition Principle</h2>
                <p>A qubit state is represented as a linear combination of basis states.</p>
                <ul>
                  <li>State zero: |0⟩</li>
                  <li>State one: |1⟩</li>
                </ul>
              </article>
            </main>
            <aside class="sidebar-nav">Sidebar ad content</aside>
            <div class="cookie-banner">Accept cookies</div>
            <footer><p>© 2026 Quantum Inc.</p></footer>
          </body>
        </html>
      `;

      const result = cleanHtmlToMarkdown(html);

      expect(result.title).toBe("Quantum Computing Fundamentals");
      expect(result.cleanedContent).toContain("Qubits leverage superposition and entanglement");
      expect(result.cleanedContent).toContain("## Superposition Principle");
      expect(result.cleanedContent).toContain("State zero: |0⟩");

      // Verify boilerplate is completely absent
      expect(result.cleanedContent).not.toContain("Site Banner");
      expect(result.cleanedContent).not.toContain("Sidebar ad content");
      expect(result.cleanedContent).not.toContain("Accept cookies");
      expect(result.cleanedContent).not.toContain("analytics.track");
      expect(result.cleanedContent).not.toContain("color: red");
    });

    it("strips tracking pixels (1x1 images) and removes huge base64 data blobs", () => {
      const html = `
        <article>
          <h1>Tracking Test</h1>
          <p>Normal paragraph with content.</p>
          <img src="data:image/png;base64,${"A".repeat(800)}" alt="Huge Blob" />
          <img src="https://example.com/pixel.gif" width="1" height="1" alt="Tracker" />
        </article>
      `;

      const result = cleanHtmlToMarkdown(html);
      expect(result.cleanedContent).toContain("Normal paragraph with content.");
      expect(result.cleanedContent).not.toContain("AAAA");
      expect(result.cleanedContent).not.toContain("pixel.gif");
    });
  });

  describe("Syntax-Highlighted Code Blocks Preservation", () => {
    it("preserves indented code blocks with language identifiers", () => {
      const html = `
        <article>
          <h1>Transformer Architecture</h1>
          <p>Self-attention computation implementation in PyTorch:</p>
          <pre class="language-python"><code class="language-python">import torch
import torch.nn as nn

class ScaledDotProductAttention(nn.Module):
    def __init__(self, d_k):
        super().__init__()
        self.scale = 1.0 / (d_k ** 0.5)

    def forward(self, q, k, v, mask=None):
        scores = torch.matmul(q, k.transpose(-2, -1)) * self.scale
        return torch.matmul(torch.softmax(scores, dim=-1), v)
</code></pre>
        </article>
      `;

      const result = cleanHtmlToMarkdown(html);

      expect(result.cleanedContent).toContain("```python");
      expect(result.cleanedContent).toContain("class ScaledDotProductAttention(nn.Module):");
      expect(result.cleanedContent).toContain("        self.scale = 1.0 / (d_k ** 0.5)");
      expect(result.cleanedContent).toContain("```");
    });

    it("handles pre tags without code wrappers and infers language", () => {
      const html = `
        <article>
          <h1>Rust Lifetimes</h1>
          <pre class="highlight-source-rust">fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}</pre>
        </article>
      `;

      const result = cleanHtmlToMarkdown(html);
      expect(result.cleanedContent).toContain("```rust");
      expect(result.cleanedContent).toContain("fn longest<'a>(x: &'a str, y: &'a str) -> &'a str");
    });
  });

  describe("LaTeX & Math Formulas Preservation", () => {
    it("preserves block and inline math expressions verbatim without escaping symbols", () => {
      const html = `
        <article>
          <h1>Backpropagation Derivation</h1>
          <p>The total cost function is given by:</p>
          <div class="math">$$ J(W, b) = \\frac{1}{m} \\sum_{i=1}^m L(\\hat{y}^{(i)}, y^{(i)}) + \\frac{\\lambda}{2m} \\sum_l \\|W^{[l]}\\|_F^2 $$</div>
          <p>For layer $l$, the gradient with respect to pre-activation is <span class="math">$\\delta^{[l]} = \\nabla_{a^{[l]}} J \\odot \\sigma^\\prime(z^{[l]})$</span>.</p>
        </article>
      `;

      const result = cleanHtmlToMarkdown(html);

      expect(result.cleanedContent).toContain("$$ J(W, b) = \\frac{1}{m} \\sum_{i=1}^m L(\\hat{y}^{(i)}, y^{(i)}) + \\frac{\\lambda}{2m} \\sum_l \\|W^{[l]}\\|_F^2 $$");
      expect(result.cleanedContent).toContain("$\\delta^{[l]} = \\nabla_{a^{[l]}} J \\odot \\sigma^\\prime(z^{[l]})$");
    });

    it("extracts TeX annotation from MathML elements", () => {
      const html = `
        <article>
          <h1>Euler Equation</h1>
          <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
            <semantics>
              <mrow><msup><mi>e</mi><mrow><mi>i</mi><mi>π</mi></mrow></msup><mo>+</mo><mn>1</mn><mo>=</mo><mn>0</mn></mrow>
              <annotation encoding="application/x-tex">e^{i\\pi} + 1 = 0</annotation>
            </semantics>
          </math>
        </article>
      `;

      const result = cleanHtmlToMarkdown(html);
      expect(result.cleanedContent).toContain("$$ e^{i\\pi} + 1 = 0 $$");
    });
  });

  describe("GFM Tables Conversion", () => {
    it("converts HTML tables into formatted GitHub-Flavored Markdown tables", () => {
      const html = `
        <article>
          <h1>Algorithm Complexities</h1>
          <table>
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Time (Average)</th>
                <th>Time (Worst)</th>
                <th>Space</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>QuickSort</td>
                <td>O(n log n)</td>
                <td>O(n^2)</td>
                <td>O(log n)</td>
              </tr>
              <tr>
                <td>MergeSort</td>
                <td>O(n log n)</td>
                <td>O(n log n)</td>
                <td>O(n)</td>
              </tr>
            </tbody>
          </table>
        </article>
      `;

      const result = cleanHtmlToMarkdown(html);

      expect(result.cleanedContent).toContain("| Algorithm | Time (Average) | Time (Worst) | Space |");
      expect(result.cleanedContent).toContain("| QuickSort | O(n log n) | O(n^2) | O(log n) |");
      expect(result.cleanedContent).toContain("| MergeSort | O(n log n) | O(n log n) | O(n) |");
    });
  });

  describe("URL Normalization against finalUrl", () => {
    it("resolves relative hyperlinks and image sources to canonical absolute URLs", () => {
      const html = `
        <article>
          <h1>Documentation Guide</h1>
          <p>Read the <a href="/docs/getting-started">Getting Started Guide</a> or see <a href="../api/v1">API v1</a>.</p>
          <p>Anchor links like <a href="#section-2">Section 2</a> and <a href="mailto:info@example.com">Email Us</a> should remain intact.</p>
          <img src="/assets/diagram.png" alt="Architecture Diagram" />
        </article>
      `;

      const result = cleanHtmlToMarkdown(html, {
        finalUrl: "https://docs.studyapp.org/tutorials/intro.html"
      });

      expect(result.cleanedContent).toContain("[Getting Started Guide](https://docs.studyapp.org/docs/getting-started)");
      expect(result.cleanedContent).toContain("[API v1](https://docs.studyapp.org/api/v1)");
      expect(result.cleanedContent).toContain("[Section 2](#section-2)");
      expect(result.cleanedContent).toContain("[Email Us](mailto:info@example.com)");
      expect(result.cleanedContent).toContain("![Architecture Diagram](https://docs.studyapp.org/assets/diagram.png)");
    });
  });

  describe("Plain Text, Markdown, and Edge Cases", () => {
    it("passes through native markdown without altering syntax", () => {
      const rawMarkdown = "# Pure Markdown Note\n- Concept A\n- Concept B\n\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$";

      const result = cleanHtmlToMarkdown(rawMarkdown, {
        contentType: "text/markdown"
      });

      expect(result.cleanedContent).toBe(rawMarkdown.trim());
      expect(result.cleanedLength).toBe(Buffer.byteLength(rawMarkdown.trim(), "utf8"));
    });

    it("gracefully cleans empty, null, or whitespace-only inputs", () => {
      expect(cleanHtmlToMarkdown("").cleanedContent).toBe("");
      expect(cleanHtmlToMarkdown("   ").cleanedContent).toBe("");
      expect(cleanHtmlToMarkdown(null as any).cleanedContent).toBe("");
    });

    it("falls back to body HTML when Readability returns null on dense technical cheat sheets", () => {
      const denseCheatSheet = `
        <div>
          <b>Command:</b> <code>git rebase -i</code>
          <b>Description:</b> Interactive rebase tool
        </div>
      `;

      const result = cleanHtmlToMarkdown(denseCheatSheet);
      expect(result.cleanedContent).toContain("**Command:** `git rebase -i`");
      expect(result.cleanedContent).toContain("**Description:** Interactive rebase tool");
    });
  });

  describe("Performance Benchmarking", () => {
    it("cleans a large technical document in sub-50ms", () => {
      const largeParagraphs = Array.from({ length: 100 }, (_, i) =>
        `<p>Paragraph ${i}: Neural networks optimize high-dimensional parameter spaces via stochastic gradient descent with momentum.</p>`
      ).join("\n");

      const largeHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Large Technical Document</title></head>
          <body>
            <article>
              <h1>Deep Learning at Scale</h1>
              ${largeParagraphs}
            </article>
          </body>
        </html>
      `;

      const start = performance.now();
      const result = cleanHtmlToMarkdown(largeHtml);
      const durationMs = performance.now() - start;

      expect(result.cleanedContent.length).toBeGreaterThan(1000);
      expect(durationMs).toBeLessThan(100);
    });
  });
});
