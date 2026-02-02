import { parseDocument } from "htmlparser2";

// ============================================================================
// Types
// ============================================================================

type DomNode = any;
type DomElement = any;

// ============================================================================
// HTML to Markdown (structured for AI understanding)
// ============================================================================

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html || html.trim() === "") {
    return "";
  }

  const document = parseDocument(html);
  return convertChildrenToMarkdown(document.children);
}

function convertChildrenToMarkdown(children: DomNode[]): string {
  let result = "";

  for (const child of children) {
    result += convertNodeToMarkdown(child);
  }

  return result;
}

function convertNodeToMarkdown(node: DomNode): string {
  if (node.type === "text") {
    return node.data || "";
  }

  if (node.type !== "tag") {
    return "";
  }

  const element: DomElement = node;
  const tagName = element.tagName?.toLowerCase() || "";

  switch (tagName) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = parseInt(tagName.charAt(1), 10);
      const text = extractText(element).trim();
      return `\n${"#".repeat(level)} ${text}\n\n`;
    }

    case "p": {
      const text = extractInlineMarkdown(element);
      return text ? `${text}\n\n` : "\n";
    }

    case "ul": {
      let md = "\n";
      for (const child of element.children || []) {
        if (child.type === "tag" && child.tagName === "LI") {
          md += `- ${extractInlineMarkdown(child).trim()}\n`;
        }
      }
      return md + "\n";
    }

    case "ol": {
      let md = "\n";
      let index = 1;
      for (const child of element.children || []) {
        if (child.type === "tag" && child.tagName === "LI") {
          md += `${index++}. ${extractInlineMarkdown(child).trim()}\n`;
        }
      }
      return md + "\n";
    }

    case "li": {
      return `- ${extractInlineMarkdown(element).trim()}\n`;
    }

    case "blockquote": {
      const text = extractInlineMarkdown(element).trim();
      return text
        .split("\n")
        .map((line: string) => `> ${line}`)
        .join("\n") + "\n\n";
    }

    case "pre": {
      let codeElement = null;
      for (const child of element.children || []) {
        if (child.type === "tag" && child.tagName === "CODE") {
          codeElement = child;
          break;
        }
      }
      const text = codeElement ? extractText(codeElement) : extractText(element);
      const language = codeElement?.attribs?.class?.match(/language-(\w+)/)?.[1] || "";
      return `\n\`\`\`${language}\n${text}\n\`\`\`\n\n`;
    }

    case "hr": {
      return "\n---\n\n";
    }

    case "br": {
      return "\n";
    }

    case "strong":
    case "b": {
      const text = extractText(element);
      return `**${text}**`;
    }

    case "em":
    case "i": {
      const text = extractText(element);
      return `*${text}*`;
    }

    case "s": {
      const text = extractText(element);
      return `~~${text}~~`;
    }

    case "code": {
      const text = extractText(element);
      return `\`${text}\``;
    }

    case "a": {
      const text = extractText(element);
      const href = element.attribs?.href;
      return href ? `[${text}](${href})` : text;
    }

    case "table": {
      return convertTableToMarkdown(element);
    }

    case "img": {
      const alt = element.attribs?.alt || "image";
      const src = element.attribs?.src || "";
      return `![${alt}](${src})`;
    }

    case "audio": {
      return "[Audio recording]";
    }

    case "div":
    case "span": {
      return extractInlineMarkdown(element);
    }

    default: {
      return extractInlineMarkdown(element);
    }
  }
}

function extractInlineMarkdown(element: DomElement): string {
  let result = "";

  for (const child of element.children || []) {
    if (child.type === "text") {
      result += child.data || "";
    } else if (child.type === "tag") {
      const childElement = child;
      const tagName = childElement.tagName?.toLowerCase() || "";

      switch (tagName) {
        case "strong":
        case "b": {
          result += `**${extractInlineMarkdown(childElement)}**`;
          break;
        }
        case "em":
        case "i": {
          result += `*${extractInlineMarkdown(childElement)}*`;
          break;
        }
        case "s": {
          result += `~~${extractInlineMarkdown(childElement)}~~`;
          break;
        }
        case "code": {
          result += `\`${extractText(childElement)}\``;
          break;
        }
        case "a": {
          const text = extractInlineMarkdown(childElement);
          const href = childElement.attribs?.href;
          result += href ? `[${text}](${href})` : text;
          break;
        }
        case "br": {
          result += "\n";
          break;
        }
        default: {
          result += extractInlineMarkdown(childElement);
        }
      }
    }
  }

  return result;
}

