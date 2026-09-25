"use client";

import { use } from "react";
import Link from "next/link";
import {
  getChapter,
  getNavigation,
  MANUAL_CONTENT,
} from "@/lib/manualContent";
import ManualScreenshot from "@/components/ManualScreenshot";

// Simple markdown-ish renderer
function renderContent(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="text-xl font-bold text-white mt-6 mb-3"
        >
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="text-lg font-semibold text-blue-300 mt-5 mb-2"
        >
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={key++}
          className="border-l-2 border-blue-600 pl-4 my-3 italic text-blue-200/90"
        >
          {trimmed.slice(2)}
        </blockquote>
      );
    } else if (trimmed.startsWith("---")) {
      elements.push(
        <hr key={key++} className="my-6 border-gray-800" />
      );
    } else if (trimmed.startsWith("- ")) {
      elements.push(
        <li key={key++} className="ml-4 text-gray-300 my-1">
          {trimmed.slice(2)}
        </li>
      );
    } else if (trimmed === "") {
      // skip
    } else {
      // inline bold rendering
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} className="text-gray-200 my-2 leading-relaxed">
          {parts.map((p, i) => {
            if (p.startsWith("**") && p.endsWith("**")) {
              return (
                <strong key={i} className="text-white font-semibold">
                  {p.slice(2, -2)}
                </strong>
              );
            }
            return p;
          })}
        </p>
      );
    }
  }

  return elements;
}

export default function ChapterPage({ params }) {
  const resolvedParams = use(params);
  const key = resolvedParams.chapter;

  const chapter = getChapter(key);
  const nav = getNavigation(key);

  if (!chapter) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <Link href="/manual" className="text-blue-400 text-sm">
            ← Back to Manual
          </Link>
          <div className="mt-4 p-6 rounded-lg bg-red-900/40 border border-red-700">
            Chapter not found.
          </div>
        </div>
      </main>
    );
  }

  const hasContent = chapter.content && chapter.content.trim().length > 0;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/manual"
            className="text-blue-400 text-sm hover:underline"
          >
            ← Back to Manual
          </Link>
          <p className="text-xs text-gray-500 mt-2">
            Part {chapter.partNumber} — {chapter.partTitle}
          </p>
          <h1 className="text-2xl font-bold mt-1">
            Chapter {chapter.number} — {chapter.title}
          </h1>
        </div>

        {hasContent ? (
          <article className="space-y-2">
            {renderContent(chapter.content)}
          </article>
        ) : (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400">
              📝 Content coming soon.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This chapter will be filled in during the next manual-building
              stage.
            </p>
          </div>
        )}

        {/* Screenshots for this chapter */}
        <ManualScreenshot chapterKey={chapter.key} />

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-2 mt-8 pt-6 border-t border-gray-800">
          {nav.prev ? (
            <Link
              href={`/manual/${nav.prev.key}`}
              className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 text-xs text-left"
            >
              <p className="text-gray-500 mb-1">← Previous</p>
              <p className="text-gray-200">
                Ch {nav.prev.number}. {nav.prev.title}
              </p>
            </Link>
          ) : (
            <div />
          )}

          {nav.next ? (
            <Link
              href={`/manual/${nav.next.key}`}
              className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 text-xs text-right"
            >
              <p className="text-gray-500 mb-1">Next →</p>
              <p className="text-gray-200">
                Ch {nav.next.number}. {nav.next.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/manual"
            className="text-xs text-blue-400 hover:underline"
          >
            View all chapters →
          </Link>
        </div>
      </div>
    </main>
  );
}