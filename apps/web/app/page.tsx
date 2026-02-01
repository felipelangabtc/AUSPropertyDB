import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AUS Property Intelligence - Find Your Perfect Property',
  description: 'Search Australian properties with smart alerts and insights',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <section className="px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Australian Property Intelligence</h1>
        <p className="text-xl text-gray-600 mb-8">
          Find your perfect property with AI-powered search and smart alerts
        </p>

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

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-4xl mb-2">📍</div>
            <h3 className="font-bold text-lg mb-2">Smart Filtering</h3>
            <p className="text-gray-600">
              Find properties by price, location, convenience score & more
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-4xl mb-2">🔔</div>
            <h3 className="font-bold text-lg mb-2">Smart Alerts</h3>
            <p className="text-gray-600">
              Get notified on price drops, new listings & market changes
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-bold text-lg mb-2">Market Insights</h3>
            <p className="text-gray-600">
              Understand pricing trends and convenience scores for areas
            </p>
          </div>
        </div>
      </section>

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
