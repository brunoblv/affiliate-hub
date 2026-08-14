import { Fragment } from "react";

/**
 * Parser leve pro `BlogPost.body` — sem dependência externa (react-markdown
 * etc). Suporta só o mínimo que o editorial usa: "## heading", "**bold**",
 * "[texto](url)" e parágrafos separados por linha em branco. Constrói
 * elementos React diretamente (nunca dangerouslySetInnerHTML), então texto
 * livre nunca vira HTML — seguro mesmo sem sanitização extra.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] && match[2]) {
      nodes.push(
        <a
          key={`${keyPrefix}-${i}`}
          href={match[2]}
          target="_blank"
          rel="sponsored noopener"
          className="font-medium text-primary underline underline-offset-2"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      nodes.push(<strong key={`${keyPrefix}-${i}`}>{match[3]}</strong>);
    }
    lastIndex = pattern.lastIndex;
    i += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderPostBody(body: string) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const headingMatch = /^(#{2,3})\s+(.*)$/.exec(trimmed);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const content = renderInline(headingMatch[2], `h-${blockIndex}`);
          return level === 2 ? (
            <h2 key={blockIndex} className="mt-8 text-xl font-semibold tracking-tight">
              {content}
            </h2>
          ) : (
            <h3 key={blockIndex} className="mt-6 text-lg font-semibold tracking-tight">
              {content}
            </h3>
          );
        }

        const lines = trimmed.split("\n");
        return (
          <p key={blockIndex} className="mt-4 leading-7">
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line, `p-${blockIndex}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
