"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <Header isAuthenticated={isAuthenticated} />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
          <LeftSection />
          <RightSection isAuthenticated={isAuthenticated} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const { signOut } = useAuthActions();

  return (
    <header className="p-6 border-b border-foreground/20">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">[ X ]</h1>
        {isAuthenticated && (
          <div className="flex gap-4 items-center">
            <Link
              href="/feed"
              className="text-sm hover:text-foreground/80 transition-colors"
            >
              GO TO FEED →
            </Link>
            <button
              onClick={() => void signOut()}
              className="text-sm hover:text-foreground/80 transition-colors"
            >
              [ SIGN OUT ]
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function LeftSection() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          HAPPENING NOW
        </h2>
        <p className="text-xl text-foreground/80">
          Join today.
        </p>
      </div>

      <div className="space-y-6">
        <Feature text="Follow your interests" />
        <Feature text="Hear what people are talking about" />
        <Feature text="Join the conversation" />
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-foreground/60">&gt;</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function RightSection({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [isSignUp, setIsSignUp] = useState(false);

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="border border-foreground p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold">
              WELCOME BACK
            </h3>
            <p className="text-sm text-foreground/60">
              You&apos;re already signed in
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/feed"
              className="block w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold text-center"
            >
              [ GO TO YOUR FEED ]
            </Link>

            <Link
              href="/profile"
              className="block w-full px-4 py-3 border border-foreground hover:bg-foreground hover:text-background transition-colors text-sm font-bold text-center"
            >
              [ VIEW PROFILE ]
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="border border-foreground p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold">
            {isSignUp ? "CREATE YOUR ACCOUNT" : "SIGN IN TO X"}
          </h3>
          <p className="text-xs text-foreground/60">
            {isSignUp
              ? "It&apos;s free and only takes a minute"
              : "Stay updated on what&apos;s happening"}
          </p>
        </div>

        {isSignUp ? <SignUpForm /> : <SignInForm />}

        <div className="pt-4 border-t border-foreground/20">
          <p className="text-xs text-center">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 underline hover:no-underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-foreground/20" />
          <span className="text-xs text-foreground/60">OR</span>
          <div className="flex-1 h-px bg-foreground/20" />
        </div>

        <Link
          href="/signin"
          className="block w-full border border-foreground/40 px-4 py-3 text-sm hover:bg-foreground hover:text-background transition-colors"
        >
          [ CONTINUE WITH CONVEX AUTH ]
        </Link>
      </div>
    </div>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn("password", { email, password });
      router.push("/feed");
    } catch (error) {
      console.error("Sign in failed:", error);
      // Handle error - you might want to show an error message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-xs uppercase tracking-wider">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          placeholder="user@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-xs uppercase tracking-wider">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          placeholder="••••••••"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold disabled:opacity-50"
      >
        {isLoading ? "[ SIGNING IN... ]" : "[ SIGN IN ]"}
      </button>
    </form>
  );
}

function SignUpForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Note: You'll need to implement proper sign-up logic in your Convex backend
      // This is a simplified example
      await signIn("password", { email, password, name, flow: "signUp" });
      router.push("/feed");
    } catch (error) {
      console.error("Sign up failed:", error);
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-xs uppercase tracking-wider">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          placeholder="John Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-xs uppercase tracking-wider">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          placeholder="user@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-xs uppercase tracking-wider">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-transparent border border-foreground/40 focus:border-foreground outline-none text-sm"
          placeholder="••••••••"
          required
          minLength={8}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold disabled:opacity-50"
      >
        {isLoading ? "[ CREATING ACCOUNT... ]" : "[ SIGN UP ]"}
      </button>
    </form>
  );
}

function Footer() {
  const links = [
    "About", "Help Center", "Terms", "Privacy Policy",
    "Cookie Policy", "Accessibility", "Ads Info", "Blog",
    "Status", "Careers", "Brand Resources", "Advertising"
  ];

  return (
    <footer className="p-6 border-t border-foreground/20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-4 text-xs text-foreground/60">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-foreground/40">
          © 2024 X Corp.
        </p>
      </div>
    </footer>
  );
}