function convertTableToMarkdown(table: DomElement): string {
  let md = "\n";

  const rows: DomElement[] = [];
  let headerRow: DomElement | null = null;

  for (const child of table.children || []) {
    if (child.type === "tag" && child.tagName === "THEAD") {
      const thead = child;
      for (const trChild of thead.children || []) {
        if (trChild.type === "tag" && trChild.tagName === "TR") {
          headerRow = trChild;
          break;
        }
      }
    } else if (child.type === "tag" && child.tagName === "TBODY") {
      const tbody = child;
      for (const trChild of tbody.children || []) {
        if (trChild.type === "tag" && trChild.tagName === "TR") {
          rows.push(trChild);
        }
      }
    } else if (child.type === "tag" && child.tagName === "TR") {
      rows.push(child);
    }
  }

  const allRows = headerRow ? [headerRow, ...rows] : rows;

  for (let i = 0; i < allRows.length; i++) {
    const tr = allRows[i];
    const cells: string[] = [];

    for (const tdChild of tr.children || []) {
      if (
        tdChild.type === "tag" &&
        (tdChild.tagName === "TD" || tdChild.tagName === "TH")
      ) {
        cells.push(extractInlineMarkdown(tdChild).trim());
      }
    }

    md += "| " + cells.join(" | ") + " |\n";

    if (i === 0 && headerRow) {
      md += "| " + cells.map(() => "---").join(" | ") + " |\n";
    }
  }

  return md + "\n";
}

function extractText(element: DomElement): string {
  return extractTextFromNodes(element.children || []);
}

function extractTextFromNodes(nodes: DomNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (node.type === "text") {
      result += node.data || "";
    } else if (node.type === "tag") {
      result += extractTextFromNodes(node.children || []);
    }
  }
  return result;
}

// ============================================================================
// Markdown to HTML
// ============================================================================

export function markdownToHtml(markdown: string | null | undefined): string {
  if (!markdown || markdown.trim() === "") {
    return "";
  }

  let html = markdown;

  // Escape HTML first
  html = escapeHtml(html);

  // Code blocks (must be first to prevent inline processing)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  // Bold
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Unordered lists
  html = convertLists(html);

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs (any remaining text)
  html = html
    .split("\n\n")
    .map((para) => {
      para = para.trim();
      if (!para) return "";
      if (para.startsWith("<")) return para; // Already processed
      return `<p>${para.replace(/\n/g, "<br>")}</p>`;
    })
    .filter((p) => p)
    .join("\n");

  return html;
}

function convertLists(html: string): string {
  const lines = html.split("\n");
  let result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[\-\*]\s+(.+)$/);
    const olMatch = line.match(/^\d+\.\s+(.+)$/);

    if (ulMatch) {
      if (!inUl) {
        if (inOl) {
          result.push("</ol>");
          inOl = false;
        }
        result.push("<ul>");
        inUl = true;
      }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inOl) {
        if (inUl) {
          result.push("</ul>");
          inUl = false;
        }
        result.push("<ol>");
        inOl = true;
      }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inUl) {
        result.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        result.push("</ol>");
        inOl = false;
      }
      result.push(line);
    }
  }

  if (inUl) result.push("</ul>");
  if (inOl) result.push("</ol>");

  return result.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// HTML Helpers for Title Extraction and Storage ID extraction
// ============================================================================

export function extractTitleFromHtml(html: string | null | undefined): string | null {
  if (!html || html.trim() === "") {
    return null;
  }

  const document = parseDocument(html);

  // Try to find first heading
  for (const child of document.children) {
    if (child.type === "tag") {
      const element = child;
      if (element.tagName === "H1") {
        return extractText(element).trim() || null;
      }
    }
  }

  // Try to find first paragraph content
  for (const child of document.children) {
    if (child.type === "tag") {
      const element = child;
      if (element.tagName === "P") {
        const text = extractText(element).trim();
        if (text && text.length > 0 && text.length < 100) {
          return text;
        }
      }
    }
  }

  return null;
}

