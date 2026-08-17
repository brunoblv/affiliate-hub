"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

const Editor = dynamic(() => import("./editor-do-corpo"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[28rem] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
      Carregando editor...
    </div>
  ),
});

export const EditorDoCorpo = forwardRef<MDXEditorMethods, MDXEditorProps>((props, ref) => (
  <Editor {...props} editorRef={ref} />
));

EditorDoCorpo.displayName = "EditorDoCorpo";
