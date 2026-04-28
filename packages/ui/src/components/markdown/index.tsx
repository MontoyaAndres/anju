import { renderMarkdown } from './render';
import { Wrapper } from './styles';

export interface IProps {
  content: string;
  className?: string;
}

export const Markdown = ({ content, className }: IProps) => {
  return (
    <Wrapper
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};
