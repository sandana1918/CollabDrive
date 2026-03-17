import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ emailOrUsername: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data);
      toast.success("Welcome back.");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-drive-bg p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1500px] overflow-hidden rounded-[36px] bg-white/82 shadow-shell backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-[#e5ebf5] bg-[radial-gradient(circle_at_top_left,_rgba(194,231,255,0.9),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-12 w-12 rounded-2xl" />
            <div>
              <p className="text-3xl font-medium tracking-tight text-drive-text">CollabDrive</p>
              <p className="text-sm text-drive-subtext">Cloud collaboration with Drive familiarity</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#174ea6]">Drive aesthetic</p>
            <h1 className="mt-6 text-6xl font-medium leading-[1.02] tracking-tight text-drive-text">A workspace that feels like Google Drive, refined with softer Apple-like depth.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-drive-subtext">
              Store files, share with roles, and collaborate on documents in real time without leaving a familiar, productivity-first shell.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-4">
            {[
              ["Realtime", "Socket collaboration"],
              ["Secure", "JWT + bcrypt auth"],
              ["Cloud-ready", "S3-friendly storage"]
            ].map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-soft">
                <p className="text-sm font-medium text-drive-text">{title}</p>
                <p className="mt-2 text-sm leading-6 text-drive-subtext">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-11 w-11 rounded-2xl" />
              <p className="text-3xl font-medium tracking-tight text-drive-text">CollabDrive</p>
            </div>
            <p className="text-sm font-medium text-[#174ea6]">Sign in</p>
            <h2 className="mt-3 text-5xl font-medium tracking-tight text-drive-text">Welcome back</h2>
            <p className="mt-3 text-[15px] leading-7 text-drive-subtext">Use your email or username to return to your Drive-like workspace.</p>

            <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
              <Input label="Email or username" value={form.emailOrUsername} onChange={(event) => setForm({ ...form, emailOrUsername: event.target.value })} />
              <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <Button type="submit" className="w-full py-3" loading={loading}>Sign in</Button>
            </form>

            <p className="mt-8 text-sm text-drive-subtext">
              New here? <Link className="font-medium text-drive-blue" to="/register">Create an account</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
