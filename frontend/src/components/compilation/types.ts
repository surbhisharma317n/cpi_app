export interface Tab {
  id: string;
  label: string;
  value: string;
}

export interface CompilationProgramProps {
  activeProgram: string;
  activeComprehensiveTab: string;
  activeAllIndiaTab: string;
  activeInflationTab: string;
  isLoading: boolean;
}