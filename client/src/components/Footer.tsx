import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-gray-600 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          &copy; {new Date().getFullYear()} The Digital Ledger. All rights
          reserved.
        </p>
        <nav aria-label="Publication information">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link
                href="/about"
                className="transition-colors hover:text-primary hover:underline dark:hover:text-ai-teal"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/editorial-policy"
                className="transition-colors hover:text-primary hover:underline dark:hover:text-ai-teal"
              >
                Editorial Policy
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}