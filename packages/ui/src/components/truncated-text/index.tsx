import { ReactNode, useEffect, useRef, useState } from 'react';
import Tooltip, { TooltipProps } from '@mui/material/Tooltip';
import { utils } from '@anju/utils';

export interface IProps {
  text: string;
  className?: string;
  thresholdPx?: number;
  tooltip?: ReactNode;
  placement?: TooltipProps['placement'];
  enterDelay?: number;
  arrow?: boolean;
}

export const TruncatedText = (props: IProps) => {
  const {
    text,
    className,
    thresholdPx = utils.constants.RESOURCE_TYPE_TOOLTIP_MIN_WIDTH,
    tooltip,
    placement = 'top',
    enterDelay = 300,
    arrow = true
  } = props;

  const ref = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setOverflowing(
        el.scrollWidth >= thresholdPx || el.scrollWidth > el.clientWidth
      );
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, thresholdPx]);

  return (
    <Tooltip
      title={tooltip ?? text}
      arrow={arrow}
      placement={placement}
      enterDelay={enterDelay}
      disableHoverListener={!overflowing}
      disableFocusListener={!overflowing}
      disableTouchListener={!overflowing}
    >
      <span ref={ref} className={className}>
        {text}
      </span>
    </Tooltip>
  );
};
