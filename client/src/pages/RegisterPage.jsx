import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      login(data);
      toast.success("Account created.");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-drive-bg p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1500px] overflow-hidden rounded-[36px] bg-white/82 shadow-shell backdrop-blur-xl lg:grid-cols-[1fr_1fr]">
        <section className="hidden border-r border-[#e5ebf5] bg-[radial-gradient(circle_at_top_left,_rgba(194,231,255,0.9),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-12 w-12 rounded-2xl" />
            <p className="text-3xl font-medium tracking-tight text-drive-text">CollabDrive</p>
          </div>

          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#174ea6]">Get started</p>
            <h1 className="mt-6 text-6xl font-medium leading-[1.02] tracking-tight text-drive-text">Build a workspace that feels instantly familiar.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-drive-subtext">
              CollabDrive combines Google Drive-style navigation with cleaner surfaces, collaborative editing, and cloud-ready backend architecture.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/80 bg-white/72 p-6 shadow-soft">
            <p className="text-sm font-medium text-drive-text">Included in the experience</p>
            <div className="mt-4 grid gap-3 text-sm text-drive-subtext">
              <div>JWT authentication and persisted sessions</div>
              <div>Role-based sharing for files and docs</div>
              <div>Auto-save and live collaborative editing</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-11 w-11 rounded-2xl" />
              <p className="text-3xl font-medium tracking-tight text-drive-text">CollabDrive</p>
            </div>
            <p className="text-sm font-medium text-[#174ea6]">Create account</p>
            <h2 className="mt-3 text-5xl font-medium tracking-tight text-drive-text">Start using CollabDrive</h2>
            <p className="mt-3 text-[15px] leading-7 text-drive-subtext">Create your personal workspace and begin uploading, editing, and sharing.</p>

            <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
              <Input label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <Input label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <Button type="submit" className="w-full py-3" loading={loading}>Create account</Button>
            </form>

            <p className="mt-8 text-sm text-drive-subtext">
              Already have an account? <Link className="font-medium text-drive-blue" to="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
