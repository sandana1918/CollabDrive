import clsx from "clsx";

export const Button = ({ className, variant = "primary", loading = false, children, ...props }) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition duration-200",
        variant === "primary" && "bg-drive-blue text-white hover:bg-[#7a183f]",
        variant === "secondary" && "bg-drive-blueSoft text-[#7a183f] hover:bg-[#efc1d0]",
        variant === "surface" && "border border-drive-line bg-white text-drive-text hover:bg-[#fbf6f9]",
        variant === "ghost" && "bg-transparent text-drive-subtext hover:bg-[#f6edf2]",
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
