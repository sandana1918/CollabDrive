import clsx from "clsx";

export const Button = ({ className, variant = "primary", loading = false, children, ...props }) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition duration-200",
        variant === "primary" && "bg-drive-blue text-white hover:bg-[#1558b0]",
        variant === "secondary" && "bg-drive-blueSoft text-[#174ea6] hover:bg-[#dbe7ff]",
        variant === "surface" && "border border-drive-line bg-white text-drive-text hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-drive-subtext hover:bg-slate-100",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-600",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
};
