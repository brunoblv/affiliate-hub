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
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { enviarArquivoDeMidia } from "@/lib/midia/enviar-cliente";

async function enviarImagem(arquivo: File): Promise<string> {
  const midia = await enviarArquivoDeMidia(arquivo);
  return midia.url;
}

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
