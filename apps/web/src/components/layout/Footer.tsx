import React from 'react';
import Link from 'next/link';
import { Home, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  const footerLinks = {
    product: [
      { label: 'Search Properties', href: '/search' },
      { label: 'Smart Alerts', href: '#' },
      { label: 'Market Insights', href: '#' },
      { label: 'Convenience Scores', href: '#' },
    ],
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press', href: '#' },
      { label: 'Blog', href: '#' },
    ],
    support: [
      { label: 'Help Center', href: '#' },
      { label: 'Contact Us', href: '#' },
      { label: 'FAQs', href: '#' },
      { label: 'Documentation', href: '#' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  };
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6">
          {/* Brand Section */}
          <div className="sm:col-span-2">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AUS Property</span>
            </Link>
            <p className="text-gray-400 mb-4 max-w-xs text-sm sm:text-base">
              Your trusted partner for finding the perfect property in Australia.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="p-2 bg-gray-800 rounded-lg hover:bg-primary-600 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Sections */}
          {['Product', 'Company', 'Support'].map((title) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm uppercase tracking-wider">{title}</h4>
              <ul className="space-y-2">
                {footerLinks[title.toLowerCase() as keyof typeof footerLinks].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Section */}
          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Sydney, Australia</span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <a
                  href="mailto:hello@ausproperty.com"
                  className="text-sm hover:text-white transition-colors break-all"
                >
                  hello@ausproperty.com
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">+61 2 1234 5678</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-10 sm:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-2 justify-center sm:justify-between items-center">
            <p className="text-gray-400 text-xs sm:text-sm order-2 sm:order-1 text-center sm:text-left">
              &copy; {new Date().getFullYear()} AUS Property Intelligence. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 justify-center text-xs sm:text-sm order-1 sm:order-2">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
