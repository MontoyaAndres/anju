Create a new web component following the established project conventions.

## Input
$ARGUMENTS

## Project Architecture

This is a monorepo (npm workspaces + Turbo) with three key packages:

- `packages/ui/` — Reusable UI components wrapping Material UI with Emotion styling
- `packages/utils/` — Shared utilities (Zod schemas, fetcher, constants)
- `apps/web/` — Next.js app consuming both packages

## Styling System

**Emotion CSS-in-JS** (NOT Tailwind). Every styled component uses `@emotion/styled` + `@emotion/react`.

Theme tokens available via `({ theme }) => css`:
- **Colors**: `theme.colors.transparent`, `.black`, `.bastille` (#1C1825), `.white`, `.red`, `.alto`, `.fernGreen`, `.saltBox`
- **Fonts**: `theme.fonts.xs` (12px) through `theme.fonts['9xl']` (100px)
- **Shadows**: `theme['custom-shadows'].smallest`, `.small`
- **Breakpoints**: `theme.screens.sm` (640px), `.md` (768px), `.lg` (1024px), `.xl` (1280px), `.['2xl']` (1536px)
- **Font family**: Fustat (set globally)

Responsive design is **mobile-first**: base styles for mobile, `@media (min-width: ${theme.screens.md})` for larger screens.

## File Structure Conventions

### For `packages/ui` components (reusable across apps):

```
packages/ui/src/components/<component-name>/
  index.tsx    — Component logic, wraps Material UI, uses Wrapper from styles
  styles.tsx   — Emotion styled components with theme access
```

**styles.tsx pattern:**
```tsx
import { css } from '@emotion/react';
import styled from '@emotion/styled';

interface IProps {
  // Component-specific style props
}

export const Wrapper = styled.div<IProps>`
  ${({ theme }) => css`
    // Styles using theme tokens
  `}
`;
```

**index.tsx pattern:**
```tsx
import { ReactNode } from 'react';
import { Wrapper } from './styles';

export interface IProps {
  children: ReactNode;
}

export const ComponentName = (props: IProps) => {
  const { children, ...rest } = props;
  return <Wrapper>{children}</Wrapper>;
};
```

After creating, register in `packages/ui/src/components/index.tsx`:
```tsx
import { ComponentName } from './component-name';
// Add to the UI namespace object:
export const UI = { ..., ComponentName };
```

Consumed as: `UI.ComponentName`

### For `apps/web` components (app-specific views and layouts):

**Views** (`apps/web/src/components/views/<name>/`):
```
index.tsx    — Standard React component with state, validation, API calls
styles.tsx   — Emotion styled components
```

**Layouts** (`apps/web/src/components/layouts/<name>/`):
```
index.tsx    — HOC function: (page: ReactElement) => JSX wrapping page content
styles.tsx   — Emotion styled components
```

After creating, register in the appropriate barrel file:
- Views: `apps/web/src/components/views/index.tsx` → add to Views object
- Layouts: `apps/web/src/components/layouts/index.tsx` → add to Layouts object

Consumed as: `Components.Views.Name` or `Components.Layouts.Name`

## Export Pattern

All exports use **namespace objects**, never individual named exports at the barrel level:
- `packages/ui`: `export const UI = { Button, Input, Portal, ... }`
- `packages/utils`: `export const utils = { Schema, fetcher, constants, ... }`
- `apps/web`: `export const Components = { Views: { ... }, Layouts: { ... } }`

## Validation & API Pattern

- Zod schemas defined in `packages/utils/src/schema.ts`, exported via `utils.Schema.SCHEMA_NAME`
- API calls use `utils.fetcher({ url, config })` with `credentials: 'include'`
- Form validation: `utils.Schema.SCHEMA_NAME.parseAsync(values)` with try/catch for ZodError

## Instructions

1. Read the existing components in the target location to confirm current patterns before creating files
2. Follow the exact file structure (`index.tsx` + `styles.tsx`)
3. Use Emotion styled components — never inline styles or Tailwind
4. Access theme via destructured props in styled components
5. Register new components in the appropriate barrel/namespace export file
6. If the component needs validation, add schemas to `packages/utils/src/schema.ts`
7. Use `UI.*` components from `@anju/ui` in web app components
8. Use Material UI icons directly from `@mui/icons-material` when needed
