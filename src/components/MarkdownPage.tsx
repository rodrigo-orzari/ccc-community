import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface MarkdownPageProps {
  title: string;
  content: string;
}

// Slugify heading text into a stable URL anchor (e.g. "Privacy Policy" → "privacy-policy").
// Used so the markdown TOC links can scroll to each heading.
const headingToId = (children: any): string => {
  const collect = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(collect).join('');
    if (node?.props?.children) return collect(node.props.children);
    return '';
  };
  return collect(children).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
};

const MarkdownPage: React.FC<MarkdownPageProps> = ({ title, content }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-12"
    >
      <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" />
        Compare Cloud Costs
      </Link>

      <h1 className="text-4xl font-bold mb-8 text-black dark:text-white tracking-tight">{title}</h1>

      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-headings:scroll-mt-8 prose-a:text-[#0069FF] hover:prose-a:underline">
        <div className="markdown-body">
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 id={headingToId(children)}>{children}</h2>,
              h3: ({ children }) => <h3 id={headingToId(children)}>{children}</h3>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};

export default MarkdownPage;
