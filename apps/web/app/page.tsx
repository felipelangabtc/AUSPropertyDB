import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AUS Property Intelligence - Find Your Perfect Property',
  description: 'Search Australian properties with smart alerts and insights',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Australian Property Intelligence
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Find your perfect property with AI-powered search and smart alerts
        </p>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto mb-12">
          <Link href="/search">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <input
                type="text"
                placeholder="Search by suburb, postcode, or address..."
                className="w-full px-4 py-3 border-0 rounded-lg focus:outline-none"
              />
              <button className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">
                Search Properties
              </button>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-4xl mb-2">📍</div>
            <h3 className="font-bold text-lg mb-2">Smart Filtering</h3>
            <p className="text-gray-600">Find properties by price, location, convenience score & more</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-4xl mb-2">🔔</div>
            <h3 className="font-bold text-lg mb-2">Smart Alerts</h3>
            <p className="text-gray-600">Get notified on price drops, new listings & market changes</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-bold text-lg mb-2">Market Insights</h3>
            <p className="text-gray-600">Understand pricing trends and convenience scores for areas</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start searching?</h2>
          <Link href="/search">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
              Explore Properties Now
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}
          height={38}
          priority
        />
        <ol>
          <li>
            Get started by editing <code>apps/web/app/page.tsx</code>
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://vercel.com/new/clone?demo-description=Learn+to+implement+a+monorepo+with+a+two+Next.js+sites+that+has+installed+three+local+packages.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F4K8ZISWAzJ8X1504ca0zmC%2F0b21a1c6246add355e55816278ef54bc%2FBasic.png&demo-title=Monorepo+with+Turborepo&demo-url=https%3A%2F%2Fexamples-basic-web.vercel.sh%2F&from=templates&project-name=Monorepo+with+Turborepo&repository-name=monorepo-turborepo&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fturborepo%2Ftree%2Fmain%2Fexamples%2Fbasic&root-directory=apps%2Fdocs&skippable-integrations=1&teamSlug=vercel&utm_source=create-turbo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className={styles.logo}
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            href="https://turborepo.dev/docs?utm_source"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondary}
          >
            Read our docs
          </a>
        </div>
        <Button appName="web" className={styles.secondary}>
          Open alert
        </Button>
      </main>
      <footer className={styles.footer}>
        <a
          href="https://vercel.com/templates?search=turborepo&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          href="https://turborepo.dev?utm_source=create-turbo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to turborepo.dev →
        </a>
      </footer>
    </div>
  );
}
