import MaterialTextField, { TextFieldProps } from '@mui/material/TextField';
import { Wrapper } from './styles';

export const Input = (props: TextFieldProps) => {
  const { ...rest } = props;

  return (
    <Wrapper>
      <MaterialTextField {...rest} fullWidth />
    </Wrapper>
  );
};
