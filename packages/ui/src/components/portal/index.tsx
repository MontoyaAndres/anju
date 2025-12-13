import { useRef, useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface IProps {
  children: ReactNode;
  selector?: string;
}

declare const document: any;

export const Portal = (props: IProps) => {
  const { children, selector = '#modal' } = props;
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ref.current = document.querySelector(selector);
    setMounted(true);
  }, [selector]);

  return mounted && ref.current
    ? createPortal(<>{children}</>, ref.current)
    : null;
};
