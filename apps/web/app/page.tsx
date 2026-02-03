import { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  MapPin,
  TrendingUp,
  Bell,
  Shield,
  Star,
  ArrowRight,
  Home,
  Building2,
  LandPlot,
} from 'lucide-react';
import { Button, Card, Badge } from '../src/components';

export const metadata: Metadata = {
  title: 'AUS Property Intelligence - Find Your Perfect Property',
  description:
    'Search Australian properties with AI-powered search, smart alerts, and market insights',
};

const features = [
  {
    icon: Search,
    title: 'Smart Search',
    description:
      'Find properties by location, price, features, and more with our AI-powered search engine',
    color: 'bg-blue-500',
  },
  {
    icon: TrendingUp,
    title: 'Market Insights',
    description: 'Get real-time market data, price trends, and convenience scores for any area',
    color: 'bg-green-500',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description:
      'Never miss a opportunity with customizable alerts for price drops and new listings',
    color: 'bg-purple-500',
  },
  {
    icon: Shield,
    title: 'Verified Data',
    description: 'All property data is verified and updated in real-time from trusted sources',
    color: 'bg-orange-500',
  },
];

const propertyTypes = [
  { icon: Home, label: 'Houses', count: '12,453', color: 'from-blue-500 to-blue-700' },
  { icon: Building2, label: 'Apartments', count: '8,234', color: 'from-purple-500 to-purple-700' },
  { icon: LandPlot, label: 'Land', count: '3,891', color: 'from-green-500 to-green-700' },
];

const stats = [
  { value: '50K+', label: 'Properties Listed' },
  { value: '25K+', label: 'Happy Users' },
  { value: '98%', label: 'Accuracy Rate' },
  { value: '24/7', label: 'Support' },
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'First-time Buyer',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    content:
      'AUS Property Intelligence made finding my first home so much easier. The convenience scores helped me choose the perfect neighborhood!',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Property Investor',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    content:
      'The market insights and price alerts have been invaluable for my investment strategy. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Emily Davis',
    role: 'Real Estate Agent',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    content:
      'I recommend this platform to all my clients. The data quality and search capabilities are outstanding.',
    rating: 5,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="200" height="200" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-40">
          <div className="text-center max-w-4xl mx-auto animate-slide-up">
            <Badge variant="info" className="mb-8 px-4 py-2">
              #1 Property Search Platform in Australia
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              Find Your Perfect
              <span className="block text-yellow-300">Australian Property</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Discover properties with AI-powered search, real-time market insights, and smart
              alerts tailored to your needs.
            </p>

            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by suburb, postcode, or address..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                  />
                </div>
                <Link href="/search">
                  <Button size="lg" className="w-full md:w-auto px-10">
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-3 mt-5 justify-center items-center">
                <span className="text-sm text-gray-500">Popular:</span>
                <Link
                  href="/search?q=Sydney"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1"
                >
                  Sydney
                </Link>
                <Link
                  href="/search?q=Melbourne"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1"
                >
                  Melbourne
                </Link>
                <Link
                  href="/search?q=Brisbane"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1"
                >
                  Brisbane
                </Link>
                <Link
                  href="/search?q=Perth"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1"
                >
                  Perth
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-3">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Why Choose AUS Property?</h2>
            <p className="section-subtitle mx-auto">
              Everything you need to find, analyze, and track your perfect property investment
            </p>
          </div>

          <div className="flex justify-center">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
              {features.map((feature, index) => (
                <Card key={index} hover className="text-center group p-8">
                  <div
                    className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Browse by Property Type</h2>
            <p className="section-subtitle mx-auto">
              Explore different types of properties available across Australia
            </p>
          </div>

          <div className="flex justify-center">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl">
              {propertyTypes.map((type, index) => (
                <Link key={index} href={`/search?type=${type.label.toLowerCase()}`}>
                  <Card hover className="text-center py-10 px-8 group cursor-pointer h-full">
                    <div
                      className={`w-20 h-20 bg-gradient-to-br ${type.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
                    >
                      <type.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{type.label}</h3>
                    <p className="text-3xl font-bold text-primary-600 mb-2">{type.count}</p>
                    <p className="text-gray-500">properties available</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Find Your Dream Property?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of happy users who found their perfect property with AUS Property
            Intelligence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/search">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                Start Searching
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary-600 hover:bg-gray-100 px-8"
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">What Our Users Say</h2>
            <p className="section-subtitle mx-auto">
              Join thousands of satisfied users who found their perfect property
            </p>
          </div>

          <div className="flex justify-center">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl">
              {testimonials.map((testimonial, index) => (
                <Card key={index} padding="lg" className="h-full flex flex-col">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic leading-relaxed flex-grow">
                    &quot;{testimonial.content}&quot;
                  </p>
                  <div className="flex items-center mt-auto pt-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-3xl p-8 md:p-16 relative overflow-hidden max-w-4xl w-full">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                  Get Smart Alerts for Your Dream Property
                </h2>
                <p className="text-xl text-primary-100 mb-8 leading-relaxed">
                  Create custom alerts and get notified instantly when properties matching your
                  criteria are listed or when prices drop.
                </p>
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100 px-8">
                    Create Free Alert
                    <Bell className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
