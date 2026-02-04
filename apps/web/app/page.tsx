import { Metadata } from 'next';
import Link from 'next/link';
import { Search, TrendingUp, Bell, Shield, Star, Home, Building2, LandPlot } from 'lucide-react';
import { Button, Card, Badge, HeroSearch, CTASection } from '../src/components';

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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-32 lg:py-40">
          <div className="text-center max-w-4xl mx-auto animate-slide-up">
            <Badge variant="info" className="mb-6 sm:mb-8 px-4 py-2 text-sm">
              #1 Property Search Platform in Australia
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 sm:mb-8 leading-tight tracking-tight">
              Find Your Perfect
              <span className="block text-yellow-300 mt-2">Australian Property</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-primary-100 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Discover properties with AI-powered search, real-time market insights, and smart
              alerts tailored to your needs.
            </p>

            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg hover:border-primary-100 transition-all duration-300"
              >
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-600 mb-2 sm:mb-3">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="section-title">Why Choose AUS Property?</h2>
            <p className="section-subtitle mx-auto">
              Everything you need to find, analyze, and track your perfect property investment
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {features.map((feature, index) => (
              <Card key={index} hover className="text-center group p-6 sm:p-8 h-full">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}
                >
                  <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Property Types Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="section-title">Browse by Property Type</h2>
            <p className="section-subtitle mx-auto">
              Explore different types of properties available across Australia
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {propertyTypes.map((type, index) => (
              <Link key={index} href={`/search?type=${type.label.toLowerCase()}`}>
                <Card hover className="text-center py-8 sm:py-10 px-6 sm:px-8 group cursor-pointer h-full">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${type.color} rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl transition-all duration-300`}
                  >
                    <type.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{type.label}</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-primary-600 mb-1 sm:mb-2">{type.count}</p>
                  <p className="text-sm sm:text-base text-gray-500">properties available</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTASection secondaryButtonText="Create Free Account" secondaryButtonHref="/auth/signup" />

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="section-title">What Our Users Say</h2>
            <p className="section-subtitle mx-auto">
              Join thousands of satisfied users who found their perfect property
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} padding="lg" className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 italic leading-relaxed flex-grow">
                  &quot;{testimonial.content}&quot;
                </p>
                <div className="flex items-center mt-auto pt-3 sm:pt-4 border-t border-gray-100">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover mr-3 sm:mr-4 ring-2 ring-primary-100"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{testimonial.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Alerts CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-16 relative overflow-hidden max-w-4xl mx-auto">
            <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white leading-tight">
                Get Smart Alerts for Your Dream Property
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-primary-100 mb-6 sm:mb-8 leading-relaxed">
                Create custom alerts and get notified instantly when properties matching your
                criteria are listed or when prices drop.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100 px-6 sm:px-8 w-full sm:w-auto">
                  Create Free Alert
                  <Bell className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