export function extractStorageIdsFromHtml(html: string | null | undefined): string[] {
  if (!html || html.trim() === "") {
    return [];
  }

  const storageIds = new Set<string>();
  const document = parseDocument(html);

  function findStorageIds(nodes: DomNode[]) {
    for (const node of nodes) {
      if (node.type === "tag") {
        const storageId = node.attribs?.["data-storage-id"];
        if (storageId && typeof storageId === "string") {
          storageIds.add(storageId);
        }
        if (node.children) {
          findStorageIds(node.children);
        }
      }
    }
  }

  findStorageIds(document.children);
  return Array.from(storageIds);
}

export function extractStructureFromHtml(html: string | null | undefined): Array<{
  nodeType: "title" | "heading" | "paragraph" | "list" | "codeBlock" | "table";
  level: number;
  text: string;
  path: string;
}> {
  if (!html || html.trim() === "") {
    return [];
  }

  const nodes: Array<{
    nodeType: "title" | "heading" | "paragraph" | "list" | "codeBlock" | "table";
    level: number;
    text: string;
    path: string;
  }> = [];

  const document = parseDocument(html);
  let currentPath: string[] = [];
  let currentLevel = 0;

  for (const child of document.children) {
    if (child.type !== "tag") continue;

    const element = child;
    const tagName = element.tagName?.toLowerCase() || "";
    const text = extractText(element).trim();

    if (!text) continue;

    switch (tagName) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = parseInt(tagName.charAt(1), 10);
        while (currentLevel >= level && currentPath.length > 0) {
          currentPath.pop();
          currentLevel--;
        }
        currentPath.push(text.slice(0, 100));
        currentLevel = level;
        nodes.push({
          nodeType: "heading",
          level,
          text: text.slice(0, 500),
          path: currentPath.join(" > "),
        });
        break;
      }

      case "p": {
        nodes.push({
          nodeType: "paragraph",
          level: currentLevel + 1,
          text: text.slice(0, 200),
          path: currentPath.length > 0 ? `${currentPath.join(" > ")} > [paragraph]` : "[paragraph]",
        });
        break;
      }

      case "ul":
      case "ol": {
        const items: string[] = [];
        for (const li of element.children || []) {
          if (li.type === "tag" && li.tagName === "LI") {
            const itemText = extractText(li).trim();
            if (itemText) items.push(itemText.slice(0, 100));
          }
        }
        if (items.length > 0) {
          nodes.push({
            nodeType: "list",
            level: currentLevel + 1,
            text: items.join("; ").slice(0, 500),
            path: currentPath.length > 0 ? `${currentPath.join(" > ")} > [list]` : "[list]",
          });
        }
        break;
      }

      case "pre": {
        let codeElement = null;
        for (const child of element.children || []) {
          if (child.type === "tag" && child.tagName === "CODE") {
            codeElement = child;
            break;
          }
        }
        const lang = codeElement?.attribs?.class?.match(/language-(\w+)/)?.[1] || "code";
        nodes.push({
          nodeType: "codeBlock",
          level: currentLevel + 1,
          text: `[${lang}]: ${text.slice(0, 200)}`,
          path: currentPath.length > 0 ? `${currentPath.join(" > ")} > [code]` : "[code]",
        });
        break;
      }

      case "table": {
        const rows: DomElement[] = [];
        for (const child of element.children || []) {
          if (child.type === "tag" && child.tagName === "TR") {
            rows.push(child);
          }
        }
        const cells: string[] = [];
        for (const row of rows.slice(0, 3)) {
          for (const cell of row.children || []) {
            if (
              cell.type === "tag" &&
              (cell.tagName === "TD" || cell.tagName === "TH")
            ) {
              const cellText = extractText(cell).trim();
              if (cellText) cells.push(cellText.slice(0, 50));
            }
          }
        }
        if (cells.length > 0) {
          nodes.push({
            nodeType: "table",
            level: currentLevel + 1,
            text: `Table: ${cells.join(" | ")}`.slice(0, 500),
            path: currentPath.length > 0 ? `${currentPath.join(" > ")} > [table]` : "[table]",
          });
        }
        break;
      }
    }
  }

  return nodes;
}
