import MaterialTextField, { TextFieldProps } from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { Wrapper } from './styles';

export interface SelectOption {
  label: string;
  value: string;
}

export interface IProps extends Omit<TextFieldProps, 'select'> {
  options: SelectOption[];
}

export const Select = (props: IProps) => {
  const { options, ...rest } = props;

  return (
    <Wrapper>
      <MaterialTextField {...rest} select fullWidth>
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MaterialTextField>
    </Wrapper>
  );
};
