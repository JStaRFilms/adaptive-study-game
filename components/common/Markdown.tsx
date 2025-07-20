
import React from 'react';
import { markdownToHtml } from '../../utils/textUtils';
import { WebSource } from '../../types';

interface MarkdownProps {
  content: string;
  as?: React.ElementType;
  className?: string;
  webSources?: WebSource[];
}

const Markdown: React.FC<MarkdownProps> = ({ content, as: Component = 'div', className = '', webSources }) => {
  if (!content) return null;

  const htmlContent = markdownToHtml(content, webSources);

  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  );
};

export default Markdown;