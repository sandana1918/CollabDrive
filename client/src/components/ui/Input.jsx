import clsx from "clsx";

export const Input = ({ className, label, ...props }) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-drive-text">
    {label ? <span>{label}</span> : null}
    <input
      className={clsx(
        "rounded-2xl border border-drive-line bg-white px-4 py-3 text-sm text-drive-text outline-none transition placeholder:text-slate-400 focus:border-drive-blue focus:ring-4 focus:ring-[#d7e5ff]",
        className
      )}
      {...props}
    />
  </label>
);
