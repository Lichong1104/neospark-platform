import React, { useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 编写规范内容块（与 i18n JSON 中的结构对应） */
type GuideBlock =
  | { type: "p"; text: string }
  | { type: "code"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] };

interface GuideSection {
  title: string;
  blocks: GuideBlock[];
}

const CodeBlock: React.FC<{ text: string }> = ({ text }) => (
  <pre className="overflow-x-auto bg-foreground text-background p-3 text-[11px] leading-relaxed font-mono whitespace-pre">
    {text}
  </pre>
);

const Block: React.FC<{ block: GuideBlock }> = ({ block }) => {
  if (block.type === "p") {
    return <p className="text-xs leading-relaxed text-foreground/80">{block.text}</p>;
  }
  if (block.type === "code") {
    return <CodeBlock text={block.text} />;
  }
  if (block.type === "list") {
    return (
      <ol className="space-y-1.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/80">
            <span className="shrink-0 font-mono font-bold text-accent-pink">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  }
  // table
  return (
    <div className="overflow-x-auto border-brutal border-foreground">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="bg-foreground text-background text-left">
            {block.columns.map((col) => (
              <th key={col} className="px-2 py-1.5 font-bold uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-secondary/50" : "bg-background"}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? "px-2 py-1.5 font-bold text-accent-pink whitespace-nowrap align-top"
                      : "px-2 py-1.5 text-foreground/80 align-top"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface SkillAuthoringGuideProps {
  trigger?: React.ReactNode;
}

/** Skill 编写规范弹窗：面向用户展示 Skill 格式、脚本契约与审核标准 */
const SkillAuthoringGuide: React.FC<SkillAuthoringGuideProps> = ({ trigger }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const sections = t("skill.guide.sections", { returnObjects: true }) as unknown as GuideSection[];

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="h-9 px-3 flex items-center gap-2 border-brutal border-foreground bg-card text-foreground text-xs font-bold uppercase hover:bg-secondary transition-none"
        >
          <BookOpen className="w-4 h-4" />
          {t("skill.guide.button")}
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl border-brutal border-foreground p-0 gap-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="px-5 py-4 border-b-brutal border-foreground shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent-pink" />
                {t("skill.guide.title")}
              </DialogTitle>
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden p-1 hover:bg-secondary"
                aria-label="close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground normal-case tracking-normal">
              {t("skill.guide.updated")}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto px-5 py-4 space-y-6">
            {sections.map((section, i) => (
              <section key={i}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-accent-pink text-foreground border-brutal border-foreground text-[10px] font-mono">
                    {i + 1}
                  </span>
                  {section.title}
                </h4>
                <div className="space-y-2.5 pl-7">
                  {section.blocks.map((block, j) => (
                    <Block key={j} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SkillAuthoringGuide;
