import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";

/**
 * Custom render function that wraps components with necessary providers
 * Extend this function to add more providers as needed (e.g., AuthContext, ThemeProvider)
 */
interface ProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: ProvidersProps) {
  return <>{children}</>;
}

/**
 * Custom render function with providers
 * Use this instead of @testing-library/react render
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent } from "@testing-library/user-event";

// Override render with custom render
export { customRender as render };
