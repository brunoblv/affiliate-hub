"use client";

import type { ForwardedRef } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertImage,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  addExportVisitor$,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  realmPlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { $isLineBreakNode } from "lexical";
import { enviarArquivoDeMidia } from "@/lib/midia/enviar-cliente";

async function enviarImagem(arquivo: File): Promise<string> {
  const midia = await enviarArquivoDeMidia(arquivo);
  return midia.url;
}

/**
 * O core do MDXEditor exporta uma quebra de linha suave (Shift+Enter) como um
 * nó de texto mdast cru com "\n" dentro, em vez do nó padrão `break` do
 * CommonMark (que vira "  \n" ao serializar) — bug conhecido da lib, presente
 * até a versão mais recente (4.2.3) na data em que isso foi escrito. Isso é
 * frágil: ao reabrir o post pra editar, o "\n" cru vira texto comum dentro de
 * um único span (sem nó de quebra de linha real), então navegação por
 * teclado/seleção nesse trecho fica incorreta, e qualquer parser markdown
 * padrão (sem plugin de "breaks") colapsaria a quebra numa junção de texto.
 * Este plugin registra um visitor de exportação com prioridade maior que o do
 * core pra emitir o nó `break` de verdade, que o próprio core já sabe
 * reimportar corretamente (ver MdastBreakVisitor) — corrige o problema na
 * origem sem precisar mexer no render público (que já lida bem com "break").
 */
const quebraDeLinhaPadraoPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addExportVisitor$]: {
        priority: 1,
        testLexicalNode: $isLineBreakNode,
        visitLexicalNode: ({ mdastParent, actions }: { mdastParent: unknown; actions: { appendToParent: (parent: unknown, node: unknown) => void } }) => {
          actions.appendToParent(mdastParent, { type: "break" });
        },
      },
    });
  },
});

export default function EditorDoCorpo({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      {...props}
      ref={editorRef}
      className="mdxeditor-cms w-full rounded-lg border border-border bg-card [&_.mdxeditor-toolbar]:sticky [&_.mdxeditor-toolbar]:top-0 [&_.mdxeditor-toolbar]:z-10 [&_.mdxeditor-toolbar]:rounded-t-lg [&_.mdxeditor-toolbar]:border-border [&_.mdxeditor-toolbar]:bg-card"
      contentEditableClassName="min-h-[28rem] px-4 py-3 text-[15px] leading-relaxed text-foreground [&_p]:mb-3 [&_p:last-child]:mb-0"
      placeholder="Escreva o post. Arraste uma imagem para enviá-la ao servidor."
      plugins={[
        quebraDeLinhaPadraoPlugin(),
        headingsPlugin({ allowedHeadingLevels: [2, 3, 4] }),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        markdownShortcutPlugin(),
        diffSourcePlugin({ viewMode: "rich-text" }),
        imagePlugin({
          imageUploadHandler: enviarImagem,
          disableImageResize: true,
        }),
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle options={["bullet", "number"]} />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertThematicBreak />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
  );
}
