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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
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
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="animate-slide-up">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 vault-glow-strong">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight text-foreground sm:text-6xl">
            Your Files,
            <br />
            <span className="text-primary">Safely Stored</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Upload, manage, and access your documents securely from anywhere.
            Built with encryption and privacy in mind.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="transition-all duration-200 active:bg-white active:text-primary"
            >
              <Link to="/register">Create Account</Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="transition-all duration-200 active:bg-white active:text-primary"
            >
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>

        <div className="mt-32" />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-12">
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
                <strong>15 MB</strong> per file. Supported formats include
                documents, images, and more.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <HardDrive className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="font-display font-semibold text-foreground">
                Storage
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Each file can be up to <strong>15 MB</strong>. Your files are
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
