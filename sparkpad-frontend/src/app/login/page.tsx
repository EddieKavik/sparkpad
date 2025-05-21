import React from "react";

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#181c2b] via-[#23243a] to-[#2e254d] text-white">
            <div className="bg-[#23243a] p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-bold mb-6 text-center">Login to Sparkpad</h1>
                <form className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="px-4 py-3 rounded-lg bg-[#181c2b] border border-blue-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-white"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="px-4 py-3 rounded-lg bg-[#181c2b] border border-blue-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-white"
                    />
                    <button
                        type="submit"
                        className="mt-4 px-6 py-3 rounded-lg bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 text-white font-bold text-lg shadow-lg hover:scale-105 transition-all duration-300"
                    >
                        Login
                    </button>
                </form>
            </div>
        </main>
    );
} 