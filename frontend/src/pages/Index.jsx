import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Upload, Trash2, HardDrive, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">
              FileHub
            </span>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center pt-10 pb-6">
        <div className="animate-slide-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 vault-glow-strong">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold leading-none text-foreground sm:text-4xl">
            Your Files, <span className="text-primary">Safely Stored</span>
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload, manage, and access your documents securely from anywhere.
            Built with encryption and privacy in mind.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              asChild
              className="transition-all duration-200 active:bg-white active:text-primary"
            >
              <Link to="/register">Create Account</Link>
            </Button>
            <Button
              variant="secondary"
              asChild
              className="transition-all duration-200 active:bg-white active:text-primary"
            >
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12" />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-none px-4 md:px-6 pt-5 pb-10">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <Upload className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="font-display font-semibold text-foreground">
                Upload
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag & drop or browse to upload files. Max file size is{" "}
                <strong>500 MB</strong> per file. Supported formats include
                images, video, audio, documents, and more.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <HardDrive className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="font-display font-semibold text-foreground">
                Storage
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Each file can be up to <strong>500 MB</strong>. Your files are
                stored securely with encrypted access tied to your account.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <Download className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="font-display font-semibold text-foreground">
                View & Download
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Preview your files directly in the browser or download them
                anytime from your dashboard.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <Trash2 className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="font-display font-semibold text-foreground">
                Delete
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Remove files permanently with a single click. Deleted files are
                immediately removed from storage.
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FileHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
