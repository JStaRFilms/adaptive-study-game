import React from 'react';
import { markdownToHtml } from '../../utils/textUtils';

interface MarkdownProps {
  content: string;
  as?: React.ElementType;
  className?: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content, as: Component = 'div', className = '' }) => {
  if (!content) return null;

  const htmlContent = markdownToHtml(content);

  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  );
};

export default Markdown;
