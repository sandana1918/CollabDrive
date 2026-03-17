export const Spinner = ({ label = "Loading..." }) => (
  <div className="flex items-center gap-3 text-sm text-slate-500">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    <span>{label}</span>
  </div>
);
